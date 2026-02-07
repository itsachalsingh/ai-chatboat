import { generateText } from "ai";
import { z } from "zod";
import { getChatModel } from "../rag/ragService.js";
import { routerPrompt } from "./prompts.js";
import type { UIMessage } from "../lib/message.js";
import { extractTextFromUIMessage } from "../lib/message.js";

const routerSchema = z.object({
  isRelevant: z.boolean()
});

export async function routerAgent(messages: UIMessage[]) {
  const model = getChatModel();
  const lastMessage = messages[messages.length - 1];
  const textToClassify = lastMessage ? extractTextFromUIMessage(lastMessage) : "";
  const { text } = await generateText({
    model,
    system: routerPrompt,
    messages: [
      {
        role: "user",
        content: textToClassify
      }
    ]
  });

  try {
    const parsed = routerSchema.safeParse(JSON.parse(text));
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    return { isRelevant: true };
  }

  return { isRelevant: true };
}
