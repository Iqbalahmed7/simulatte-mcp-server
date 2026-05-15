import { z } from "zod";
import { SimulatteClient } from "../client.js";
import type { DepthInterviewResponse } from "../types.js";

export const depthInterviewSchema = z.object({
  persona_id: z
    .string()
    .optional()
    .describe("ID of a specific synthetic persona to interview"),
  persona_pool_id: z
    .string()
    .optional()
    .describe("ID of a persona pool to draw a random participant from"),
  goal: z
    .string()
    .min(1)
    .describe(
      "Research goal for the interview (e.g. 'Understand barriers to adoption for a sleep coaching app')"
    ),
  product_context: z
    .string()
    .describe(
      "Description of the product or concept being explored in the interview"
    ),
  max_turns: z
    .number()
    .int()
    .min(2)
    .max(30)
    .optional()
    .describe("Maximum number of interview turns (default: 12)"),
});

export type DepthInterviewInput = z.infer<typeof depthInterviewSchema>;

export const depthInterviewTool = {
  name: "simulatte_depth_interview",
  description:
    "Run a simulated depth interview with a synthetic persona. The persona responds in character across multiple turns, surfacing motivations, objections, and language naturally. Returns interview_id and a credits estimate.",
  inputSchema: depthInterviewSchema,
};

export async function handleDepthInterview(
  client: SimulatteClient,
  input: DepthInterviewInput
): Promise<DepthInterviewResponse> {
  return client.post<DepthInterviewResponse>("/v1/forge/depth-interview", input);
}
