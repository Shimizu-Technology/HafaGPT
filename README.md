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

Credential-free system checks run in CI. Live database/RAG checks explicitly
skip unless `DATABASE_URL` and `OPENAI_API_KEY` are available; run them in a
protected staging workflow rather than storing production credentials in CI.

## 2026 review and roadmap

- [Project review](api/documentation/PROJECT_REVIEW_2026.md)
- [Language resource and corpus audit](api/documentation/LANGUAGE_RESOURCE_AUDIT_2026-08-07.md)
- [Language resource implementation program](api/documentation/LANGUAGE_RESOURCE_PROGRAM_2026.md)
- [Source permission and native-review playbook](api/documentation/SOURCE_PERMISSION_AND_REVIEW_PLAYBOOK.md)
- [Phase 1–2 execution record](api/documentation/PHASE_1_2_EXECUTION_2026-08-08.md)
- [Model evaluation method and status](api/documentation/MODEL_EVALUATION_2026.md)
- [Historical August 5 direct-reference benchmark](api/documentation/MODEL_BENCHMARK_RESULTS_2026-08-05.md)
- [Modernization roadmap](api/documentation/MODERNIZATION_ROADMAP_2026.md)
- [Validation evidence](api/documentation/VALIDATION_REPORT_2026-08-05.md)

## Deployment

- Netlify deploys `web/` using the root `netlify.toml`.
- Render deploys `api/` using the settings documented in `render.yaml`.
- Both production services deploy from `main`.
- Secrets remain in the provider dashboards and are never committed.

The original standalone repositories are retained as read-only migration
archives. This repository is the canonical source for all new work.
