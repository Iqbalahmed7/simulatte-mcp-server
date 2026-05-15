import { z } from "zod";
import { SimulatteClient } from "../client.js";
import type { CreatePoolResponse } from "../types.js";

export const createPoolSchema = z.object({
  name: z.string().min(1).describe("Human-readable name for this persona pool"),
  market: z
    .string()
    .describe(
      "Target market descriptor (e.g. 'US millennial parents', 'UK SMB decision-makers')"
    ),
  size: z
    .number()
    .int()
    .min(10)
    .max(10000)
    .describe("Number of synthetic personas to generate in this pool"),
  pool_spec: z
    .record(z.unknown())
    .describe(
      "Demographic and psychographic specification for the pool (age, income, lifestyle, attitudes, etc.)"
    ),
});

export type CreatePoolInput = z.infer<typeof createPoolSchema>;

export const createPoolTool = {
  name: "simulatte_create_pool",
  description:
    "Create a new synthetic persona pool with a custom demographic and psychographic specification. Returns a pool_id you can reuse across multiple studies.",
  inputSchema: createPoolSchema,
};

export async function handleCreatePool(
  client: SimulatteClient,
  input: CreatePoolInput
): Promise<CreatePoolResponse> {
  return client.post<CreatePoolResponse>("/v1/pools", input);
}
