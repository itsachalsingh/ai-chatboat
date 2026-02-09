# ai-chatboat

Fastify chatbot API with MySQL-backed sessions/messages and optional RAG via Qdrant, using the `ai` SDK.

## Local Dev
1. Install deps:
```bash
npm ci
```

2. Create env file:
- Copy `.env.example` to `.env` and fill in values.

3. Start dependencies (optional, recommended):
```bash
docker compose up -d
```

4. Run the server:
```bash
npm run dev
```

Server listens on `https://0.0.0.0:${PORT}` (default `3000`).

## Endpoints
All routes are under `/chatbot/api`.

- `GET /chatbot/api/health`
- `GET /chatbot/api/public-chat`
- `POST /chatbot/api/public-chat` (streams)

The API uses a cookie named `public-chat-session-id` to persist a public chat session.

## Database
The schema lives in `src/db/migrations/001_init.sql`.

If using docker compose MySQL:
```bash
docker exec -i ai-chatboat-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < src/db/migrations/001_init.sql
```

## Notes
- TypeScript output goes to `dist/` (`npm run build`).
- Providers are selected via `LLM_PROVIDER` and `EMBEDDING_PROVIDER` (`google` or `openai`).

