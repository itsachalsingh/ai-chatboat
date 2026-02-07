import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { env } from "./env.js";

export function buildApp() {
  const app = Fastify({
    logger: true
  });

  app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });

  app.register(cookie);

  app.register(async (api) => {
    api.get("/health", async () => ({ ok: true }));
  }, { prefix: "/chatbot/api" });

  return app;
}
