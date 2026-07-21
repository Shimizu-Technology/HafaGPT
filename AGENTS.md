# HåfaGPT — AGENTS.md

## Product

HåfaGPT is a Chamorro language learning platform with AI tutoring, vocabulary,
stories, flashcards, quizzes, games, progress tracking, and administration.

## Architecture

- Monorepo: `api/` + `web/`
- API: Python 3.12, FastAPI, Alembic, PostgreSQL, Clerk
- Web: React 18, TypeScript, Vite, Tailwind
- Hosting: Render API + Netlify web

## Guardrails

- Treat Chamorro language content as accuracy-sensitive.
- Keep `api/audio_generation/manifest.json` and
  `web/public/audio_manifest.json` synchronized.
- Run `./scripts/check.sh` for repository-wide changes.
- Never commit credentials, user data, production exports, crawl logs, or
  generated audio files.
- Keep provider secrets in Render, Netlify, Clerk, S3, and the relevant AI
  service dashboards.
- Preserve the independent deployability of `api/` and `web/`.
