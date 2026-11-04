"""Provider boundary for stateless learning features."""
import asyncio
import json
import re

from fastapi import HTTPException

from .provider_errors import MalformedProviderResponse, report_provider_failure


async def feature_json(client, model: str, messages: list, *, max_tokens: int,
                       source: str, json_object: bool = False):
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
            if text.startswith('json'):
                text = text[4:]
        data = json.loads(text.strip())
        if not isinstance(data, dict if json_object else list):
            raise MalformedProviderResponse('Unexpected feature JSON shape')
        if not json_object and any(not isinstance(card, dict) or any(
                value is not None and not isinstance(value, str) for value in card.values()
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
    """Remove source labels only; preserve ordinary brackets and language bytes."""
    if text is None:
        return None
    names = {source['name'].casefold() for source in sources if source.get('name')}
    names.update({'chamoru.info dictionary', 'håfagpt vocabulary list'})

    def citation(match):
        label = match.group(1).strip()
        label = re.sub(r',?\s+(?:p(?:age)?\.?\s*\d+.*)$', '', label, flags=re.I)
        is_source = label.casefold() in names or bool(re.search(
            r'\b(?:dictionary|vocabulary list)\b', label, re.I))
        return '' if is_source else match.group(0)

    # Consume only horizontal whitespace immediately before a removed citation.
    # Do not normalize spelling, punctuation, apostrophes, or interior whitespace.
    return re.sub(r'[ \t]*\[([^\[\]\n]+)\]', citation, text).strip()
