import { z } from "zod";
import { SimulatteClient } from "../client.js";
import type { Pool } from "../types.js";

export const listPoolsSchema = z.object({});

export type ListPoolsInput = z.infer<typeof listPoolsSchema>;

export const listPoolsTool = {
  name: "simulatte_list_pools",
  description:
    "List all persona pools in your Simulatte workspace. Returns pool IDs, names, markets, and sizes. Use pool IDs in simulatte_run_study to target a specific audience segment.",
  inputSchema: listPoolsSchema,
};

export async function handleListPools(
  client: SimulatteClient,
  _input: ListPoolsInput
): Promise<Pool[]> {
  // BUG-MCP-COLD-DP-BROKEN-001 (2026-06-01): worker has GET /pools
  // (no /v1/ prefix). v0.1.1 hit /v1/pools which returns 404.
  // Worker response is { pools: Pool[] } — unwrap.
  const res = await client.get<{ pools: Pool[] }>("/pools");
  return res.pools ?? [];
}
