// Shared TypeScript types for the Simulatte MCP server

export type StudySku =
  | "concept-viability"
  | "claim-credibility"
  | "brand-identity-test"
  | "message-resonance"
  | "price-sensitivity"
  | "feature-priority"
  // "ad-copy" removed 2026-06-09 — ACT deprecated; use message-resonance or email-subject-test
  // | "email-subject-test"  // EST deferred to Phase 2 — founder 2026-06-09
  | "b2b-committee"
  | "conjoint"
  | "iris-pulse"
  | "card-sort"
  | "open-end"
  | "ab-backlog"
  // "polarization-stress-test" folded into PreFlight v2 — task #210 PST-FOLD-001 (2026-06-11).
  // Disabled from MCP surface; results page on console retained for historical studies.
  | "name-test"
  | "founder-positioning"
  | "ad-concept-resonance"
  | "depth-interview"
  // "custom-study" REMOVED 2026-07-05 — never live; use synthetic-survey instead
  | "iat"
  | "counterfactual-positioning"
  | "personalization-sensitivity"
  | "regulated-claim-preflight"
  | "volume-forecast"
  | "brand-tracker"
  | "creative-audit";

export interface RunStudyResponse {
  study_id: string;
  status: string;
  eta_seconds: number;
}

export interface StudyResultsResponse {
  study_id: string;
  status: string;
  results: Record<string, unknown>;
}

export interface InsightsResponse {
  answer: string;
  themes: string[];
  citations: Array<{
    study_id: string;
    excerpt: string;
  }>;
}

export interface Pool {
  pool_id: string;
  name: string;
  market: string;
  size: number;
  created_at: string;
  [key: string]: unknown;
}

export interface CreatePoolResponse {
  pool_id: string;
  status: string;
}

export interface DepthInterviewResponse {
  interview_id: string;
  status: string;
  credits_estimate: number;
}

export interface CostEstimate {
  credits: number;
  usd_estimate: number;
}

// -----------------------------------------------------------------------------
// Bucket-based credit pricing — mirrors SIMULATTE CORE/pricing.yaml sku_buckets.
// Formula: total_credits = base_credits + max(0, sample_size - 100)
// (Bucket base is the floor for n<=100; +1 credit per additional persona.)
// This replaces the pre-v3 flat SKU_CREDIT_COSTS table, which encoded
// tiny per-persona rates that diverged from the executor's bucket-based
// debit path and caused BUG-MR-PRICING-DRIFT-001.
// -----------------------------------------------------------------------------

export type Bucket = "pulse" | "light" | "standard" | "premium" | "heavy" | "heavy_vision" | "strategic";

export const BUCKET_BASE_CREDITS: Record<Bucket, number> = {
  pulse: 2000,
  light: 3500,
  standard: 5000,
  premium: 8000,
  heavy: 15000,
  heavy_vision: 18000,      // Decision #50 — vision-LLM surcharge bucket
  strategic: 30000,
};

export const SKU_BUCKET: Record<StudySku, Bucket> = {
  // pulse
  "open-end": "pulse",
  "name-test": "pulse",
  "card-sort": "pulse",
  "depth-interview": "pulse",
  // light
  "concept-viability": "light",
  "message-resonance": "light",
  "feature-priority": "light",
  "claim-credibility": "light",
  // standard
  "ad-concept-resonance": "standard",
  "founder-positioning": "standard",
  "ab-backlog": "standard",
  "counterfactual-positioning": "standard",
  // premium
  "iat": "premium",
  "price-sensitivity": "premium",
  "b2b-committee": "premium",
  "personalization-sensitivity": "premium",
  // heavy
  "creative-audit": "heavy",
  "conjoint": "heavy",
  "volume-forecast": "heavy",
  "regulated-claim-preflight": "heavy",
  // heavy_vision (Decision #50 — vision LLM surcharge)
  "brand-identity-test": "heavy_vision",
  // strategic
  "brand-tracker": "strategic",
  "iris-pulse": "strategic",
};

/**
 * Compute total credits for a study run per pricing.yaml v3 bucket formula.
 * base_credits + max(0, sample_size - 100). No scaling below n=100.
 * For depth-interview (per-interview action billing), callers scale by turns.
 */
export function computeStudyCredits(sku: StudySku, sampleSize: number): number {
  const base = BUCKET_BASE_CREDITS[SKU_BUCKET[sku]];
  return base + Math.max(0, sampleSize - 100);
}

export const USD_PER_CREDIT = 0.012;
