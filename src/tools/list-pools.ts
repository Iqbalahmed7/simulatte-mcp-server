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
  return client.get<Pool[]>("/v1/pools");
}
