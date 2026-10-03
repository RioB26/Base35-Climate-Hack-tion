import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SizeClass } from "../model/size";

type Props = {
  size: SizeClass;
  /** Still accepting waste: shows an open tipping area on top. */
  operating: boolean;
  existingCapture: number;
  targetCapture: number;
};

// Footprint (world units), number of terraces and well slots per size class.
const DIMS: Record<SizeClass, { w: number; d: number; tiers: number; wells: number }> = {
  small: { w: 7, d: 5, tiers: 2, wells: 14 },
  medium: { w: 10, d: 7, tiers: 3, wells: 22 },
  large: { w: 13, d: 9.5, tiers: 4, wells: 32 },
};
const TIER_H = 0.9;
const STEP = 0.24; // each terrace's base is 24% narrower than the one below
const TOP = 0.9; // a terrace's top is 90% of its base, leaving a flat ledge before the next one
const HAZE_MAX = 260;

const C = {
  ground: "#c8d3bb",
  cap: "#7f9970",
  capTop: "#90a97f",
  tip: "#8c7152",
  wellOld: "#5f6d69",
  wellNew: "#e58f65",
  shed: "#273c2c",
  roof: "#dfe7df",
  flare: "#404f4c",
  flame: "#f0a35e",
  leaf: "#4f6b4f",
  trunk: "#6b5a45",
  haze: "#e58f65",
};

const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Seeded PRNG so a landfill looks the same every visit. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mat = (color: string) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95 });

/** Half-extents of terrace i's base and top faces. */
const baseHalf = (w: number, d: number, i: number) => [(w / 2) * (1 - STEP * i), (d / 2) * (1 - STEP * i)];
const topHalf = (w: number, d: number, i: number) => baseHalf(w, d, i).map((v) => v * TOP);

/** Spots on each terrace's flat ledge where gas wells can go, highest terraces first. */
function wellSpots(size: SizeClass): THREE.Vector3[] {
  const { w, d, tiers, wells } = DIMS[size];
  const rand = rng(35);
  const spots: THREE.Vector3[] = [];
  for (let tries = 0; spots.length < wells && tries < 4000; tries++) {
    const i = Math.floor(rand() * tiers);
    const [tx, tz] = topHalf(w, d, i);
    const x = (rand() * 2 - 1) * tx * 0.85;
    const z = (rand() * 2 - 1) * tz * 0.85;
    if (i < tiers - 1) {
      const [nx, nz] = baseHalf(w, d, i + 1);
      if (Math.abs(x) < nx + 0.25 && Math.abs(z) < nz + 0.25) continue; // under the next terrace
    }
    if (spots.some((p) => Math.hypot(p.x - x, p.z - z) < 0.9)) continue;
    spots.push(new THREE.Vector3(x, (i + 1) * TIER_H, z));
  }
  return spots;
}

function softDot(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** Low-poly landfill diorama: terraces, gas wells, engine shed and flare, escaping methane. */
export default function Landfill3D({ size, operating, existingCapture, targetCapture }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const wells = useRef<THREE.Mesh[]>([]);
  const plant = useRef<THREE.Group | null>(null);
  const haze = useRef<THREE.Points | null>(null);
  const oldMat = useRef<THREE.Material | null>(null);
  const newMat = useRef<THREE.Material | null>(null);
  const [failed, setFailed] = useState(false);

  // Build the scene once per size class.
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    // Closer for small sites, but not so close that every size class fills the frame the same.
    const dist = { small: 15, medium: 18, large: 22 }[size];
    camera.position.set(dist, dist * 0.68, dist);

    scene.add(new THREE.HemisphereLight("#f7f6f0", "#7d8b6e", 1.6));
    const sun = new THREE.DirectionalLight("#ffffff", 2.2);
    sun.position.set(12, 20, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18 });
    scene.add(sun);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(26, 48), mat(C.ground));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Terraces: square frustums stretched to the footprint, capped soil getting lighter towards the top.
    const { w, d, tiers } = DIMS[size];
    for (let i = 0; i < tiers; i++) {
      const [bx, bz] = baseHalf(w, d, i);
      const [tx] = topHalf(w, d, i);
      const geo = new THREE.CylinderGeometry((tx / bx) * Math.SQRT2, Math.SQRT2, TIER_H, 4, 1);
      geo.rotateY(Math.PI / 4);
      const tier = new THREE.Mesh(geo, mat(i === tiers - 1 ? C.capTop : C.cap));
      tier.scale.set(bx, 1, bz);
      tier.position.y = i * TIER_H + TIER_H / 2;
      tier.castShadow = tier.receiveShadow = true;
      scene.add(tier);
    }
    const [topX, topZ] = topHalf(w, d, tiers - 1);
    if (operating) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(topX * 0.9, 0.06, topZ * 1.2), mat(C.tip));
      tip.position.set(topX * 0.45, tiers * TIER_H + 0.03, -topZ * 0.3);
      tip.receiveShadow = true;
      scene.add(tip);
      const truck = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.32, 0.36), mat("#e8c46a"));
      body.position.y = 0.22;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.36), mat("#f5f5f5"));
      cab.position.set(0.45, 0.21, 0);
      truck.add(body, cab);
      truck.position.set(topX * 0.4, tiers * TIER_H, -topZ * 0.35);
      truck.rotation.y = 0.5;
      truck.traverse((o) => (o.castShadow = true));
      scene.add(truck);
    }

    // Gas wells. Which are shown, and in which colour, depends on capture (second effect).
    oldMat.current = mat(C.wellOld);
    newMat.current = mat(C.wellNew);
    const wellGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.1, 6);
    wellGeo.translate(0, 0.55, 0);
    wells.current = wellSpots(size).map((p) => {
      const m = new THREE.Mesh(wellGeo, oldMat.current!);
      m.position.copy(p);
      m.castShadow = true;
      m.visible = false;
      scene.add(m);
      return m;
    });

    // Engine shed, flare and the header pipe from the mound.
    const g = new THREE.Group();
    const px = w / 2 + 2.6;
    const shed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.4), mat(C.shed));
    shed.position.set(px, 0.55, 1.2);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 1.5), mat(C.roof));
    roof.position.set(px, 1.16, 1.2);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.6, 8), mat(C.flare));
    stack.position.set(px + 0.4, 1.3, -1.3);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 8), new THREE.MeshBasicMaterial({ color: C.flame }));
    flame.position.set(px + 0.4, 2.82, -1.3);
    const pipe = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([new THREE.Vector3(w * 0.42, 0.25, 0), new THREE.Vector3(px - 1.4, 0.15, 0.2), new THREE.Vector3(px - 1.1, 0.15, 1.2)]),
        24,
        0.07,
        6,
      ),
      mat(C.flare),
    );
    g.add(shed, roof, stack, flame, pipe);
    g.traverse((o) => (o.castShadow = true));
    scene.add(g);
    plant.current = g;

    // Trees round the edge.
    const rand = rng(7);
    const leafGeo = new THREE.ConeGeometry(0.6, 1.6, 6);
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 5);
    for (let k = 0; k < 26; k++) {
      const a = rand() * Math.PI * 2;
      const r = 14 + rand() * 9;
      const s = 0.7 + rand() * 0.7;
      const tree = new THREE.Group();
      const leaf = new THREE.Mesh(leafGeo, mat(C.leaf));
      leaf.position.y = 1.2;
      const trunk = new THREE.Mesh(trunkGeo, mat(C.trunk));
      trunk.position.y = 0.25;
      tree.add(leaf, trunk);
      tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      tree.scale.setScalar(s);
      tree.traverse((o) => (o.castShadow = true));
      scene.add(tree);
    }

    // Escaping methane: soft particles rising off the top surfaces.
    const pos = new Float32Array(HAZE_MAX * 3);
    const speed = new Float32Array(HAZE_MAX);
    const hr = rng(11);
    const topY = tiers * TIER_H;
    const spawn = (k: number, y: number) => {
      pos[k * 3] = (hr() * 2 - 1) * w * 0.4;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = (hr() * 2 - 1) * d * 0.4;
      speed[k] = 0.25 + hr() * 0.4;
    };
    for (let k = 0; k < HAZE_MAX; k++) spawn(k, topY * 0.6 + hr() * 4);
    const hazeGeo = new THREE.BufferGeometry();
    hazeGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(
      hazeGeo,
      new THREE.PointsMaterial({ color: C.haze, size: 1.1, map: softDot(), transparent: true, opacity: 0.4, depthWrite: false }),
    );
    scene.add(points);
    haze.current = points;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 14;
    controls.maxDistance = 55;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.5;
    controls.addEventListener("start", () => (controls.autoRotate = false));

    const resize = () => {
      const { clientWidth: cw, clientHeight: ch } = el;
      if (!cw || !ch) return;
      renderer.setSize(cw, ch);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const clock = new THREE.Clock();
    let frame = 0;
    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!reduceMotion) {
        const n = hazeGeo.drawRange.count;
        for (let k = 0; k < Math.min(n, HAZE_MAX); k++) {
          pos[k * 3 + 1] += speed[k] * dt;
          if (pos[k * 3 + 1] > topY + 4.5) spawn(k, topY * 0.6);
        }
        hazeGeo.attributes.position.needsUpdate = true;
        flame.scale.y = 0.85 + Math.sin(clock.elapsedTime * 13) * 0.15;
      }
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mt = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [size, operating]);

  // Wells and haze follow the capture sliders without rebuilding the scene.
  const target = Math.max(existingCapture, targetCapture);
  useEffect(() => {
    const n = wells.current.length;
    const old = Math.round(existingCapture * n);
    const all = Math.round(target * n);
    wells.current.forEach((m, i) => {
      m.visible = i < all;
      m.material = i < old ? oldMat.current! : newMat.current!;
    });
    if (plant.current) plant.current.visible = all > 0;
    haze.current?.geometry.setDrawRange(0, Math.round(HAZE_MAX * (1 - target)));
  }, [existingCapture, target, size, operating]);

  if (failed) return <div className="landfill-3d fallback">3D view needs WebGL, which this browser has turned off.</div>;
  return <div ref={host} className="landfill-3d" role="img" aria-label={`3D model of a ${size} landfill with gas wells`} />;
}
