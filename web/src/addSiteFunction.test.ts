import { beforeEach, describe, expect, it, vi } from "vitest";

// The Edge Function runs on Deno. These tests stub the Deno globals, the Supabase client and the
// GitHub dispatch so the request handling (passcode, validation, limits, duplicates) runs for real.

const state = vi.hoisted(() => ({
  existing: [] as { id: string; name: string; lat: number; lon: number; satellite_status?: string }[],
  deleted: 0,
  recent: 0,
  inserted: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
  insertError: null as unknown,
  listError: null as unknown,
  dispatch: { ok: true, status: 204 },
}));

vi.mock("npm:@supabase/supabase-js@2", () => ({
  createClient: () => ({
    from: () => ({
      select: (_cols: string, opts?: { head?: boolean }) =>
        opts?.head
          ? { gte: async () => ({ count: state.recent }) }
          : Promise.resolve({ data: state.existing, error: state.listError }),
      insert: async (row: Record<string, unknown>) => {
        if (!state.insertError) state.inserted.push(row);
        return { error: state.insertError };
      },
      delete: () => ({
        eq: () => ({
          eq: async () => {
            state.deleted++;
            return {};
          },
        }),
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: async () => {
          state.updates.push(patch);
          return {};
        },
      }),
    }),
  }),
}));
vi.mock("../../supabase/functions/_shared/dispatch.ts", () => ({ dispatchSite: async () => state.dispatch }));

const PASSCODE = "letmein";
let handler: (req: Request) => Promise<Response>;

beforeEach(async () => {
  state.existing = [];
  state.recent = 0;
  state.deleted = 0;
  state.inserted = [];
  state.updates = [];
  state.insertError = null;
  state.listError = null;
  state.dispatch = { ok: true, status: 204 };
  vi.stubGlobal("Deno", {
    env: { get: (k: string) => (k === "ADD_SITE_PASSCODE" ? PASSCODE : "x") },
    serve: (h: typeof handler) => {
      handler = h;
    },
  });
  vi.resetModules();
  await import("../../supabase/functions/add-site/index.ts");
});

const good = {
  name: "Spring Farm Landfill",
  state: "NSW",
  lat: -34.05,
  lon: 150.7,
  acceptance: [{ fromYear: 2000, toYear: 2030, tonnesPerYear: 200000 }],
};

const post = (body: unknown, passcode: string | null = PASSCODE) =>
  handler(
    new Request("http://x/add-site", {
      method: "POST",
      headers: passcode === null ? {} : { "x-add-site-passcode": passcode },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("add-site function", () => {
  it("answers CORS preflight and rejects other methods", async () => {
    expect((await handler(new Request("http://x", { method: "OPTIONS" }))).status).toBe(200);
    expect((await handler(new Request("http://x", { method: "GET" }))).status).toBe(405);
  });

  it("rejects a wrong or missing passcode before touching the body", async () => {
    expect((await post(good, "nope")).status).toBe(401);
    expect((await post(good, null)).status).toBe(401);
    expect(state.inserted).toHaveLength(0);
  });

  it("rejects a body that is not JSON", async () => {
    const res = await post("not json");
    expect(res.status).toBe(400);
    expect((await res.json()).errors[0]).toContain("JSON");
  });

  it("rejects invalid sites with every error and saves nothing", async () => {
    const res = await post({ ...good, lat: 0, lon: 0, acceptance: [{ fromYear: 2000, toYear: 2010, tonnesPerYear: 5 }] });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.length).toBeGreaterThanOrEqual(2);
    expect(state.inserted).toHaveLength(0);
  });

  it("rejects overlapping periods server-side too", async () => {
    const res = await post({
      ...good,
      acceptance: [
        { fromYear: 1990, toYear: 2005, tonnesPerYear: 1000 },
        { fromYear: 2000, toYear: 2020, tonnesPerYear: 1000 },
      ],
    });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.join(" ")).toContain("overlap");
  });

  it("rate limits to 5 new sites per hour", async () => {
    state.recent = 5;
    expect((await post(good)).status).toBe(429);
    expect(state.inserted).toHaveLength(0);
  });

  it("rejects a duplicate name", async () => {
    state.existing = [{ id: "spring-farm-landfill", name: "Spring Farm Landfill", lat: -10, lon: 120 }];
    const res = await post(good);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("already exists");
  });

  it("rejects a site within 1 km of an existing one", async () => {
    state.existing = [{ id: "other", name: "Other Tip", lat: -34.051, lon: 150.701 }];
    const res = await post(good);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("Other Tip");
  });

  it("lets a user resubmit a site that was rejected, replacing the old row", async () => {
    state.existing = [{ id: "spring-farm-landfill", name: "Spring Farm Landfill", lat: -34.05, lon: 150.7, satellite_status: "rejected" }];
    expect((await post(good)).status).toBe(201);
    expect(state.deleted).toBe(1);
    expect(state.inserted).toHaveLength(1);
  });

  it("does not delete anything when there is no rejected row to replace", async () => {
    expect((await post(good)).status).toBe(201);
    expect(state.deleted).toBe(0);
  });

  it("accepts a site 5 km from an existing one", async () => {
    state.existing = [{ id: "other", name: "Other Tip", lat: -34.1, lon: 150.7 }];
    expect((await post(good)).status).toBe(201);
  });

  it("saves a good site as running and starts the job", async () => {
    const res = await post(good);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("spring-farm-landfill");
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).toMatchObject({
      id: "spring-farm-landfill",
      satellite_status: "running",
      l0: 100,
      existing_capture: 0,
      illustrative: true,
    });
    expect(state.updates).toHaveLength(0);
  });

  it("reports a database failure without starting a job", async () => {
    state.insertError = { message: "boom" };
    expect((await post(good)).status).toBe(500);
  });

  it("reports a list failure instead of skipping the duplicate check", async () => {
    state.listError = { message: "boom" };
    expect((await post(good)).status).toBe(500);
    expect(state.inserted).toHaveLength(0);
  });

  it("marks the site failed and returns 502 with its id when the job cannot start", async () => {
    state.dispatch = { ok: false, status: 403 };
    const res = await post(good);
    expect(res.status).toBe(502);
    expect((await res.json()).id).toBe("spring-farm-landfill");
    expect(state.updates[0]).toMatchObject({ satellite_status: "failed", error: "Could not start satellite job (403)." });
  });
});
