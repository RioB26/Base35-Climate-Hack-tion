// Start the satellite screening for one site by sending a repository_dispatch to GitHub.
// Needs GH_REPO and GH_DISPATCH_TOKEN (see add-site/index.ts). Returns the HTTP status of the call.
export async function dispatchSite(siteId: string): Promise<{ ok: boolean; status: number }> {
  const gh = await fetch(`https://api.github.com/repos/${Deno.env.get("GH_REPO")}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("GH_DISPATCH_TOKEN")}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "add-site-edge-function",
    },
    body: JSON.stringify({ event_type: "add-site", client_payload: { siteId } }),
  });
  return { ok: gh.ok, status: gh.status };
}
