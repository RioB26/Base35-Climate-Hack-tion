import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SizeClass } from "../model/size";
import { VisualFallback } from "./Mark";

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

type Surface = "cap" | "soil" | "ground";
// Base colour plus speckle colours for each surface.
const SURFACES: Record<Surface, { base: string; specks: string[]; strokes: boolean }> = {
  cap: { base: "#86a074", specks: ["#6f8a5f", "#9cb487", "#7b9468", "#a9bd8f", "#5f7a52"], strokes: true },
  soil: { base: "#8c7152", specks: ["#7a6045", "#a4876a", "#6b533b", "#b39a7c", "#8f8f86"], strokes: false },
  ground: { base: "#c3cfb4", specks: ["#b2c1a1", "#d2dcc4", "#a9b897", "#cbd2b8", "#9fb08c"], strokes: true },
};
const TEX_PX = 256;

/**
 * Seamless surface texture drawn on a canvas: grass on capped ground, bare soil on the
 * active cell. Generated at load, so there are no image files to download or license.
 */
function surfaceTexture(kind: Surface): THREE.CanvasTexture {
  const { base, specks, strokes } = SURFACES[kind];
  const c = document.createElement("canvas");
  c.width = c.height = TEX_PX;
  const g = c.getContext("2d")!;
  const rand = rng(kind.length * 101);
  // Draw at the wrapped positions too, so the tile has no seams.
  const wrapped = (x: number, y: number, r: number, draw: (x: number, y: number) => void) => {
    for (const dx of [-TEX_PX, 0, TEX_PX])
      for (const dy of [-TEX_PX, 0, TEX_PX]) {
        const px = x + dx;
        const py = y + dy;
        if (px > -r && px < TEX_PX + r && py > -r && py < TEX_PX + r) draw(px, py);
      }
  };
  g.fillStyle = base;
  g.fillRect(0, 0, TEX_PX, TEX_PX);
  // Soft patches for variation at a larger scale.
  for (let k = 0; k < 30; k++) {
    const r = 20 + rand() * 50;
    const col = specks[Math.floor(rand() * specks.length)];
    wrapped(rand() * TEX_PX, rand() * TEX_PX, r, (x, y) => {
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, col + "55");
      grad.addColorStop(1, col + "00");
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, 2 * r, 2 * r);
    });
  }
  // Fine grain: grass blades or soil crumbs and pebbles.
  for (let k = 0; k < 2600; k++) {
    g.fillStyle = g.strokeStyle = specks[Math.floor(rand() * specks.length)];
    g.globalAlpha = 0.5 + rand() * 0.5;
    const len = 2 + rand() * 4;
    const ang = -Math.PI / 2 + (rand() - 0.5) * 1.2;
    wrapped(rand() * TEX_PX, rand() * TEX_PX, 6, (x, y) => {
      if (strokes) {
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        g.stroke();
      } else {
        g.beginPath();
        g.ellipse(x, y, len * 0.4, len * 0.3, ang, 0, Math.PI * 2);
        g.fill();
      }
    });
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Top-down UVs in world units, so grass and soil keep the same grain size on every
 * size class: a large landfill shows more tiles, not bigger blades of grass.
 */
function planarUV(geo: THREE.BufferGeometry, metresPerTile: number) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let k = 0; k < pos.count; k++) {
    uv[k * 2] = pos.getX(k) / metresPerTile;
    uv[k * 2 + 1] = pos.getZ(k) / metresPerTile;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

const textured = (map: THREE.Texture, tint = "#ffffff") =>
  new THREE.MeshStandardMaterial({ map, color: tint, flatShading: true, roughness: 0.95 });

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

    const tex = { cap: surfaceTexture("cap"), soil: surfaceTexture("soil"), ground: surfaceTexture("ground") };
    const groundGeo = new THREE.CircleGeometry(26, 48);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(planarUV(groundGeo, 5), textured(tex.ground));
    ground.receiveShadow = true;
    scene.add(ground);

    // Terraces: square frustums stretched to the footprint, grassed cap a little lighter towards the top.
    const { w, d, tiers } = DIMS[size];
    for (let i = 0; i < tiers; i++) {
      const [bx, bz] = baseHalf(w, d, i);
      const [tx] = topHalf(w, d, i);
      const geo = new THREE.CylinderGeometry((tx / bx) * Math.SQRT2, Math.SQRT2, TIER_H, 4, 1);
      geo.rotateY(Math.PI / 4);
      geo.scale(bx, 1, bz);
      geo.translate(0, i * TIER_H + TIER_H / 2, 0);
      const tier = new THREE.Mesh(planarUV(geo, 3), textured(tex.cap, i === tiers - 1 ? "#ffffff" : "#e6eadf"));
      tier.castShadow = tier.receiveShadow = true;
      scene.add(tier);
    }
    const [topX, topZ] = topHalf(w, d, tiers - 1);
    if (operating) {
      const tipGeo = new THREE.BoxGeometry(topX * 0.9, 0.06, topZ * 1.2);
      tipGeo.translate(topX * 0.45, tiers * TIER_H + 0.03, -topZ * 0.3);
      const tip = new THREE.Mesh(planarUV(tipGeo, 2), textured(tex.soil));
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
      Object.values(tex).forEach((t) => t.dispose());
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

  if (failed) return <VisualFallback className="landfill-3d fallback" title="Interactive 3D view unavailable" detail="Adjust the project settings to compare capture, costs and returns. The estimates still update." />;
  return <div ref={host} className="landfill-3d" role="img" aria-label={`3D model of a ${size} landfill with gas wells`} />;
}
