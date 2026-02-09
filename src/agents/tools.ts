import { tool } from "ai";
import { z } from "zod";
import { env } from "../env.js";
import { queryWithContext, retrieveChunks } from "../rag/ragService.js";

export const serviceInformationSearchTool = tool({
  description: "Search service information using RAG over the service knowledge base.",
  inputSchema: z.object({
    query: z.string()
  }),
  execute: async ({ query }) => {
    const chunks = await retrieveChunks(query);
    const answer = await queryWithContext(query, chunks);
    return { chunks, answer };
  }
});

const applicationStatusSchema = z.object({
  applicationNumber: z.string().min(1)
});

const statusResponseSchema = z
  .object({
    status: z.string(),
    applicationNumber: z.string()
  })
  .passthrough();

export const checkApplicationStatusTool = tool({
  description: "Check application status for a given application number.",
  inputSchema: applicationStatusSchema,
  execute: async ({ applicationNumber }) => {
    const response = await fetch(`${env.UTTARAJAL_API_BASE_URL}/forms/status/${applicationNumber}`);

    if (!response.ok) {
      throw new Error("Failed to fetch application status");
    }

    const data = await response.json();
    return statusResponseSchema.parse(data);
  }
});
