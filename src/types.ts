// Shared TypeScript types for the Simulatte MCP server

export type StudySku =
  | "concept-viability"
  | "claim-credibility"
  | "brand-identity-test"
  | "message-resonance"
  | "price-sensitivity"
  | "feature-priority"
  | "ad-copy"
  | "b2b-committee"
  | "conjoint"
  | "iris-pulse"
  | "card-sort"
  | "open-end"
  | "ab-backlog"
  | "polarization-stress-test"
  | "name-test"
  | "founder-positioning"
  | "ad-concept-resonance"
  | "depth-interview"
  | "custom-study"
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

// Credit cost table by SKU
export const SKU_CREDIT_COSTS: Record<StudySku, number> = {
  "concept-viability": 3,
  "claim-credibility": 2,
  "brand-identity-test": 4,
  "message-resonance": 2,
  "price-sensitivity": 3,
  "feature-priority": 3,
  "ad-copy": 2,
  "b2b-committee": 5,
  "conjoint": 5,
  "iris-pulse": 2,
  "card-sort": 3,
  "open-end": 1,
  "ab-backlog": 2,
  "polarization-stress-test": 4,
  "name-test": 2,
  "founder-positioning": 3,
  "ad-concept-resonance": 3,
  "depth-interview": 8,
  "custom-study": 5,
  "iat": 4,
  "counterfactual-positioning": 3,
  "personalization-sensitivity": 3,
  "regulated-claim-preflight": 5,
  "volume-forecast": 6,
  "brand-tracker": 4,
  "creative-audit": 4,
};

export const USD_PER_CREDIT = 0.012;
