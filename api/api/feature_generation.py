"""Provider boundary for stateless learning features."""
import asyncio
import json
import re
from typing import Any

from fastapi import HTTPException

from .provider_errors import MalformedProviderResponse, report_provider_failure
from .source_citations import CURRENT_NAME_FOR_LEGACY_NAME, LEGACY_SOURCE_IDS

CARD_FIELDS = ('front', 'back', 'pronunciation', 'example', 'category')
KNOWN_SOURCE_NAMES = frozenset(
    name.casefold() for name in (*LEGACY_SOURCE_IDS, *CURRENT_NAME_FOR_LEGACY_NAME)
)


async def feature_json(client: Any, model: str, messages: list, *, max_tokens: int,
                       source: str, json_object: bool = False) -> Any:
    """Reasoning-off generation; keep provider text out of responses and alerts."""
    try:
        options = {'response_format': {'type': 'json_object'}} if json_object else {}
        response = await asyncio.to_thread(
            client.chat.completions.create, model=model, messages=messages,
            max_tokens=max_tokens, extra_body={'reasoning': {'effort': 'none'}}, **options,
        )
        choice = response.choices[0]
        text = choice.message.content
        if not text or choice.finish_reason == 'length':
            raise MalformedProviderResponse('Empty or truncated feature response')
        text = text.strip()
        if text.startswith('```'):
            text = text.split('```')[1]
            text = re.sub(r'^json\b', '', text.strip(), flags=re.I)
        data = json.loads(text.strip())
        if not isinstance(data, dict if json_object else list):
            raise MalformedProviderResponse('Unexpected feature JSON shape')
        if json_object:
            # Keep malformed provider fields out of Pydantic's error text in the
            # endpoint logs. Empty strings remain valid practice replies.
            if not all(isinstance(data.get(field), str) for field in ('chamorro_response', 'english_translation')):
                raise MalformedProviderResponse('Missing practice fields')
            if 'is_complete' in data and not isinstance(data['is_complete'], bool):
                raise MalformedProviderResponse('Unexpected practice fields')
            if data.get('feedback') is not None and not isinstance(data['feedback'], dict):
                raise MalformedProviderResponse('Unexpected practice feedback')
        if not json_object and any(not isinstance(card, dict) or any(
                card.get(field) is not None and not isinstance(card[field], str) for field in CARD_FIELDS
        ) for card in data):
            raise MalformedProviderResponse('Unexpected card fields')
        return data
    except Exception as error:
        # Malformed JSON and SDK errors (including 400/401) share the same safe
        # retry/alert path as timeouts, rate limits and exhausted credits.
        if isinstance(error, (json.JSONDecodeError, IndexError, AttributeError, TypeError)):
            error = MalformedProviderResponse('Unusable feature response')
        failure = report_provider_failure(error, source=source, model=model)
        raise HTTPException(status_code=503, detail=failure.message) from None


def strip_card_citations(text: str | None, sources: list[dict]) -> str | None:
    """Remove labels that name a known source; preserve other brackets and language bytes."""
    if text is None:
        return None
    names = KNOWN_SOURCE_NAMES | {source['name'].casefold() for source in sources if source.get('name')}

    def citation(match: re.Match[str]) -> str:
        labels = [
            re.sub(r',?\s+(?:p(?:age)?\.?\s*\d+.*)$', '', label.strip(), flags=re.I).casefold()
            for label in match.group(1).split(';')
        ]
        return '' if all(label in names for label in labels) else match.group(0)

    # Consume only horizontal whitespace immediately before a removed citation.
    # Do not normalize spelling, punctuation, apostrophes, or interior whitespace.
    return re.sub(r'[ \t]*[\[(]([^\[\]()\n]+)[\])]', citation, text).strip()


def strip_reply_citations(value: Any, sources: list[dict]) -> Any:
    """Remove source labels from every string in a practice reply field."""
    if isinstance(value, str):
        return strip_card_citations(value, sources)
    if isinstance(value, dict):
        return {key: strip_reply_citations(item, sources) for key, item in value.items()}
    if isinstance(value, list):
        return [strip_reply_citations(item, sources) for item in value]
    return value

