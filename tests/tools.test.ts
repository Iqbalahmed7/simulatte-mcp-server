import { describe, it, expect, vi } from "vitest";
import { runStudySchema } from "../src/tools/run-study.js";
import { getResultsSchema } from "../src/tools/get-results.js";
import { askInsightsSchema } from "../src/tools/ask-insights.js";
import { listPoolsSchema } from "../src/tools/list-pools.js";
import { createPoolSchema } from "../src/tools/create-pool.js";
import { depthInterviewSchema } from "../src/tools/depth-interview.js";
import { estimateCostSchema, handleEstimateCost } from "../src/tools/estimate-cost.js";

// ── simulatte_run_study ─────────────────────────────────────────────────────

describe("runStudySchema", () => {
  it("accepts valid input with required fields only", () => {
    const result = runStudySchema.safeParse({
      sku: "concept-viability",
      inputs: { concept: "A sleep coaching app for parents" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with all optional fields", () => {
    const result = runStudySchema.safeParse({
      sku: "price-sensitivity",
      inputs: { product: "Premium plan" },
      persona_pool_id: "pool_abc123",
      sample_size: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown SKU", () => {
    const result = runStudySchema.safeParse({
      sku: "fake-sku",
      inputs: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects sample_size above 500", () => {
    const result = runStudySchema.safeParse({
      sku: "concept-viability",
      inputs: {},
      sample_size: 501,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing inputs field", () => {
    const result = runStudySchema.safeParse({ sku: "concept-viability" });
    expect(result.success).toBe(false);
  });

  it("accepts every SKU that has a price (SKU_BUCKET)", async () => {
    const { SKU_BUCKET } = await import("../src/types.js");
    const skus = Object.keys(SKU_BUCKET);
    expect(skus.length).toBeGreaterThan(15);
    for (const sku of skus) {
      expect(runStudySchema.safeParse({ sku, inputs: {} }).success, `SKU ${sku} should be valid`).toBe(true);
    }
  });
});

// ── simulatte_get_results ───────────────────────────────────────────────────

describe("getResultsSchema", () => {
  it("accepts valid study_id", () => {
    expect(getResultsSchema.safeParse({ study_id: "study_abc123" }).success).toBe(true);
  });

  it("rejects missing study_id", () => {
    expect(getResultsSchema.safeParse({}).success).toBe(false);
  });
});

// ── simulatte_ask_insights ──────────────────────────────────────────────────

describe("askInsightsSchema", () => {
  it("accepts valid query", () => {
    expect(
      askInsightsSchema.safeParse({ query: "What do parents think about sleep apps?" }).success
    ).toBe(true);
  });

  it("accepts query with top_k", () => {
    expect(
      askInsightsSchema.safeParse({ query: "pricing reactions", top_k: 10 }).success
    ).toBe(true);
  });

  it("rejects empty query", () => {
    expect(askInsightsSchema.safeParse({ query: "" }).success).toBe(false);
  });

  it("rejects top_k above 20", () => {
    expect(askInsightsSchema.safeParse({ query: "test", top_k: 21 }).success).toBe(false);
  });

  it("rejects missing query", () => {
    expect(askInsightsSchema.safeParse({}).success).toBe(false);
  });
});

// ── simulatte_list_pools ────────────────────────────────────────────────────

describe("listPoolsSchema", () => {
  it("accepts empty object", () => {
    expect(listPoolsSchema.safeParse({}).success).toBe(true);
  });
});

// ── simulatte_create_pool ───────────────────────────────────────────────────

describe("createPoolSchema", () => {
  it("accepts valid pool spec", () => {
    const result = createPoolSchema.safeParse({
      name: "US Millennial Parents",
      market: "United States",
      size: 200,
      pool_spec: { age_range: [28, 42], has_children: true },
    });
    expect(result.success).toBe(true);
  });

  it("rejects size below 10", () => {
    const result = createPoolSchema.safeParse({
      name: "Tiny Pool",
      market: "US",
      size: 5,
      pool_spec: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects size above 10000", () => {
    const result = createPoolSchema.safeParse({
      name: "Huge Pool",
      market: "US",
      size: 10001,
      pool_spec: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(createPoolSchema.safeParse({ name: "Test" }).success).toBe(false);
  });
});

// ── simulatte_depth_interview ───────────────────────────────────────────────

describe("depthInterviewSchema", () => {
  it("accepts minimal valid input", () => {
    const result = depthInterviewSchema.safeParse({
      goal: "Understand sleep coaching barriers",
      product_context: "A 12-week AI sleep coach for parents of toddlers",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all fields", () => {
    const result = depthInterviewSchema.safeParse({
      persona_id: "p_abc123",
      persona_pool_id: "pool_xyz",
      goal: "Test brand messaging",
      product_context: "A premium app",
      max_turns: 20,
    });
    expect(result.success).toBe(true);
  });

  it("rejects max_turns above 30", () => {
    const result = depthInterviewSchema.safeParse({
      goal: "Test",
      product_context: "App",
      max_turns: 31,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing goal", () => {
    expect(depthInterviewSchema.safeParse({ product_context: "App" }).success).toBe(false);
  });
});

// ── simulatte_estimate_cost ─────────────────────────────────────────────────

describe("estimateCostSchema + handleEstimateCost", () => {
  it("accepts valid sku and sample_size", () => {
    expect(estimateCostSchema.safeParse({ sku: "concept-viability", sample_size: 50 }).success).toBe(true);
  });

  it("rejects unknown SKU", () => {
    expect(estimateCostSchema.safeParse({ sku: "invalid-sku" }).success).toBe(false);
  });

  // pricing.yaml bucket formula (unchanged in v4.0.0): base + max(0, n - 100); USD at the v4 Try-pack rate $0.030.
  it("concept-viability (light bucket, n=50) = 3,500 credits, $105 at the v4 list rate", () => {
    const result = handleEstimateCost({ sku: "concept-viability", sample_size: 50 });
    expect(result.credits).toBe(3500);
    expect(result.usd_estimate).toBeCloseTo(105.0, 2);
  });

  it("b2b-committee (premium bucket, n=20) = 8,000 credits, $240", () => {
    const result = handleEstimateCost({ sku: "b2b-committee", sample_size: 20 });
    expect(result.credits).toBe(8000);
    expect(result.usd_estimate).toBeCloseTo(240.0, 2);
  });

  it("scales +1 credit per persona above n=100", () => {
    expect(handleEstimateCost({ sku: "concept-viability", sample_size: 250 }).credits).toBe(3650);
  });

  it("uses default sample_size of 50 when not provided", () => {
    const result = handleEstimateCost({ sku: "claim-credibility" });
    expect(result.credits).toBe(3500);
  });

  it("handles depth-interview credits with max_turns scaling", () => {
    const result = handleEstimateCost({ sku: "depth-interview", max_turns: 12 });
    expect(result.credits).toBe(2000); // pulse base × (12/12)
    expect(result.usd_estimate).toBeCloseTo(60.0, 2);
  });

  it("depth-interview with 24 turns doubles cost", () => {
    const result = handleEstimateCost({ sku: "depth-interview", max_turns: 24 });
    expect(result.credits).toBe(4000);
  });

  it("carries the v4.0.0 public pricing constants", async () => {
    const t = await import("../src/types.js");
    expect(t.PRICING_VERSION).toBe("4.0.0");
    expect(t.USD_PER_CREDIT).toBe(0.03);
    expect(t.STARTER_CREDITS).toBe(4000);
    expect(t.CREDIT_PACKS.map((p) => [p.credits, p.price_usd])).toEqual([[5000, 150], [25000, 625], [100000, 2000]]);
    expect(t.VOLUME_FLOOR_PER_CREDIT).toBe(0.015);
    expect(t.INTERVIEW_TIER_CREDITS).toEqual({ quick_15: 300, standard_30: 500, deep_45: 800 });
  });
});
