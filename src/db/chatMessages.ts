import { pool } from "./pool.js";
import type { RowDataPacket } from "mysql2";

export type ChatMessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export type ChatMessageRow = {
  id: string;
  sessionId: string;
  role: ChatMessageRole;
  contentParts: unknown;
  contentText: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
} & RowDataPacket;

export async function getChatMessagesBySessionId(sessionId: string) {
  const [rows] = await pool.query<ChatMessageRow[]>(
    "SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY createdAt ASC",
    [sessionId]
  );
  return rows;
}

export async function createChatMessage(input: {
  id: string;
  sessionId: string;
  role: ChatMessageRole;
  contentParts: unknown;
  contentText: string;
  userId: string | null;
}) {
  await pool.query(
    "INSERT INTO chat_messages (id, sessionId, role, contentParts, contentText, userId) VALUES (?, ?, ?, ?, ?, ?)",
    [
      input.id,
      input.sessionId,
      input.role,
      JSON.stringify(input.contentParts),
      input.contentText,
      input.userId
    ]
  );
}
