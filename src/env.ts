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
  UTTARAJAL_API_BASE_URL: z.string(),
  // Used for public billing (quick payment) endpoints.
  // This must match the portal's public API secret to sign requests.
  UTTARAJAL_PUBLIC_API_SECRET: z.string().optional(),
  // Optional override if billing APIs are hosted on a different base than UTTARAJAL_API_BASE_URL.
  UTTARAJAL_PORTAL_BASE_URL: z.string().optional(),
  // Optional client id header used by the portal to correlate/rate limit requests.
  UTTARAJAL_PUBLIC_CLIENT_ID: z.string().optional(),
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
