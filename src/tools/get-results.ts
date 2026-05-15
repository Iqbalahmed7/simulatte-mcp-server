import { z } from "zod";
import { SimulatteClient } from "../client.js";
import type { StudyResultsResponse } from "../types.js";

export const getResultsSchema = z.object({
  study_id: z.string().describe("Study ID returned from simulatte_run_study"),
});

export type GetResultsInput = z.infer<typeof getResultsSchema>;

export const getResultsTool = {
  name: "simulatte_get_results",
  description:
    "Retrieve results for a completed Simulatte study. Returns full structured results JSON including verdicts, key drivers, objections, persona breakdowns, and Forge Loop recommendations.",
  inputSchema: getResultsSchema,
};

export async function handleGetResults(
  client: SimulatteClient,
  input: GetResultsInput
): Promise<StudyResultsResponse> {
  return client.get<StudyResultsResponse>(`/v1/studies/${input.study_id}/results`);
}
