import { z } from "zod";
import { SimulatteClient } from "../client.js";
import type { RunStudyResponse } from "../types.js";

export const runStudySchema = z.object({
  sku: z.enum([
    "concept-viability",
    "claim-credibility",
    "brand-identity-test",
    "message-resonance",
    "price-sensitivity",
    "feature-priority",
    "ad-copy",
    "b2b-committee",
    "conjoint",
    "iris-pulse",
    "card-sort",
    "open-end",
    "ab-backlog",
    "polarization-stress-test",
    "name-test",
    "founder-positioning",
    "ad-concept-resonance",
    "depth-interview",
    "custom-study",
    "iat",
    "counterfactual-positioning",
    "personalization-sensitivity",
    "regulated-claim-preflight",
    "volume-forecast",
    "brand-tracker",
    "creative-audit",
  ]),
  inputs: z.record(z.unknown()).describe("SKU-specific study inputs"),
  persona_pool_id: z.string().optional().describe("ID of persona pool to use"),
  sample_size: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Number of synthetic personas to run (default varies by SKU)"),
});

export type RunStudyInput = z.infer<typeof runStudySchema>;

export const runStudyTool = {
  name: "simulatte_run_study",
  description:
    "Run a Simulatte synthetic research study. Choose from 26 SKUs covering concept testing, pricing, messaging, B2B committee simulation, depth interviews, and more. Returns a study_id you can poll with simulatte_get_results.",
  inputSchema: runStudySchema,
};

export async function handleRunStudy(
  client: SimulatteClient,
  input: RunStudyInput
): Promise<RunStudyResponse> {
  const { sku, inputs, persona_pool_id, sample_size } = input;
  const body: Record<string, unknown> = { ...inputs };
  if (persona_pool_id) body.persona_pool_id = persona_pool_id;
  if (sample_size) body.sample_size = sample_size;
  return client.post<RunStudyResponse>(`/v1/forge/${sku}`, body);
}
