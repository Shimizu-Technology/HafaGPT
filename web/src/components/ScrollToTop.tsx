import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

interface Position { rootX: number; rootY: number; windowX: number; windowY: number }
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

    const target = action === 'POP' ? positions.current.get(location.key) ?? top : top;
    let restoring = true;
    let focused = samePage;

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
    const stopObserving = () => {
      observer?.disconnect();
      resize?.disconnect();
    };
    const orient = () => {
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
    const onUserInput = () => { restoring = false; remember(); if (focused) stopObserving(); };
    const onScroll = (event: Event) => {
      if (event.target === root || event.target === document) remember();
    };
    const observer = new MutationObserver(orient);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    if (typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver(orient);
      Array.from(root.children).forEach(child => resize!.observe(child));
    }
    root.addEventListener('load', orient, true);
    root.addEventListener('scroll', onScroll, true);
    window.addEventListener('scroll', onScroll);
    for (const event of ['wheel', 'touchstart', 'keydown', 'pointerdown']) root.addEventListener(event, onUserInput, { passive: true });
    orient();
    return () => {
      stopObserving();
      restoreTabIndex();
      focusTarget?.removeEventListener('blur', restoreTabIndex);
      root.removeEventListener('load', orient, true);
      root.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('scroll', onScroll);
      for (const event of ['wheel', 'touchstart', 'keydown', 'pointerdown']) root.removeEventListener(event, onUserInput);
    };
  }, [location.key, location.pathname, action]);

  return null;
}
