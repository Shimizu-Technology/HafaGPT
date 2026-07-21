# HåfaGPT

HåfaGPT is an AI-powered Chamorro language learning platform. This repository
contains the complete product: the FastAPI service, React web application,
language-content tooling, and deployment configuration.

**Production:** [hafagpt.com](https://hafagpt.com) ·
**API:** [hafagpt-api.onrender.com](https://hafagpt-api.onrender.com)

## Repository structure

```text
.
├── api/       # FastAPI, RAG, database migrations, crawlers, and evaluations
├── web/       # React, TypeScript, Vite, PWA, and learner/admin interfaces
├── scripts/   # Repository-wide development and verification commands
└── .github/   # CI for both applications
```

The applications have independent dependency systems:

- API: Python 3.12, FastAPI, Alembic, PostgreSQL
- Web: Node.js 20, npm, React, TypeScript, Vite

No JavaScript monorepo framework is required.

## Local setup

```bash
git clone https://github.com/Shimizu-Technology/HafaGPT.git
cd HafaGPT

cp api/.env.example api/.env
cp web/.env.example web/.env.local

python3.12 -m venv api/.venv
api/.venv/bin/python -m pip install -r api/requirements.txt pytest
cd web && npm ci && cd ..

./scripts/dev.sh
```

The web app runs at `http://localhost:5173`; the API runs at
`http://localhost:8000`.

For credential setup and onboarding details, see
[api/documentation/SETUP_GUIDE.md](api/documentation/SETUP_GUIDE.md).

## Verification

```bash
./scripts/check.sh
```

The repository-wide check runs backend tests, canonical language-content
validation, static-audio synchronization checks, frontend linting, TypeScript
validation, and a production frontend build.

`api/tests/test_system.py` is an opt-in production smoke suite because it
connects to live database, RAG, and web-search services; it is not run by CI.

## Deployment

- Netlify deploys `web/` using the root `netlify.toml`.
- Render deploys `api/` using the settings documented in `render.yaml`.
- Both production services deploy from `main`.
- Secrets remain in the provider dashboards and are never committed.

The original standalone repositories are retained as read-only migration
archives. This repository is the canonical source for all new work.
