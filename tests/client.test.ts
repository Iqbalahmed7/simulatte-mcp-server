import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock env vars BEFORE importing client (module-level reads happen at import time).
vi.stubEnv("SIMULATTE_API_KEY", "sim_live_test_key");

const { SimulatteClient } = await import("../src/client.js");

/**
 * Helper — build a fetch mock that returns /v1/me first, then the
 * actual endpoint response. The client's lazy workspace-resolution
 * pattern means every operation hits /v1/me once before its real call.
 */
function mockFetchWithMe(meWorkspaceId: string | null, endpointResponse: unknown) {
  return vi
    .fn()
    .mockImplementationOnce(async (url: string) => {
      expect(url).toContain("/v1/me");
      return {
        ok: true,
        json: async () => ({
          workspace_id: meWorkspaceId,
          api_key_id: "ak_test_123",
          auth_type: "sim_live",
          rate_limit_tier: "standard",
          spend_cap_credits: null,
          spend_used_credits: 0,
        }),
      };
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => endpointResponse,
    });
}

describe("SimulatteClient — header discipline (BUG-MCP-COLD-DP-BROKEN-001)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // Clear any leftover env override between tests
    vi.unstubAllEnvs();
    vi.stubEnv("SIMULATTE_API_KEY", "sim_live_test_key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends BOTH X-API-Key AND Authorization: Bearer on every call", async () => {
    // Worker's legacy endpoints (/pools) read X-API-Key only; modern
    // v0.3+ endpoints accept Bearer via _resolve_api_key. Sending both
    // covers every endpoint.
    const mockFetch = mockFetchWithMe("ws-uuid-test", {
      study_id: "s_123",
      status: "queued",
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_test_key", "https://test.api");
    await client.post("/v1/forge/concept-viability", { concept: "test" });

    // Second call is the real one — assert both auth headers present
    const [, options] = mockFetch.mock.calls[1] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("sim_live_test_key");
    expect(headers["Authorization"]).toBe("Bearer sim_live_test_key");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("hits /v1/me on first call to resolve workspace_id, caches result", async () => {
    const mockFetch = mockFetchWithMe("ws-uuid-cached", { ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_test_key", "https://test.api");
    await client.get("/pools");

    // First call must be /v1/me, second the actual endpoint
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [firstUrl] = mockFetch.mock.calls[0] as [string, RequestInit];
    const [secondUrl] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(firstUrl).toBe("https://test.api/v1/me");
    expect(secondUrl).toBe("https://test.api/pools");
  });

  it("propagates resolved workspace_id as X-Workspace-Id header", async () => {
    // BUG-MCP-NO-WORKSPACE-RESOLVE-001: legacy /pools endpoint requires
    // X-Workspace-Id alongside X-API-Key. Client must derive from /v1/me.
    const mockFetch = mockFetchWithMe("ws-uuid-propagated", []);
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_test_key", "https://test.api");
    await client.get("/pools");

    const [, options] = mockFetch.mock.calls[1] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["X-Workspace-Id"]).toBe("ws-uuid-propagated");
  });

  it("respects SIMULATTE_WORKSPACE_ID env override (legacy shared-key path)", async () => {
    vi.stubEnv("SIMULATTE_WORKSPACE_ID", "ws-uuid-env-override");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_test_key", "https://test.api");
    await client.get("/pools");

    // With env override, /v1/me must NOT be called
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://test.api/pools");
    const headers = options.headers as Record<string, string>;
    expect(headers["X-Workspace-Id"]).toBe("ws-uuid-env-override");
  });

  it("caches /v1/me result across multiple calls", async () => {
    const mockFetch = vi
      .fn()
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          workspace_id: "ws-cached-once",
          api_key_id: "ak",
          auth_type: "sim_live",
          rate_limit_tier: "standard",
          spend_cap_credits: null,
          spend_used_credits: 0,
        }),
      }))
      .mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_test_key", "https://test.api");
    await client.get("/pools");
    await client.get("/v1/studies/s_1/results");
    await client.post("/v1/forge/concept-viability", {});

    // /v1/me called once, 3 real endpoint calls → 4 total
    expect(mockFetch).toHaveBeenCalledTimes(4);
    const [firstUrl] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(firstUrl).toBe("https://test.api/v1/me");
  });

  it("uses production worker URL by default (not Vercel SPA)", async () => {
    // Regression: BUG-MCP-COLD-DP-BROKEN-001 root cause. The v0.1.1 default
    // was https://app.simulatte.io/api which is the Next.js console and
    // returns HTTP 307 → /sign-in for /api/* paths. Cold DPs got HTML
    // parse errors. Default must point at the actual production worker.
    const { SimulatteClient: FreshClient } = await import("../src/client.js");
    const client = new FreshClient();
    // @ts-expect-error — peek at private field to assert default
    expect(client.baseUrl).toBe("https://forge-worker-production.up.railway.app");
  });
});

describe("SimulatteClient — error remediation (BUG-MCP-COLD-DP-BROKEN-001)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.unstubAllEnvs();
    vi.stubEnv("SIMULATTE_API_KEY", "sim_live_test_key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("401 on /v1/me surfaces actionable 'generate a fresh key' message", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"detail":"Invalid API key"}',
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_bad_key", "https://test.api");
    await expect(client.get("/pools")).rejects.toThrow(
      /Generate a fresh one at/
    );
  });

  it("400 on /v1/me surfaces legacy-shared-key remediation message", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"detail":"legacy_shared_key has no per-key workspace"}',
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("forge_legacy_shared", "https://test.api");
    await expect(client.get("/pools")).rejects.toThrow(
      /SIMULATTE_WORKSPACE_ID env var/
    );
  });

  it("non-ok POST response includes path in error message", async () => {
    const mockFetch = mockFetchWithMe("ws-ok", undefined);
    // Override the second mock to return a 422
    mockFetch.mockReset();
    mockFetch
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          workspace_id: "ws-ok",
          api_key_id: "ak",
          auth_type: "sim_live",
          rate_limit_tier: "standard",
          spend_cap_credits: null,
          spend_used_credits: 0,
        }),
      }))
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => "validation error",
      });
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_test_key", "https://test.api");
    await expect(
      client.post("/v1/forge/concept-viability", {})
    ).rejects.toThrow(/422 on POST \/v1\/forge\/concept-viability/);
  });
});

describe("SimulatteClient — request body discipline", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.unstubAllEnvs();
    vi.stubEnv("SIMULATTE_API_KEY", "sim_live_test_key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("serialises POST body as JSON string", async () => {
    const mockFetch = mockFetchWithMe("ws-ok", {});
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_test_key", "https://test.api");
    const payload = { concept: "test concept", sample_size: 50 };
    await client.post("/v1/forge/concept-viability", payload);

    const [, options] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(options.body).toBe(JSON.stringify(payload));
    expect(options.method).toBe("POST");
  });
});
