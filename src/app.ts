import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env.js";
import { registerPublicChatRoutes } from "./routes/publicChat.js";

export function buildApp() {
  const app = Fastify({
    logger: true
  });

  // Serve the frontend (if built) at /chatbot/.
  // Dev flow: run `npm run dev:frontend` (Vite) separately; this stays inert until `frontend/dist` exists.
  const frontendDistDir = path.join(process.cwd(), "frontend", "dist");
  if (fs.existsSync(frontendDistDir)) {
    app.register(async (chatbotUi) => {
      await chatbotUi.register(fastifyStatic, {
        root: frontendDistDir
      });

      // SPA fallback (but never for /chatbot/api/*).
      chatbotUi.setNotFoundHandler(async (request, reply) => {
        if (request.raw.url?.startsWith("/chatbot/api/")) return reply.callNotFound();
        return reply.sendFile("index.html");
      });
    }, { prefix: "/chatbot" });
  }

  app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });

  app.register(cookie);

  app.register(async (api) => {
    api.get("/health", async () => ({ ok: true }));
    await registerPublicChatRoutes(api);
  }, { prefix: "/chatbot/api" });

  return app;
}
