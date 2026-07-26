import { z } from "zod";
import { BUCKET_BASE_CREDITS, SKU_BUCKET, USD_PER_CREDIT, computeStudyCredits } from "../types.js";
import type { CostEstimate, StudySku } from "../types.js";

export const estimateCostSchema = z.object({
  sku: z.enum([
    "concept-viability",
    "claim-credibility",
    "brand-identity-test",
    "message-resonance",
    "price-sensitivity",
    "feature-priority",
    // "ad-copy" removed 2026-06-09 — ACT deprecated
    // "email-subject-test",  // EST deferred to Phase 2 — founder 2026-06-09
    "b2b-committee",
    "conjoint",
    "iris-pulse",
    "card-sort",
    "open-end",
    "ab-backlog",
    // "polarization-stress-test" folded into PreFlight v2 — task #210 PST-FOLD-001 (2026-06-11)
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
    "Estimate the credit cost and USD price for a Simulatte study before running it. Calculated locally — no API call needed. Credits = bucket_base + max(0, sample_size - 100), per pricing.yaml v3.",
  inputSchema: estimateCostSchema,
};

export function handleEstimateCost(input: EstimateCostInput): CostEstimate {
  const { sku, sample_size = 50, max_turns = 12 } = input;

  let credits: number;
  if (sku === "depth-interview") {
    // depth interviews are billed per-interview action (pulse bucket),
    // scaled by conversation turns rather than persona count.
    const base = BUCKET_BASE_CREDITS[SKU_BUCKET[sku as StudySku]];
    credits = Math.ceil(base * (max_turns / 12));
  } else {
    credits = computeStudyCredits(sku as StudySku, sample_size);
  }

  const usd_estimate = Math.round(credits * USD_PER_CREDIT * 100) / 100;

  return { credits, usd_estimate };
}
