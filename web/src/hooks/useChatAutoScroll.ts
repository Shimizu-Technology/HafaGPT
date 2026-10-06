import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { getChatScrollTop, shouldPinInitialExchangeToTop, type ChatScrollMessage } from '../lib/chatScroll';

const BOTTOM_THRESHOLD = 80;

/** Follow new content until the reader takes control; never scroll during a touch. */
export function useChatAutoScroll(
  containerRef: RefObject<HTMLDivElement>,
  messages: ChatScrollMessage[],
) {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const following = useRef(true);
  const preserveInitialPosition = useRef(true);
  const touching = useRef(false);
  const frame = useRef<number>();
  const pendingRestoreTop = useRef<number>();
  const empty = useRef(messages.length === 0);
  empty.current = messages.length === 0;
  const pinInitialExchange = shouldPinInitialExchangeToTop(messages);
  const pinInitialExchangeRef = useRef(pinInitialExchange);
  pinInitialExchangeRef.current = pinInitialExchange;

  const targetTop = useCallback((preserveInitialExchange = preserveInitialPosition.current) => {
    const container = containerRef.current;
    if (!container || empty.current) return 0;
    return getChatScrollTop({
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      paddingBottom: Number.parseFloat(getComputedStyle(container).paddingBottom) || 0,
      isInitialExchange: pinInitialExchangeRef.current,
      preserveInitialExchange,
    });
  }, [containerRef]);

  const updateButton = useCallback(() => {
    const container = containerRef.current;
    if (container) setShowScrollButton(targetTop(false) - container.scrollTop > BOTTOM_THRESHOLD);
  }, [containerRef, targetTop]);

  const cancelFrame = useCallback(() => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
  }, []);

  const scheduleFollow = useCallback(() => {
    cancelFrame();
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      const container = containerRef.current;
      const restoredTop = pendingRestoreTop.current;
      pendingRestoreTop.current = undefined;
      if (container && !touching.current && restoredTop !== undefined) {
        container.scrollTo({ top: restoredTop, behavior: 'instant' });
      } else if (container && following.current && !touching.current) {
        // Instant writes cannot leave a smooth animation fighting a later gesture.
        const top = targetTop();
        if (Math.abs(container.scrollTop - top) > 1) container.scrollTo({ top, behavior: 'instant' });
      }
      updateButton();
    });
  }, [cancelFrame, containerRef, targetTop, updateButton]);

  const resetScrollTracking = useCallback(() => {
    pendingRestoreTop.current = undefined;
    following.current = true;
    preserveInitialPosition.current = true;
    scheduleFollow();
  }, [scheduleFollow]);

  const restoreScrollPosition = useCallback((top: number) => {
    following.current = false;
    preserveInitialPosition.current = false;
    pendingRestoreTop.current = top;
    scheduleFollow();
  }, [scheduleFollow]);

  const resumeFollowing = useCallback(() => {
    pendingRestoreTop.current = undefined;
    following.current = true;
    preserveInitialPosition.current = false;
    const container = containerRef.current;
    if (container && !touching.current) container.scrollTo({ top: targetTop(false), behavior: 'instant' });
    updateButton();
  }, [containerRef, targetTop, updateButton]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let lastTop = container.scrollTop;
    let touchedTowardBottom = false;
    const pause = () => {
      pendingRestoreTop.current = undefined;
      following.current = false;
      cancelFrame();
    };
    const onTouchStart = () => {
      touching.current = true;
      touchedTowardBottom = false;
      pause();
    };
    const onTouchEnd = () => {
      touching.current = false;
      if (touchedTowardBottom && targetTop(false) - container.scrollTop <= BOTTOM_THRESHOLD) {
        following.current = true;
        preserveInitialPosition.current = false;
        scheduleFollow();
      }
      updateButton();
    };
    const onScroll = () => {
      const movedDown = container.scrollTop > lastTop + 1;
      const movedUp = container.scrollTop < lastTop - 1;
      lastTop = container.scrollTop;
      if (touching.current) {
        touchedTowardBottom = movedDown;
      } else if (!following.current && movedDown && targetTop(false) - container.scrollTop <= BOTTOM_THRESHOLD) {
        following.current = true;
        preserveInitialPosition.current = false;
      } else if (movedUp) {
        // Includes keyboard and scrollbar movement, not just wheel/touch events.
        following.current = false;
      }
      updateButton();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) pause();
    };
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    container.addEventListener('pointerdown', pause, { passive: true });
    container.addEventListener('wheel', pause, { passive: true });
    container.addEventListener('keydown', onKeyDown);
    container.addEventListener('scroll', onScroll, { passive: true });
    // Image loads, viewport/keyboard changes and source disclosure can change height
    // even when no token arrives. They must obey the same follow state.
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleFollow) : null;
    observer?.observe(container);
    if (container.firstElementChild) observer?.observe(container.firstElementChild);
    return () => {
      pendingRestoreTop.current = undefined;
      cancelFrame();
      observer?.disconnect();
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('pointerdown', pause);
      container.removeEventListener('wheel', pause);
      container.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('scroll', onScroll);
    };
  }, [cancelFrame, containerRef, scheduleFollow, targetTop, updateButton]);

  useEffect(scheduleFollow, [messages, scheduleFollow]);

  return { showScrollButton, resumeFollowing, resetScrollTracking, restoreScrollPosition };
}
