import { stepCountIs, streamText } from "ai";
import { getChatModel } from "../rag/ragService.js";
import { faqSystemPrompt, irrelevantMessagePrompt } from "./prompts.js";
import { routerAgent } from "./routerAgent.js";
import { serviceInformationSearchTool, checkApplicationStatusTool } from "./tools.js";
import type { UIMessage } from "../lib/message.js";
import type { StreamTextOnFinishCallback } from "ai";

type PublicChatTools = {
  serviceInformationSearchTool: typeof serviceInformationSearchTool;
  checkApplicationStatusTool: typeof checkApplicationStatusTool;
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
      content: message.content ?? ""
    })),
    tools: {
      serviceInformationSearchTool,
      checkApplicationStatusTool
    },
    stopWhen: stepCountIs(5),
    onFinish: options?.onFinish
  });
}
