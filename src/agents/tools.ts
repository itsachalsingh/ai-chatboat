import { tool } from "ai";
import { z } from "zod";
import { env } from "../env.js";
import { queryWithContext, retrieveChunks } from "../rag/ragService.js";
import { buildPayNowUrl, formatRupeesFromPaise, getPublicBillingById } from "../lib/publicBilling.js";

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

const consumerCodeLast7Schema = z.object({
  consumerCodeLast7: z.string().regex(/^[0-9]{7}$/, "consumerCodeLast7 must be exactly 7 digits")
});

export const fetchPublicBillByConsumerCodeLast7Tool = tool({
  description:
    "Fetch latest bill details (amount/status/due date) using the last 7 digits of the consumer/connection code and provide a Pay Now URL.",
  inputSchema: consumerCodeLast7Schema,
  execute: async ({ consumerCodeLast7 }) => {
    if (!env.UTTARAJAL_PUBLIC_API_SECRET) {
      return {
        ok: false,
        code: "MISSING_PUBLIC_API_SECRET",
        message: "Server is not configured for public billing lookup."
      };
    }

    const result = await getPublicBillingById(consumerCodeLast7);
    if (!result.ok) {
      return result;
    }

    const paise = result.data.bill?.amount ?? 0;
    const status = (result.data.bill?.status ?? "").toLowerCase();

    return {
      ok: true,
      consumerCodeLast7,
      status: result.data.bill?.status ?? "unknown",
      billNumber: result.data.bill?.billNumber ?? "",
      dueDate: result.data.bill?.dueDate ?? "",
      amountPaise: paise,
      amountRupeesFormatted: formatRupeesFromPaise(paise),
      isPaid: status === "paid",
      payNowUrl: buildPayNowUrl(consumerCodeLast7)
    };
  }
});
