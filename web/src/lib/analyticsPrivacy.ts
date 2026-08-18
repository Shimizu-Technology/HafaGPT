import type { CaptureResult } from 'posthog-js';

const URL_PROPERTY_KEYS = ['$current_url', '$referrer', '$initial_referrer'] as const;

function withoutQueryOrFragment(value: unknown): unknown {
  if (typeof value !== 'string' || !value) return value;

  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
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

  return { ...event, properties };
}
