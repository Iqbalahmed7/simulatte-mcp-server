import { z } from "zod";
import { SimulatteClient } from "../client.js";
import type { InsightsResponse } from "../types.js";

export const askInsightsSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      "Natural-language question to ask across your Simulatte study history (e.g. 'What do skeptical parents think about sleep coaching?')"
    ),
  top_k: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Number of studies to draw citations from (default: 5)"),
});

export type AskInsightsInput = z.infer<typeof askInsightsSchema>;

export const askInsightsTool = {
  name: "simulatte_ask_insights",
  description:
    "Ask a question across your entire Simulatte research history using semantic search. Returns a cited answer with themes and source study references. Great for synthesizing findings across multiple studies.",
  inputSchema: askInsightsSchema,
};

export async function handleAskInsights(
  client: SimulatteClient,
  input: AskInsightsInput
): Promise<InsightsResponse> {
  const body: Record<string, unknown> = { query: input.query };
  if (input.top_k !== undefined) body.top_k = input.top_k;
  return client.post<InsightsResponse>("/v1/insights/ask", body);
}
