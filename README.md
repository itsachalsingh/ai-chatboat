# ai-chatboat

Fastify chatbot API with MySQL-backed sessions/messages and optional RAG via Qdrant, using the `ai` SDK.

## Used By This Project
This service is part of the `f:/ITDA/Water` workspace (UWBS). It provides the chatbot API under the base prefix `/chatbot/api`.

Repo link: `https://github.com/itsachalsingh/ai-chatboat`

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

## Frontend (Web UI)
The repo includes a simple web UI that talks to the existing API.

Dev:
1. Run the API:
```bash
npm run dev
```

2. In another terminal, run the frontend:
```bash
npm run dev:frontend
```

Open `http://localhost:5173/chatbot/`.

Production build:
```bash
npm run build:frontend
npm run build
npm start
```

Then open `http://localhost:${PORT}/chatbot/` (default `http://localhost:3000/chatbot/`).

## Database
The schema lives in `src/db/migrations/001_init.sql`.

If using docker compose MySQL:
```bash
docker exec -i ai-chatboat-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < src/db/migrations/001_init.sql
```

## Notes
- TypeScript output goes to `dist/` (`npm run build`).
- Providers are selected via `LLM_PROVIDER` and `EMBEDDING_PROVIDER` (`google` or `openai`).
- Project FAQs/flows (e.g., bill payment steps, new connection steps) live in `src/data/faq_dataset.json`.
- Quick Payment bill lookup (last-7 consumer code) requires `UTTARAJAL_PUBLIC_API_SECRET` in `.env`.
