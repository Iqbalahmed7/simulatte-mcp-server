import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the environment variable before importing client
vi.stubEnv("SIMULATTE_API_KEY", "sim_live_test_key");

const { SimulatteClient } = await import("../src/client.js");

describe("SimulatteClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POST includes Authorization header and Content-Type", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ study_id: "s_123", status: "queued", eta_seconds: 120 }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_test_key", "https://test.api");
    await client.post("/v1/forge/concept-viability", { concept: "test" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://test.api/v1/forge/concept-viability");
    expect((options.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer sim_live_test_key"
    );
    expect((options.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
  });

  it("GET includes Authorization header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ study_id: "s_123", status: "complete", results: {} }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_test_key", "https://test.api");
    await client.get("/v1/studies/s_123/results");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://test.api/v1/studies/s_123/results");
    expect((options.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer sim_live_test_key"
    );
  });

  it("throws on non-ok POST response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "Unprocessable Entity",
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_test_key", "https://test.api");
    await expect(client.post("/v1/forge/concept-viability", {})).rejects.toThrow(
      "Simulatte API error 422"
    );
  });

  it("throws on non-ok GET response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not Found",
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_test_key", "https://test.api");
    await expect(client.get("/v1/studies/missing/results")).rejects.toThrow(
      "Simulatte API error 404"
    );
  });

  it("sends POST body as JSON string", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new SimulatteClient("sim_live_test_key", "https://test.api");
    const payload = { concept: "test concept", sample_size: 50 };
    await client.post("/v1/forge/concept-viability", payload);

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.body).toBe(JSON.stringify(payload));
    expect(options.method).toBe("POST");
  });
});
