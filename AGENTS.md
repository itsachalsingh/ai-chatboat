# Repo Agent Notes (ai-chatboat)

## Stack
- Runtime: Node.js (ESM)
- Language: TypeScript (`tsconfig.json` uses `moduleResolution: NodeNext`)
- Web: Fastify
- LLM: `ai` SDK with providers `@ai-sdk/google` and `@ai-sdk/openai`
- DB: MySQL (`mysql2/promise`)
- Vector DB: Qdrant (HTTP API)

## Quickstart
```bash
npm ci
npm run dev
```

Build and run production bundle:
```bash
npm run build
npm start
```

## API Surface
- Base prefix: `/chatbot/api`
- `GET /chatbot/api/health` -> `{ ok: true }`
- `GET /chatbot/api/public-chat` -> returns session messages, sets cookie on first visit
- `POST /chatbot/api/public-chat` -> streams assistant response

## Used By This Project
This service is used by the UWBS workspace at `f:/ITDA/Water`.

Repo link:
- `https://github.com/itsachalsingh/ai-chatboat`

Project knowledge base:
- FAQ dataset: `src/data/faq_dataset.json`
  - This is where user-facing steps (e.g., "Pay Bill", "Apply for New Connection") should be kept up to date.

Session cookie:
- `public-chat-session-id`

## Required Environment Variables
Loaded via `dotenv` (`src/env.ts` imports `dotenv/config`). Provide these in `.env` for local dev.

App:
- `NODE_ENV` (`development|test|production`, default: `development`)
- `PORT` (default: `3000`)
- `CORS_ORIGIN` (default: `*`)

MySQL:
- `DATABASE_HOST`
- `DATABASE_PORT` (default: `3306`)
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`

E-District integration:
- `UTTARAJAL_API_BASE_URL`

Public billing (Quick Payment lookup):
- `UTTARAJAL_PUBLIC_API_SECRET` (required to fetch bill amount for last-7 consumer code)
- `UTTARAJAL_PORTAL_BASE_URL` (optional override; defaults to `UTTARAJAL_API_BASE_URL`)
- `UTTARAJAL_PUBLIC_CLIENT_ID` (optional; defaults to a random UUID per server boot)

Qdrant:
- `QDRANT_URL` (e.g. `https://localhost:6333`)
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION_NAME`

Embeddings + chat:
- `EMBEDDING_DIMENSIONS`
- `LLM_PROVIDER` (`google|openai`, default: `google`)
- `LLM_MODEL`
- `EMBEDDING_PROVIDER` (`google|openai`, default: `google`)
- `EMBEDDING_MODEL`

Provider keys (depends on provider):
- `GOOGLE_GENERATIVE_AI_API_KEY` (required if using `LLM_PROVIDER=google` or `EMBEDDING_PROVIDER=google`)
- `OPENAI_API_KEY` (required if using `LLM_PROVIDER=openai` or `EMBEDDING_PROVIDER=openai`)

## External Dependencies
MySQL schema:
- Apply `src/db/migrations/001_init.sql` before running (creates `chat_sessions` and `chat_messages`).

Qdrant collection:
- `retrieveChunks()` queries Qdrant search endpoint and expects points with payload `{ text: string }`.

## Codebase Conventions
- Keep `.js` file extensions in TS import specifiers (NodeNext ESM style).
- `src/index.ts` is the runtime entrypoint used by `npm run dev`.
- Do not edit or rely on `node_modules/` content (treat as generated).

## Change Checklist
- Run `npm run build` after changes.
- If you touch env parsing (`src/env.ts`), update `.env.example` to match.
- If you change API routes, update this file and `README.md`.
