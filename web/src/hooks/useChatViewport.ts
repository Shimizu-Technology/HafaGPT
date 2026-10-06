import { useEffect, useState } from 'react';

export interface ChatViewport {
  isMobile: boolean;
  top: number;
  height: number;
  keyboardOpen: boolean;
}

function readViewport(): Omit<ChatViewport, 'keyboardOpen'> {
  return {
    isMobile: window.innerWidth < 640,
    top: window.visualViewport?.offsetTop || 0,
    height: window.visualViewport?.height || window.innerHeight,
  };
}
function editableFocused() {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement)) return false;
  return element.matches('textarea, input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], input[type="password"], input[type="number"], [contenteditable="true"]');
}

/** Follow the visible browser area without mistaking browser chrome or pinch zoom for a keyboard. */
export function useChatViewport(enabled = true): ChatViewport {
  const [viewport, setViewport] = useState<ChatViewport>(() => ({ ...readViewport(), keyboardOpen: false }));
  useEffect(() => {
    if (!enabled) return;
    const visual = window.visualViewport;
    const touch = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    let baselineHeight = Math.max(window.innerHeight, visual?.height || 0);
    let baselineWidth = window.innerWidth;
    let frame: number | undefined;
    const update = () => {
      const next = readViewport();
      const unzoomed = Math.abs((visual?.scale || 1) - 1) < 0.02;
      if (unzoomed) {
        if (window.innerWidth !== baselineWidth) {
          baselineWidth = window.innerWidth;
          baselineHeight = Math.max(window.innerHeight, next.height);
        } else baselineHeight = Math.max(baselineHeight, window.innerHeight, next.height);
      }
      const loss = baselineHeight - next.height;
      const obscured = !!touch && unzoomed && loss > Math.max(140, baselineHeight * 0.2);
      setViewport(previous => {
        // Keep a confirmed keyboard open through blur/dismiss animation until the visible area returns.
        const keyboardOpen = obscured && (editableFocused() || previous.keyboardOpen);
        return previous.isMobile === next.isMobile && previous.top === next.top
          && previous.height === next.height && previous.keyboardOpen === keyboardOpen
          ? previous : { ...next, keyboardOpen };
      });
    };
    const schedule = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { frame = undefined; update(); });
    };
    update();
    visual?.addEventListener('resize', schedule);
    visual?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      visual?.removeEventListener('resize', schedule);
      visual?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
    };
  }, [enabled]);
  return viewport;
}
