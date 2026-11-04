"""Classify, hide, and alert on upstream AI provider failures.

A provider failure is never an answer. Callers show ``ProviderFailure.message``
to the learner, never store it, and never forward the provider's own text,
which can carry billing details or echo private input.

Alerts reuse Sentry (when ``SENTRY_DSN`` is valid) and fall back to one log
line otherwise. They are throttled per process: a credit failure alerts once
per cooldown, and other failures alert once per cooldown after a burst.
Alerts carry only the failure kind, HTTP status, source, model ID, and counts.
"""

import logging
import os
import re
import threading
import time
from collections import deque
from dataclasses import dataclass

logger = logging.getLogger(__name__)

PROVIDER_RETRY_MESSAGE = "HåfaGPT couldn't answer just now. Please try again in a moment."
PROVIDER_BUSY_MESSAGE = "HåfaGPT is busy right now. Please try again in a moment."
PROVIDER_INTERRUPTED_MESSAGE = "Connection interrupted while streaming. Please try again."

CREDIT_ERROR_PATTERNS = (
    "payment required",
    "insufficient credits",
    "more credits",
    "openrouter_credits",
    "payment_required",
)

DEFAULT_COOLDOWN_SECONDS = 1800
DEFAULT_BURST_THRESHOLD = 5
DEFAULT_BURST_WINDOW_SECONDS = 300


# Earlier versions stored failed turns as exactly f"[Error: {str(e)[:200]}]" or
# f"[Token limit exceeded: {tokens} tokens]" in bot_response. Existing rows are
# never rewritten; readers treat them as failed turns. A real answer can start
# with the same words, so the whole message has to match.
_STORED_FAILURE_MARKER = re.compile(r"\[Error: .{0,200}\]|\[Token limit exceeded: \d+ tokens\]", re.DOTALL)
STORED_FAILURE_PLACEHOLDER = "[Error: this reply could not be completed]"


def is_stored_failure_marker(text: str | None) -> bool:
    return bool(text) and bool(_STORED_FAILURE_MARKER.fullmatch(text.strip()))


class MalformedProviderResponse(RuntimeError):
    """The provider answered, but not with usable text."""


class TurnFailed(Exception):
    """A chat turn produced no answer; ``message`` is safe to show the learner."""

    def __init__(self, message: str, *, code: str = "provider_unavailable", status_code: int = 503):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


@dataclass(frozen=True)
class ProviderFailure:
    kind: str
    status: int | None
    message: str


def _status_code(error: BaseException) -> int | None:
    for candidate in (error, getattr(error, "response", None)):
        status = getattr(candidate, "status_code", None)
        if isinstance(status, int):
            return status
    return None


def safe_error_label(error: BaseException) -> str:
    """Name an exception for logs without its text, which can echo the prompt."""
    status = _status_code(error)
    return f"{type(error).__name__} status={status}" if status else type(error).__name__


def is_credit_error(error: BaseException) -> bool:
    """True when an upstream provider rejects a request for billing."""
    if _status_code(error) == 402:
        return True
    text = str(error).lower()
    return any(pattern in text for pattern in CREDIT_ERROR_PATTERNS)


def classify_provider_error(error: BaseException) -> ProviderFailure:
    """Map any provider or transport exception to a kind and a safe message."""
    status = _status_code(error)
    names = " ".join(cls.__name__.lower() for cls in type(error).__mro__)
    text = str(error).lower()
    if is_credit_error(error):
        return ProviderFailure("credit", status or 402, PROVIDER_RETRY_MESSAGE)
    if status == 429 or "ratelimit" in names or "rate limit" in text:
        return ProviderFailure("rate_limit", status or 429, PROVIDER_BUSY_MESSAGE)
    if "timeout" in names or "timed out" in text:
        return ProviderFailure("timeout", status, PROVIDER_RETRY_MESSAGE)
    if isinstance(error, MalformedProviderResponse):
        return ProviderFailure("malformed", status, PROVIDER_RETRY_MESSAGE)
    if (status is not None and status >= 500) or "connection" in names:
        return ProviderFailure("server", status, PROVIDER_RETRY_MESSAGE)
    return ProviderFailure("other", status, PROVIDER_RETRY_MESSAGE)


def _env_int(name: str, default: int) -> int:
    try:
        return max(1, int(os.getenv(name, "")))
    except ValueError:
        return default


class _AlertState:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.recent: deque[tuple[float, str]] = deque()
        self.last_alert: dict[str, float] = {}


_state = _AlertState()


def reset_alert_state() -> None:
    """Forget throttle history (tests)."""
    with _state.lock:
        _state.recent.clear()
        _state.last_alert.clear()


def _due(alert_key: str, now: float, cooldown: int) -> bool:
    last = _state.last_alert.get(alert_key)
    if last is not None and now - last < cooldown:
        return False
    _state.last_alert[alert_key] = now
    return True


def _send_alert(alert_key: str, summary: str, details: dict[str, object]) -> None:
    """Send one alert with no request, user, or message data attached."""
    try:
        import sentry_sdk

        if sentry_sdk.get_client().is_active():
            # Fresh scopes drop the request body, user, and chat context that the
            # web integration attaches to whatever request is in flight.
            with sentry_sdk.isolation_scope() as isolation, sentry_sdk.new_scope() as scope:
                isolation.clear()
                scope.clear()
                # clear() keeps event processors, and the web integration's
                # processor re-attaches the request body and user at send time.
                scope.add_event_processor(
                    lambda event, hint: {k: v for k, v in event.items() if k not in ("request", "user")}
                )
                scope.fingerprint = ["provider-alert", alert_key]
                scope.set_level("error")
                scope.set_tag("provider_alert", alert_key)
                scope.set_context("provider_alert", details)
                sentry_sdk.capture_message(summary)
            logger.warning("PROVIDER_ALERT sent to Sentry: %s %s", summary, details)
            return
    except Exception as error:
        logger.warning("PROVIDER_ALERT Sentry delivery failed: %s", type(error).__name__)
    logger.error("PROVIDER_ALERT (Sentry disabled): %s %s", summary, details)


def report_provider_failure(
    error: BaseException, *, source: str, model: str | None = None,
) -> ProviderFailure:
    """Log a failure without provider text, alert if due, and return the safe message."""
    failure = classify_provider_error(error)
    logger.warning(
        "PROVIDER_FAILURE kind=%s status=%s source=%s model=%s error_type=%s",
        failure.kind, failure.status, source, model, type(error).__name__,
    )
    now = time.monotonic()
    cooldown = _env_int("PROVIDER_ALERT_COOLDOWN_SECONDS", DEFAULT_COOLDOWN_SECONDS)
    alert = None
    with _state.lock:
        if failure.kind == "credit":
            if _due("credit", now, cooldown):
                alert = ("credit", "AI provider is rejecting requests for credit (HTTP 402)", {
                    "kind": "credit", "status": failure.status, "source": source, "model": model,
                })
        else:
            window = _env_int("PROVIDER_ALERT_BURST_WINDOW_SECONDS", DEFAULT_BURST_WINDOW_SECONDS)
            _state.recent.append((now, failure.kind))
            while _state.recent and now - _state.recent[0][0] > window:
                _state.recent.popleft()
            if len(_state.recent) >= _env_int("PROVIDER_ALERT_BURST_THRESHOLD", DEFAULT_BURST_THRESHOLD) \
                    and _due("burst", now, cooldown):
                kinds: dict[str, int] = {}
                for _, kind in _state.recent:
                    kinds[kind] = kinds.get(kind, 0) + 1
                alert = ("burst", "AI provider failures are bursting", {
                    "failures": len(_state.recent), "window_seconds": window,
                    "kinds": kinds, "last_source": source, "model": model,
                })
    if alert is not None:
        _send_alert(*alert)
    return failure


def report_if_provider_error(error: BaseException, *, source: str) -> ProviderFailure | None:
    """Report only failures that look like the provider's; ``None`` for anything else."""
    if classify_provider_error(error).kind == "other":
        return None
    return report_provider_failure(error, source=source)
