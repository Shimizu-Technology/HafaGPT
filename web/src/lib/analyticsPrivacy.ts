import type { CaptureResult, NetworkRequest } from 'posthog-js';

const URL_PROPERTY_KEYS = ['$current_url', '$referrer', '$initial_referrer'] as const;
const NESTED_URL_KEYS = new Set(['href', 'url', 'name']);

function withoutQueryOrFragment(value: unknown): unknown {
  if (typeof value !== 'string' || !value) return value;

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://hafagpt.com';
    const url = new URL(value, base);
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

function sanitizeNestedReplayValue(value: unknown, key?: string): unknown {
  if (typeof value === 'string') {
    if (key && NESTED_URL_KEYS.has(key) && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/'))) {
      return withoutQueryOrFragment(value) ?? '';
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeNestedReplayValue(item));
  }

  if (value && typeof value === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      copy[childKey] = sanitizeNestedReplayValue(childValue, childKey);
    }
    return copy;
  }

  return value;
}

/** Strip query strings and fragments from network URLs captured by PostHog session replay. */
export function maskReplayNetworkRequest(request: NetworkRequest): NetworkRequest | null {
  if (!request?.url) return request;
  const sanitized = withoutQueryOrFragment(request.url);
  return {
    ...request,
    url: typeof sanitized === 'string' ? sanitized : request.url,
  };
}

/** Remove arbitrary query and fragment content before any PostHog event leaves the browser. */
export function sanitizeAnalyticsEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null;

  const properties = { ...event.properties };
  for (const key of URL_PROPERTY_KEYS) {
    const sanitized = withoutQueryOrFragment(properties[key]);
    if (sanitized === undefined) {
      delete properties[key];
    } else {
      properties[key] = sanitized;
    }
  }

  if ('$snapshot_data' in properties && properties.$snapshot_data) {
    properties.$snapshot_data = sanitizeNestedReplayValue(properties.$snapshot_data);
  }

  return { ...event, properties };
}
