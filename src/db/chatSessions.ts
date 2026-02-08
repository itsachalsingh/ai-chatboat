import { pool } from "./pool.js";
import type { RowDataPacket } from "mysql2";

export type ChatSessionType = "PUBLIC" | "PRIVATE";
export type LanguagePreference = "ENGLISH" | "HINDI" | "MIXED";

export type ChatSessionRow = {
  id: string;
  type: ChatSessionType;
  languagePreference: LanguagePreference | null;
  userId: string | null;
  userMetadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};
} & RowDataPacket;

export async function getChatSessionById(id: string) {
  const [rows] = await pool.query<ChatSessionRow[]>(
    "SELECT * FROM chat_sessions WHERE id = ?",
    [id]
  );
  return rows[0] ?? null;
}

export async function createChatSession(input: {
  id: string;
  type: ChatSessionType;
  languagePreference: LanguagePreference | null;
  userId: string | null;
  userMetadata?: Record<string, unknown> | null;
}) {
  await pool.query(
    "INSERT INTO chat_sessions (id, type, languagePreference, userId, userMetadata) VALUES (?, ?, ?, ?, ?)",
    [
      input.id,
      input.type,
      input.languagePreference,
      input.userId,
      input.userMetadata ? JSON.stringify(input.userMetadata) : null
    ]
  );

  return getChatSessionById(input.id);
}
