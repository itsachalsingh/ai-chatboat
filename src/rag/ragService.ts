import { embed, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { env } from "../env.js";

export type RetrievedChunk = {
  text: string;
  score: number;
};

export function getChatModel() {
  if (env.LLM_PROVIDER === "openai") {
    return openai(env.LLM_MODEL);
  }

  return google(env.LLM_MODEL);
}

function getEmbeddingModel() {
  if (env.EMBEDDING_PROVIDER === "openai") {
    return openai.embedding(env.EMBEDDING_MODEL, {
      dimensions: env.EMBEDDING_DIMENSIONS
    });
  }

  return google.embedding(env.EMBEDDING_MODEL, {
    dimensions: env.EMBEDDING_DIMENSIONS
  });
    return openai.embedding(env.EMBEDDING_MODEL);
  }

  return google.embedding(env.EMBEDDING_MODEL);
}

async function embedText(text: string) {
  const model = getEmbeddingModel();
  const { embedding } = await embed({
    model,
    value: text
    value: text,
    providerOptions: env.EMBEDDING_PROVIDER === "openai"
      ? { openai: { dimensions: env.EMBEDDING_DIMENSIONS } }
      : { google: { outputDimensionality: env.EMBEDDING_DIMENSIONS } }
  });
  return embedding;
}

async function extractServiceQuery(text: string) {
  const { text: extracted } = await generateText({
    model: getChatModel(),
    system: "Extract the key service name for retrieval. Return only the service name.",
    messages: [{ role: "user", content: text }]
  });
  return extracted.trim();
}

export async function retrieveChunks(query: string, language: "en" | "hi" = "en") {
  const searchQuery = language === "hi" ? await extractServiceQuery(query) : query;
  const vector = await embedText(searchQuery);

  const response = await fetch(`${env.QDRANT_URL}/collections/${env.QDRANT_COLLECTION_NAME}/points/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": env.QDRANT_API_KEY
    },
    body: JSON.stringify({
      vector,
      limit: 5,
      with_payload: true
    })
  });

  if (!response.ok) {
    throw new Error("Failed to query Qdrant");
  }

  const data = await response.json();
  const points = data.result ?? [];

  return points.map((point: { score: number; payload?: { text?: string } }) => ({
    text: point.payload?.text ?? "",
    score: point.score
  }));
}

export async function queryWithContext(query: string, chunks: RetrievedChunk[]) {
  const context = chunks.map((chunk) => `- ${chunk.text}`).join("\n");
  const { text } = await generateText({
    model: getChatModel(),
    system: "Answer using the provided context. If unsure, say you do not know.",
    messages: [
      {
        role: "user",
        content: `Question: ${query}\nContext:\n${context}`
      }
    ]
  });

  return text;
}
