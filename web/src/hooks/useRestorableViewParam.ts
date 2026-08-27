import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { currentAppPath } from '../lib/routes';

/** Keep a small allowlisted learner-library choice in the shareable URL. */
export function useRestorableViewParam<T extends string>(
  key: string,
  allowedValues: readonly T[],
  defaultValue: T,
): readonly [T, (value: T) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawValue = searchParams.get(key);
  const value = allowedValues.includes(rawValue as T) ? rawValue as T : defaultValue;

  const setValue = useCallback((nextValue: T) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextValue === defaultValue) nextParams.delete(key);
    else nextParams.set(key, nextValue);
    const nextSearch = nextParams.toString();
    navigate(currentAppPath(
      location.pathname,
      nextSearch ? `?${nextSearch}` : '',
      location.hash,
    ), { replace: true });
  }, [defaultValue, key, location.hash, location.pathname, navigate, searchParams]);

  useEffect(() => {
    if (rawValue && !allowedValues.includes(rawValue as T)) setValue(defaultValue);
  }, [allowedValues, defaultValue, rawValue, setValue]);

  return [value, setValue] as const;
}
