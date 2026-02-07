import { streamText } from "ai";
import { getChatModel } from "../rag/ragService.js";
import { faqSystemPrompt, irrelevantMessagePrompt } from "./prompts.js";
import { routerAgent } from "./routerAgent.js";
import {
  serviceInformationSearchTool,
  checkApplicationStatusTool,
  downloadCertificateTool
} from "./tools.js";
import type { UIMessage } from "../lib/message.js";

export async function privateChatbotAgent(messages: UIMessage[], userId: string) {
  const { isRelevant } = await routerAgent(messages);
  const system = isRelevant ? faqSystemPrompt : irrelevantMessagePrompt;

  return streamText({
    model: getChatModel(),
    system,
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content ?? ""
    })),
    tools: {
      serviceInformationSearchTool,
      checkApplicationStatusTool,
      downloadCertificateTool: downloadCertificateTool.withOptions({
        execute: async ({ applicationNumber }) =>
          downloadCertificateTool.execute({ applicationNumber, userId })
      })
    },
    maxSteps: 5
  });
}
