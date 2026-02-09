import { z } from "zod";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import type { FastifyInstance } from "fastify";
import { createChatMessage, getChatMessagesBySessionId } from "../db/chatMessages.js";
import { createChatSession, getChatSessionById } from "../db/chatSessions.js";
import { extractTextFromUIMessage, UIMessage } from "../lib/message.js";
import { publicChatbotAgent } from "../agents/publicChatbotAgent.js";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().optional(),
  parts: z.array(z.object({
    type: z.literal("text"),
    text: z.string()
  })).optional()
});

const postBodySchema = z.object({
  messages: z.array(messageSchema)
});

const langSchema = z.enum(["en", "hi"]).optional();

function parseParts(contentParts: unknown) {
  if (typeof contentParts === "string") {
    return JSON.parse(contentParts) as UIMessage["parts"];
  }
  return contentParts as UIMessage["parts"];
}

function toUIMessage(row: { role: string; contentParts: unknown }) {
  const normalizedRole = row.role.toLowerCase();
  const role: UIMessage["role"] =
    normalizedRole === "user" || normalizedRole === "assistant" || normalizedRole === "system"
      ? normalizedRole
      : "user";

  return {
    role,
    parts: parseParts(row.contentParts)
  } satisfies UIMessage;
}

export async function registerPublicChatRoutes(app: FastifyInstance) {
  app.get("/public-chat", async (request, reply) => {
    const query = request.query as { lang?: string } | undefined;
    const lang = langSchema.safeParse(query?.lang);

    if (lang.success === false && query?.lang) {
      return reply.status(400).send({ error: "Invalid lang" });
    }

    const sessionId = request.cookies["public-chat-session-id"];
    let session = sessionId ? await getChatSessionById(sessionId) : null;

    if (!session) {
      const newSessionId = randomUUID();
      session = await createChatSession({
        id: newSessionId,
        type: "PUBLIC",
        languagePreference: null,
        userId: null
      });
      reply.setCookie("public-chat-session-id", newSessionId, { path: "/" });
    }

    const messages = await getChatMessagesBySessionId(session.id);
    return reply.send({ messages: messages.map(toUIMessage) });
  });

  app.post("/public-chat", async (request, reply) => {
    const query = request.query as { stream?: string } | undefined;
    const wantsJson =
      query?.stream === "0" ||
      query?.stream === "false" ||
      (typeof request.headers.accept === "string" && request.headers.accept.includes("application/json"));

    const body = postBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Invalid body" });
    }

    const sessionId = request.cookies["public-chat-session-id"];
    const lastMessage = body.data.messages[body.data.messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return reply.status(400).send({ error: "Last message must be from user" });
    }

    let session = sessionId ? await getChatSessionById(sessionId) : null;
    if (!session) {
      const newSessionId = randomUUID();
      session = await createChatSession({
        id: newSessionId,
        type: "PUBLIC",
        languagePreference: null,
        userId: null
      });
      reply.setCookie("public-chat-session-id", newSessionId, { path: "/" });
    }

    const contentText = extractTextFromUIMessage(lastMessage);
    await createChatMessage({
      id: randomUUID(),
      sessionId: session.id,
      role: "USER",
      contentParts: lastMessage.parts ?? [{ type: "text", text: contentText }],
      contentText,
      userId: null
    });

    const result = await publicChatbotAgent(body.data.messages as UIMessage[], {
      onFinish: async ({ text }) => {
        await createChatMessage({
          id: randomUUID(),
          sessionId: session.id,
          role: "ASSISTANT",
          contentParts: [{ type: "text", text }],
          contentText: text,
          userId: null
        });
      }
    });

    if (wantsJson) {
      const text = await result.text;
      return reply.send({ text });
    }

    const response = result.toUIMessageStreamResponse();
    reply.raw.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(reply.raw);
    } else {
      reply.raw.end();
    }
    return reply;
  });
}
