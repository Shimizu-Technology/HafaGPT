import { lazy, type ComponentType } from 'react';

export async function loadRoute<TModule>(loader: () => Promise<TModule>): Promise<TModule> {
  try {
    return await loader();
  } catch (error) {
    // Only a required import warrants recovery. A global preload-error
    // listener also catches optional analytics/PWA failures on mobile networks.
    void window.__hafagptRecoverStaleBuild?.();
    throw error;
  }
}

/** React.lazy for a named export that recovers from a stale build when its chunk fails to load. */
export function lazyNamed<TModule>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return lazy(async () => ({
    default: (await loadRoute(loader))[exportName] as ComponentType,
  }));
}
