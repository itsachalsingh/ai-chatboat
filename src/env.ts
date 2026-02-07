import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default("*"),
  DATABASE_HOST: z.string(),
  DATABASE_PORT: z.coerce.number().default(3306),
  DATABASE_USER: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_NAME: z.string(),
  E_DISTRICT_API_BASE_URL: z.string(),
  QDRANT_URL: z.string(),
  QDRANT_API_KEY: z.string(),
  QDRANT_COLLECTION_NAME: z.string(),
  EMBEDDING_DIMENSIONS: z.coerce.number(),
  LLM_PROVIDER: z.enum(["google", "openai"]).default("google"),
  LLM_MODEL: z.string(),
  EMBEDDING_PROVIDER: z.enum(["google", "openai"]).default("google"),
  EMBEDDING_MODEL: z.string(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
