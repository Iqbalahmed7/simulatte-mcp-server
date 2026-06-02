/**
 * SimulatteClient — HTTP client for the Simulatte REST API.
 *
 * BUG-MCP-COLD-DP-BROKEN-001 (2026-06-01): v0.1.1 had four bugs that
 * made the MCP server unusable for any cold DP installing via npx:
 *
 *   1. API_URL defaulted to https://app.simulatte.io/api — that's the
 *      Vercel Next.js console, which returns HTTP 307 → /sign-in for
 *      any /api/* path. The actual production worker is at
 *      forge-worker-production.up.railway.app.
 *
 *   2. Sent Authorization: Bearer only. The worker's legacy endpoints
 *      (/pools, /pools/{id}, etc.) use require_auth(x_api_key) which
 *      reads X-API-Key only. Modern v0.3+ endpoints (CV, MR, FP, etc.)
 *      DO accept Bearer via _resolve_api_key, but legacy ones don't.
 *      Fix: send BOTH headers — every endpoint accepts at least one.
 *
 *   3. list_pools hit /v1/pools — that path doesn't exist. The worker
 *      has GET /pools (no /v1/ prefix). Same bug on create_pool.
 *
 *   4. Never sent X-Workspace-Id. Legacy /pools requires it. Modern
 *      v0.3+ endpoints resolve workspace_id from the sim_live_* key
 *      server-side, but legacy ones don't have that resolver wired in.
 *      Fix: on first call, hit GET /v1/me to resolve workspace_id from
 *      the key, cache it, send as X-Workspace-Id on every subsequent
 *      call. Worker /v1/me endpoint shipped 2026-06-01 (commit f25b4dd).
 */

const DEFAULT_API_URL =
  "https://forge-worker-production.up.railway.app";

const API_URL = process.env.SIMULATTE_API_URL ?? DEFAULT_API_URL;
const API_KEY = process.env.SIMULATTE_API_KEY;

if (!API_KEY) {
  console.error(
    "Missing SIMULATTE_API_KEY environment variable. " +
      "Get one at https://app.simulatte.io/settings/api-keys"
  );
  process.exit(1);
}

interface MeResponse {
  workspace_id: string | null;
  api_key_id: string | null;
  auth_type: "sim_live" | "jwt" | "legacy_shared";
  rate_limit_tier: string;
  spend_cap_credits: number | null;
  spend_used_credits: number;
}

export class SimulatteClient {
  private workspaceIdPromise: Promise<string | null> | null = null;

  constructor(
    private apiKey: string = API_KEY!,
    private baseUrl: string = API_URL
  ) {}

  /**
   * Build the headers every request needs.
   *
   * Sends BOTH X-API-Key and Authorization: Bearer so every endpoint
   * accepts at least one — modern v0.3+ endpoints prefer Bearer via
   * `_resolve_api_key`; legacy `/pools` and similar require X-API-Key.
   * Either header alone breaks half the surface.
   */
  private buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
      "X-API-Key": this.apiKey,
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "@simulatte-io/mcp-server/0.1.2",
      ...extra,
    };
  }

  /**
   * Resolve the workspace_id for this API key via /v1/me. Cached after
   * first resolution. Returns null only for the legacy shared-key path
   * (where no per-key workspace exists — caller must set
   * SIMULATTE_WORKSPACE_ID env var).
   */
  private async resolveWorkspaceId(): Promise<string | null> {
    if (this.workspaceIdPromise) return this.workspaceIdPromise;

    // Allow override via env var (for legacy shared keys + testing)
    const envOverride = process.env.SIMULATTE_WORKSPACE_ID;
    if (envOverride) {
      this.workspaceIdPromise = Promise.resolve(envOverride);
      return this.workspaceIdPromise;
    }

    this.workspaceIdPromise = (async () => {
      const res = await fetch(`${this.baseUrl}/v1/me`, {
        method: "GET",
        headers: this.buildHeaders(),
      });
      if (!res.ok) {
        const text = await res.text();
        // 400 on /v1/me means legacy shared key — fail loud with a
        // clear remediation message
        if (res.status === 400) {
          throw new Error(
            "Legacy shared FORGE_API_KEY detected — please set " +
              "SIMULATTE_WORKSPACE_ID env var alongside SIMULATTE_API_KEY, " +
              "or migrate to a sim_live_* per-customer key at " +
              "https://app.simulatte.io/settings/api-keys"
          );
        }
        if (res.status === 401) {
          throw new Error(
            "Simulatte API rejected the API key. Generate a fresh one at " +
              "https://app.simulatte.io/settings/api-keys and update " +
              "SIMULATTE_API_KEY in your MCP client config."
          );
        }
        throw new Error(`/v1/me lookup failed: ${res.status} ${text}`);
      }
      const me = (await res.json()) as MeResponse;
      return me.workspace_id;
    })();

    return this.workspaceIdPromise;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const ws = await this.resolveWorkspaceId();
    const headers = this.buildHeaders(
      ws ? { "X-Workspace-Id": ws } : {}
    );
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Simulatte API error ${res.status} on POST ${path}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async get<T>(path: string): Promise<T> {
    const ws = await this.resolveWorkspaceId();
    const headers = this.buildHeaders(
      ws ? { "X-Workspace-Id": ws } : {}
    );
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Simulatte API error ${res.status} on GET ${path}: ${text}`);
    }
    return res.json() as Promise<T>;
  }
}
