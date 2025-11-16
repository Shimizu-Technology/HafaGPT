#!/bin/bash

# Inspect RAG database - see what we have and how it's prioritized

echo "📊 RAG Database Inspector"
echo "======================================="
echo ""

cd "$(dirname "$0")/.."

uv run python src/utils/inspect_rag_db.py "$@"

