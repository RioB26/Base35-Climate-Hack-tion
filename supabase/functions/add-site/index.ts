// Edge Function: validate a new landfill, store it, and start the satellite screening.
//
// Secrets (supabase secrets set ...):
//   ADD_SITE_PASSCODE   shared passcode the web form must send
//   GH_DISPATCH_TOKEN   fine-grained GitHub token, Actions: write on GH_REPO only
//   GH_REPO             e.g. RioB26/Base35-Climate-Hack-tion
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import { createClient } from "npm:@supabase/supabase-js@2";
import { dispatchSite } from "../_shared/dispatch.ts";
import { distanceKm, validateNewSite } from "./validate.ts";

const MAX_NEW_SITES_PER_HOUR = 5;
const DUPLICATE_RADIUS_KM = 1;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-add-site-passcode",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "POST only" });

  const passcode = Deno.env.get("ADD_SITE_PASSCODE");
  if (!passcode || req.headers.get("x-add-site-passcode") !== passcode) return reply(401, { error: "Wrong passcode." });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(400, { errors: ["Body must be JSON."] });
  }
  const v = validateNewSite(body);
  if (!v.ok) return reply(400, { errors: v.errors });
  const s = v.site;

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("sites").select("id", { count: "exact", head: true }).gte("created_at", since);
  if ((count ?? 0) >= MAX_NEW_SITES_PER_HOUR) return reply(429, { error: "Too many sites added recently. Try again later." });

  // A rejected site is on its way out; it must not block the user from trying again.
  const { data: all, error: listError } = await db.from("sites").select("id, name, lat, lon, satellite_status");
  if (listError) return reply(500, { error: "Could not check existing sites." });
  const existing = all.filter((e) => e.satellite_status !== "rejected");
  if (existing.some((e) => e.id === s.id)) return reply(409, { error: `A site called "${s.name}" already exists.` });
  const near = existing.find((e) => distanceKm(e.lat, e.lon, s.lat, s.lon) < DUPLICATE_RADIUS_KM);
  if (near) return reply(409, { error: `Within ${DUPLICATE_RADIUS_KM} km of existing site "${near.name}".` });

  if (all.some((e) => e.id === s.id)) await db.from("sites").delete().eq("id", s.id).eq("satellite_status", "rejected");

  const { error: insertError } = await db.from("sites").insert({
    last_dispatch_at: new Date().toISOString(),
    id: s.id,
    name: s.name,
    state: s.state,
    lat: s.lat,
    lon: s.lon,
    acceptance: s.acceptance,
    k: s.k,
    l0: s.L0,
    existing_capture: s.existingCapture,
    illustrative: s.illustrative,
    notes: s.notes,
    sources: s.sources,
    satellite_status: "running",
  });
  if (insertError) return reply(500, { error: "Could not save the site." });

  const gh = await dispatchSite(s.id);
  if (!gh.ok) {
    await db.from("sites").update({ satellite_status: "failed", error: `Could not start satellite job (${gh.status}).` }).eq("id", s.id);
    return reply(502, { error: "Site saved, but the satellite job could not be started.", id: s.id });
  }

  return reply(201, { id: s.id, site: s });
});
