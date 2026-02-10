import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: __dirname,
  // Served by Fastify under /chatbot/
  base: "/chatbot/",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Avoid CORS + make cookies work in dev by keeping a single origin.
    proxy: {
      "/chatbot/api": {
        // Backend PORT is usually defined in repo-root .env; load it here so the proxy matches.
        // You can override with VITE_API_ORIGIN (e.g. http://127.0.0.1:9000).
        target: (() => {
          dotenv.config({ path: path.join(__dirname, "..", ".env") });
          const origin =
            process.env.VITE_API_ORIGIN ??
            (process.env.VITE_API_PORT
              ? `http://127.0.0.1:${process.env.VITE_API_PORT}`
              : process.env.PORT
                ? `http://127.0.0.1:${process.env.PORT}`
                : "http://127.0.0.1:3000");
          return origin;
        })(),
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true
  }
});
