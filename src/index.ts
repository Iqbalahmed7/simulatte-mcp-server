#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";

import { SimulatteClient } from "./client.js";

import { runStudyTool, runStudySchema, handleRunStudy } from "./tools/run-study.js";
import { getResultsTool, getResultsSchema, handleGetResults } from "./tools/get-results.js";
import { askInsightsTool, askInsightsSchema, handleAskInsights } from "./tools/ask-insights.js";
import { listPoolsTool, listPoolsSchema, handleListPools } from "./tools/list-pools.js";
import { createPoolTool, createPoolSchema, handleCreatePool } from "./tools/create-pool.js";
import { depthInterviewTool, depthInterviewSchema, handleDepthInterview } from "./tools/depth-interview.js";
import { estimateCostTool, estimateCostSchema, handleEstimateCost } from "./tools/estimate-cost.js";

const client = new SimulatteClient();

const server = new Server(
  { name: "simulatte-mcp-server", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// Convert Zod schemas to JSON Schema for MCP tool registration
const tools = [
  {
    name: runStudyTool.name,
    description: runStudyTool.description,
    inputSchema: zodToJsonSchema(runStudySchema),
  },
  {
    name: getResultsTool.name,
    description: getResultsTool.description,
    inputSchema: zodToJsonSchema(getResultsSchema),
  },
  {
    name: askInsightsTool.name,
    description: askInsightsTool.description,
    inputSchema: zodToJsonSchema(askInsightsSchema),
  },
  {
    name: listPoolsTool.name,
    description: listPoolsTool.description,
    inputSchema: zodToJsonSchema(listPoolsSchema),
  },
  {
    name: createPoolTool.name,
    description: createPoolTool.description,
    inputSchema: zodToJsonSchema(createPoolSchema),
  },
  {
    name: depthInterviewTool.name,
    description: depthInterviewTool.description,
    inputSchema: zodToJsonSchema(depthInterviewSchema),
  },
  {
    name: estimateCostTool.name,
    description: estimateCostTool.description,
    inputSchema: zodToJsonSchema(estimateCostSchema),
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "simulatte_run_study": {
        const input = runStudySchema.parse(args);
        result = await handleRunStudy(client, input);
        break;
      }
      case "simulatte_get_results": {
        const input = getResultsSchema.parse(args);
        result = await handleGetResults(client, input);
        break;
      }
      case "simulatte_ask_insights": {
        const input = askInsightsSchema.parse(args);
        result = await handleAskInsights(client, input);
        break;
      }
      case "simulatte_list_pools": {
        const input = listPoolsSchema.parse(args);
        result = await handleListPools(client, input);
        break;
      }
      case "simulatte_create_pool": {
        const input = createPoolSchema.parse(args);
        result = await handleCreatePool(client, input);
        break;
      }
      case "simulatte_depth_interview": {
        const input = depthInterviewSchema.parse(args);
        result = await handleDepthInterview(client, input);
        break;
      }
      case "simulatte_estimate_cost": {
        const input = estimateCostSchema.parse(args);
        result = handleEstimateCost(input);
        break;
      }
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP servers communicate over stdio — logging goes to stderr only
  process.stderr.write("Simulatte MCP server running on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
