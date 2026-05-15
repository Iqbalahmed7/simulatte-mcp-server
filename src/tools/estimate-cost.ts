import { z } from "zod";
import { SKU_CREDIT_COSTS, USD_PER_CREDIT } from "../types.js";
import type { CostEstimate } from "../types.js";

export const estimateCostSchema = z.object({
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
  sample_size: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Number of personas (default: 50)"),
  max_turns: z
    .number()
    .int()
    .min(1)
    .max(30)
    .optional()
    .describe("Interview turns — only relevant for depth-interview SKU"),
});

export type EstimateCostInput = z.infer<typeof estimateCostSchema>;

export const estimateCostTool = {
  name: "simulatte_estimate_cost",
  description:
    "Estimate the credit cost and USD price for a Simulatte study before running it. Calculated locally — no API call needed. Credits = base_cost_per_persona × sample_size.",
  inputSchema: estimateCostSchema,
};

export function handleEstimateCost(input: EstimateCostInput): CostEstimate {
  const { sku, sample_size = 50, max_turns = 12 } = input;
  const baseCreditsPerPersona = SKU_CREDIT_COSTS[sku];

  let credits: number;
  if (sku === "depth-interview") {
    // depth interviews: base rate × turns multiplier
    credits = Math.ceil(baseCreditsPerPersona * (max_turns / 12));
  } else {
    credits = baseCreditsPerPersona * sample_size;
  }

  const usd_estimate = Math.round(credits * USD_PER_CREDIT * 100) / 100;

  return { credits, usd_estimate };
}
