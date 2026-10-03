// Edge Function: re-run the satellite screening for a site whose job failed.
// Uses the same secrets as add-site. Only sites added through the app (created after the 2020
// backdating of the seeded sites) and currently `failed` can be retried, once per 5 minutes.

import { createClient } from "npm:@supabase/supabase-js@2";
import { dispatchSite } from "../_shared/dispatch.ts";

const MIN_RETRY_GAP_MS = 5 * 60_000;
const SEEDED_BEFORE = "2021-01-01T00:00:00Z";

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

  let id: unknown;
  try {
    id = (await req.json()).id;
  } catch {
    return reply(400, { error: "Body must be JSON." });
  }
  if (typeof id !== "string" || !id) return reply(400, { error: "Missing site id." });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: site, error } = await db
    .from("sites")
    .select("id, satellite_status, created_at, last_dispatch_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return reply(500, { error: "Could not look up the site." });
  if (!site || site.created_at < SEEDED_BEFORE) return reply(404, { error: "No such site." });
  if (site.satellite_status !== "failed") return reply(409, { error: "Only failed sites can be retried." });
  if (site.last_dispatch_at && Date.now() - Date.parse(site.last_dispatch_at) < MIN_RETRY_GAP_MS) {
    return reply(429, { error: "Retried recently. Wait a few minutes and try again." });
  }

  const now = new Date().toISOString();
  await db.from("sites").update({ satellite_status: "running", error: null, last_dispatch_at: now }).eq("id", id);

  const gh = await dispatchSite(id);
  if (!gh.ok) {
    await db.from("sites").update({ satellite_status: "failed", error: `Could not start satellite job (${gh.status}).` }).eq("id", id);
    return reply(502, { error: "The satellite job could not be started." });
  }
  return reply(200, { id });
});
