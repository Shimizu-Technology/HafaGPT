"""An unusable SENTRY_DSN disables Sentry with one log line instead of failing startup."""
import logging

import pytest
import sentry_sdk

from src.utils import sentry_config

VALID_DSN = "https://publickey@o1.ingest.sentry.io/1"


@pytest.fixture
def init_calls(monkeypatch):
    calls = []
    monkeypatch.setattr(sentry_sdk, "init", lambda **kwargs: calls.append(kwargs))
    return calls


@pytest.mark.parametrize("dsn,reason", [
    ("https://sentry.io/123", "Missing public key"),  # the production misconfiguration
    ("https://...@sentry.io/...", "Invalid project"),  # the .env.example placeholder
    ("not a dsn", "Unsupported scheme"),
    ("https://key@/1", None),
])
def test_invalid_dsn_disables_sentry_with_one_clear_log_line(monkeypatch, caplog, init_calls, dsn, reason):
    monkeypatch.setenv("SENTRY_DSN", dsn)
    with caplog.at_level(logging.INFO):
        assert sentry_config.init_sentry() is False
    assert init_calls == []
    assert len(caplog.records) == 1
    record = caplog.records[0]
    assert record.levelno == logging.WARNING
    assert "SENTRY_DSN is invalid" in record.getMessage() and "disabled" in record.getMessage()
    assert "https://<public_key>@<host>/<project_id>" in record.getMessage()
    if reason:
        assert reason in record.getMessage()


@pytest.mark.parametrize("dsn", [None, "", "   "])
def test_missing_or_blank_dsn_is_a_quiet_disable(monkeypatch, caplog, init_calls, dsn):
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    if dsn is not None:
        monkeypatch.setenv("SENTRY_DSN", dsn)
    with caplog.at_level(logging.INFO):
        assert sentry_config.init_sentry() is False
    assert init_calls == [] and len(caplog.records) == 1
    assert caplog.records[0].levelno == logging.INFO


def test_valid_dsn_initializes_sentry_and_a_bad_trace_rate_cannot_crash_startup(monkeypatch, init_calls):
    monkeypatch.setenv("SENTRY_DSN", f"  {VALID_DSN}  ")
    monkeypatch.setenv("SENTRY_TRACES_SAMPLE_RATE", "ten percent")
    assert sentry_config.init_sentry() is True
    assert init_calls[0]["dsn"] == VALID_DSN
    assert init_calls[0]["traces_sample_rate"] == 0.1


def test_trace_rate_is_kept_within_zero_and_one(monkeypatch):
    monkeypatch.setenv("SENTRY_TRACES_SAMPLE_RATE", "7")
    assert sentry_config._traces_sample_rate() == 1.0


def test_dsn_is_never_logged(monkeypatch, caplog, init_calls):
    monkeypatch.setenv("SENTRY_DSN", "https://secretkey@o1.ingest.sentry.io/")
    with caplog.at_level(logging.INFO):
        assert sentry_config.init_sentry() is False
    assert "secretkey" not in caplog.text
