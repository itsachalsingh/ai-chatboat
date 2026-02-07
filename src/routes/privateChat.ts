import { z } from "zod";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import type { FastifyInstance } from "fastify";
import { createChatMessage, getChatMessagesBySessionId } from "../db/chatMessages.js";
import { createChatSession, getChatSessionById, getChatSessionByTypeAndUser } from "../db/chatSessions.js";
import { extractTextFromUIMessage, UIMessage } from "../lib/message.js";
import { privateChatbotAgent } from "../agents/privateChatbotAgent.js";

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

const querySchema = z.object({
  userId: z.string().min(1),
  lang: z.enum(["en", "hi"])
});

function parseParts(contentParts: unknown) {
  if (typeof contentParts === "string") {
    return JSON.parse(contentParts) as UIMessage["parts"];
  }
  return contentParts as UIMessage["parts"];
}

function toUIMessage(row: { role: string; contentParts: unknown }) {
  return {
    role: row.role.toLowerCase(),
    parts: parseParts(row.contentParts)
  } satisfies UIMessage;
}

export async function registerPrivateChatRoutes(app: FastifyInstance) {
  app.get("/private-chat", async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }

    const sessionId = request.cookies["private-chat-session-id"];
    let session = sessionId ? await getChatSessionById(sessionId) : null;

    if (!session) {
      session = await getChatSessionByTypeAndUser("PRIVATE", query.data.userId);
    }

    if (!session) {
      const newSessionId = randomUUID();
      session = await createChatSession({
        id: newSessionId,
        type: "PRIVATE",
        languagePreference: query.data.lang === "hi" ? "HINDI" : "ENGLISH",
        userId: query.data.userId
      });
      reply.setCookie("private-chat-session-id", newSessionId, { path: "/" });
    }

    const messages = await getChatMessagesBySessionId(session.id);
    return reply.send({ messages: messages.map(toUIMessage) });
  });

  app.post("/private-chat", async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }

    const body = postBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Invalid body" });
    }

    const lastMessage = body.data.messages[body.data.messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return reply.status(400).send({ error: "Last message must be from user" });
    }

    const sessionId = request.cookies["private-chat-session-id"];
    let session = sessionId ? await getChatSessionById(sessionId) : null;

    if (!session) {
      session = await getChatSessionByTypeAndUser("PRIVATE", query.data.userId);
    }

    if (!session) {
      const newSessionId = randomUUID();
      session = await createChatSession({
        id: newSessionId,
        type: "PRIVATE",
        languagePreference: query.data.lang === "hi" ? "HINDI" : "ENGLISH",
        userId: query.data.userId
      });
      reply.setCookie("private-chat-session-id", newSessionId, { path: "/" });
    }

    const contentText = extractTextFromUIMessage(lastMessage);
    await createChatMessage({
      id: randomUUID(),
      sessionId: session.id,
      role: "USER",
      contentParts: lastMessage.parts ?? [{ type: "text", text: contentText }],
      contentText,
      userId: query.data.userId
    });

    const result = await privateChatbotAgent(body.data.messages as UIMessage[], query.data.userId);

    result.onFinish(async ({ text }) => {
      await createChatMessage({
        id: randomUUID(),
        sessionId: session.id,
        role: "ASSISTANT",
        contentParts: [{ type: "text", text }],
        contentText: text,
        userId: query.data.userId
      });
    });

    const response = result.toDataStreamResponse();
    reply.raw.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) {
      Readable.fromWeb(response.body).pipe(reply.raw);
    } else {
      reply.raw.end();
    }
    return reply;
  });
}
