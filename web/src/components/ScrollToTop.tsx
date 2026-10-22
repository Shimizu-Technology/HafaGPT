import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

interface Position { rootX: number; rootY: number; windowX: number; windowY: number }
// Explicit maximum supported loading window, including lazy imports and API data.
// Animation-only game routes may never expose a heading; they must also expire.
const ORIENTATION_WINDOW_MS = 30_000;
const top: Position = { rootX: 0, rootY: 0, windowX: 0, windowY: 0 };

/** Orient route entries without taking over nested scrollers (notably chat). */
export function ScrollToTop() {
  const location = useLocation();
  const action = useNavigationType();
  const positions = useRef(new Map<string, Position>());
  const previousPath = useRef<string>();

  useLayoutEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const samePage = previousPath.current === location.pathname;
    const withinChat = previousPath.current?.startsWith('/chat') && location.pathname.startsWith('/chat');
    previousPath.current = location.pathname;
    // Chat owns conversation URL replacements and its messages scroller.
    if (withinChat) return;

    let restoring = false;
    let resize: ResizeObserver | undefined;
    let focusTarget: HTMLElement | undefined;
    let addedTabIndex = false;
    const restoreTabIndex = () => {
      if (addedTabIndex) focusTarget?.removeAttribute('tabindex');
      addedTabIndex = false;
    };
    const remember = () => {
      if (restoring) return;
      positions.current.set(location.key, {
        rootX: root.scrollLeft, rootY: root.scrollTop,
        windowX: window.scrollX, windowY: window.scrollY,
      });
    };
    const onScroll = (event: Event) => {
      if (event.target === root || event.target === document) remember();
    };
    root.addEventListener('scroll', onScroll, true);
    window.addEventListener('scroll', onScroll);
    const stopRemembering = () => {
      root.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('scroll', onScroll);
    };
    // Search/filter edits preserve orientation, while still recording the new
    // history entry so native Back/Forward can restore its subsequent scrolls.
    if (samePage && action !== 'POP') {
      remember();
      return stopRemembering;
    }

    const target = action === 'POP' ? positions.current.get(location.key) ?? top : top;
    restoring = true;
    let focused = samePage;
    let stopped = false;
    const stopObserving = () => {
      stopped = true;
      observer.disconnect();
      resize?.disconnect();
      window.clearTimeout(deadline);
      root.removeEventListener('load', orient, true);
    };
    const orient = () => {
      if (stopped) return;
      if (restoring) {
        // Direct offsets are instant even when the user's CSS scroll is smooth.
        root.scrollLeft = target.rootX;
        root.scrollTop = target.rootY;
        window.scrollTo({ left: target.windowX, top: target.windowY, behavior: 'instant' });
        restoring = Math.abs(root.scrollTop - target.rootY) > 1 || Math.abs(window.scrollY - target.windowY) > 1;
      }
      if (!focused) {
        const candidates = root.querySelectorAll<HTMLElement>('h1, main:not([role="status"])');
        // Suspense may leave the old page hidden while a lazy route loads.
        focusTarget = Array.from(candidates).find(el => el.tagName === 'H1' && el.getClientRects().length > 0)
          ?? Array.from(candidates).find(el => el.tagName === 'MAIN' && el.getClientRects().length > 0);
        if (focusTarget) {
          addedTabIndex = !focusTarget.hasAttribute('tabindex');
          if (addedTabIndex) focusTarget.tabIndex = -1;
          focusTarget.focus({ preventScroll: true });
          focusTarget.addEventListener('blur', restoreTabIndex, { once: true });
          focused = true;
        }
      }
      if (!restoring && focused) stopObserving();
    };
    // An async page can initially be shorter than its saved offset. Retry when
    // its content arrives, but relinquish restoration as soon as the user acts.
    const onUserInput = () => {
      restoring = false;
      // Do not steal focus when delayed route content arrives after interaction.
      focused = true;
      stopObserving();
      remember();
    };
    const observer = new MutationObserver(orient);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    if (typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver(orient);
      Array.from(root.children).forEach(child => resize!.observe(child));
    }
    root.addEventListener('load', orient, true);
    const deadline = window.setTimeout(onUserInput, ORIENTATION_WINDOW_MS);
    for (const event of ['wheel', 'touchstart', 'keydown', 'pointerdown']) root.addEventListener(event, onUserInput, { passive: true });
    orient();
    return () => {
      stopObserving();
      restoreTabIndex();
      focusTarget?.removeEventListener('blur', restoreTabIndex);
      root.removeEventListener('load', orient, true);
      stopRemembering();
      for (const event of ['wheel', 'touchstart', 'keydown', 'pointerdown']) root.removeEventListener(event, onUserInput);
    };
  }, [location.key, location.pathname, action]);

  return null;
}
