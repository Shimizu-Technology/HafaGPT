"""Compatibility entry point for the governed website crawler.

Keep old shell commands working without a second implementation that can bypass
RAGDatabaseManager.add_governed_documents. This module performs no work on import.
"""

from pathlib import Path
import runpy
import sys


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    runpy.run_module("src.crawlers.crawl_website", run_name="__main__")
