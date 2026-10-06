import { afterEach, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './registerServiceWorker';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
it('registers immediate migration and background checks without refresh event listeners', async () => {
  vi.stubEnv('PROD', true);
  vi.useFakeTimers();
  const update = vi.fn().mockResolvedValue(undefined);
  const register = vi.fn().mockResolvedValue({ update });
  const addEventListener = vi.fn();
  vi.stubGlobal('navigator', { onLine: true, serviceWorker: { register, addEventListener } });
  registerServiceWorker();
  await Promise.resolve();
  expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
  expect(update).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
  expect(update).toHaveBeenCalledTimes(2);
  expect(addEventListener).not.toHaveBeenCalled();
});
