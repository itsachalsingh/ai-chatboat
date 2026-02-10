import { stepCountIs, streamText } from "ai";
import { getChatModel } from "../rag/ragService.js";
import { faqSystemPrompt, irrelevantMessagePrompt } from "./prompts.js";
import { routerAgent } from "./routerAgent.js";
import { serviceInformationSearchTool, checkApplicationStatusTool, fetchPublicBillByConsumerCodeLast7Tool } from "./tools.js";
import type { UIMessage } from "../lib/message.js";
import type { StreamTextOnFinishCallback } from "ai";
import { extractTextFromUIMessage } from "../lib/message.js";

type PublicChatTools = {
  serviceInformationSearchTool: typeof serviceInformationSearchTool;
  checkApplicationStatusTool: typeof checkApplicationStatusTool;
  fetchPublicBillByConsumerCodeLast7Tool: typeof fetchPublicBillByConsumerCodeLast7Tool;
};

export async function publicChatbotAgent(
  messages: UIMessage[],
  options?: { onFinish?: StreamTextOnFinishCallback<PublicChatTools> }
) {
  const { isRelevant } = await routerAgent(messages);
  const system = isRelevant ? faqSystemPrompt : irrelevantMessagePrompt;

  return streamText({
    model: getChatModel(),
    system,
    messages: messages.map((message) => ({
      role: message.role,
      content: extractTextFromUIMessage(message)
    })),
    tools: {
      serviceInformationSearchTool,
      checkApplicationStatusTool,
      fetchPublicBillByConsumerCodeLast7Tool
    },
    stopWhen: stepCountIs(5),
    onFinish: options?.onFinish
  });
}
