import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

/** A swipe faster than this (pixels per millisecond) dismisses the sheet. */
export const SHEET_DISMISS_VELOCITY = 0.11;
/** Ignore flicks shorter than this so a jittery tap on the handle cannot close the sheet. */
const SHEET_MIN_DISMISS_DISTANCE = 24;
/** A slow drag past this share of the sheet height also dismisses it. */
const SHEET_DISMISS_FRACTION = 0.5;

// Mirrors the exit durations in index.css (.overlay-panel[data-state="closed"]).
const EXIT_MS = { sheet: 160, dialog: 120, reduced: 100 } as const;

interface ResponsiveSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  closeLabel: string;
  /** The visible area, so the sheet sits above the on-screen keyboard. */
  viewport: { top: number; height: number };
  children: ReactNode;
}

/**
 * Tutor-style options overlay: a bottom sheet on a phone and a centred dialog
 * on wider screens. Keeps the app's modal contract (focus trap, Escape,
 * scroll lock, focus return) and adds enter/exit motion plus swipe-down to
 * dismiss on the sheet. While it animates out it stays mounted but is hidden
 * from assistive technology and ignores pointer input.
 */
export function ResponsiveSheet({ open, onClose, title, titleId, closeLabel, viewport, children }: ResponsiveSheetProps) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const variant = isPhone ? 'sheet' : 'dialog';

  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const exitMs = reducedMotion ? EXIT_MS.reduced : EXIT_MS[variant];
    const timer = window.setTimeout(() => setMounted(false), exitMs + 20);
    return () => window.clearTimeout(timer);
  }, [open, reducedMotion, variant]);

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useModalAccessibility({ isOpen: open, onClose, dialogRef: panelRef, initialFocusRef: closeRef });

  // The exiting overlay must not take focus, clicks or screen-reader attention.
  useEffect(() => {
    const root = rootRef.current as (HTMLDivElement & { inert?: boolean }) | null;
    if (root) root.inert = !open;
  });

  const drag = useRef<{ pointerId: number; startY: number; startTime: number; offset: number } | null>(null);

  const settle = useCallback((transition: string) => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;
    panel.style.transition = reducedMotion ? 'none' : transition;
    backdrop.style.transition = reducedMotion ? 'none' : transition.replace('transform', 'opacity');
    panel.style.transform = '';
    backdrop.style.opacity = '';
  }, [reducedMotion]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel || !open || variant !== 'sheet' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    // Taps on the close button are taps, not the start of a drag.
    if ((event.target as Element).closest('button')) return;
    panel.getAnimations?.().forEach(animation => animation.cancel());
    panel.style.transition = 'none';
    backdropRef.current?.getAnimations?.().forEach(animation => animation.cancel());
    // Capture keeps the drag alive outside the handle; it throws if the pointer is already gone.
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* the drag still works without capture */ }
    drag.current = { pointerId: event.pointerId, startY: event.clientY, startTime: event.timeStamp, offset: 0 };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const panel = panelRef.current;
    if (!state || state.pointerId !== event.pointerId || !panel) return;
    // Upward drags stop at the resting position; only downward movement is shown.
    state.offset = Math.max(0, event.clientY - state.startY);
    panel.style.transform = `translateY(${state.offset}px)`;
    if (backdropRef.current) {
      backdropRef.current.style.opacity = String(Math.max(0, 1 - state.offset / Math.max(panel.offsetHeight, 1)));
    }
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const state = drag.current;
    const panel = panelRef.current;
    if (!state || state.pointerId !== event.pointerId || !panel) return;
    drag.current = null;
    try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* already released */ }
    const elapsed = Math.max(event.timeStamp - state.startTime, 1);
    const velocity = state.offset / elapsed;
    const quickFlick = velocity > SHEET_DISMISS_VELOCITY && state.offset >= SHEET_MIN_DISMISS_DISTANCE;
    const draggedFarEnough = state.offset > panel.offsetHeight * SHEET_DISMISS_FRACTION;
    if (!cancelled && (quickFlick || draggedFarEnough)) {
      // The exit animation has no "from", so it carries on from the dragged position.
      panel.style.transition = '';
      onClose();
    } else {
      settle('transform 200ms var(--ease-drawer)');
    }
  };

  // Drop any leftover drag styles when the overlay reopens.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (panel) { panel.style.transform = ''; panel.style.transition = ''; }
    if (backdrop) { backdrop.style.opacity = ''; backdrop.style.transition = ''; }
  }, [open]);

  if (!open && !mounted) return null;

  const state = open ? 'open' : 'closed';
  const sheet = variant === 'sheet';
  const heading = (
    <div className="flex items-center justify-between">
      <h2 id={titleId} className="text-lg font-semibold text-brown-900 dark:text-cream-100">{title}</h2>
      <button ref={closeRef} type="button" onClick={onClose} aria-label={closeLabel}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 dark:text-brown-100 dark:hover:bg-brown-900"><X className="h-5 w-5" /></button>
    </div>
  );

  return (
    <div ref={rootRef} aria-hidden={open ? undefined : true}
      className={`fixed left-0 right-0 z-[60] flex ${sheet ? 'items-end justify-center' : 'items-center justify-center p-4'} ${open ? '' : 'pointer-events-none'}`}
      style={{ top: viewport.top, height: viewport.height }}>
      <div ref={backdropRef} data-state={state} data-variant={variant} onClick={onClose} role="presentation"
        className="overlay-backdrop absolute inset-0 touch-none bg-black/40" />
      <div ref={panelRef} role="dialog" aria-modal={open ? 'true' : undefined} aria-labelledby={titleId} tabIndex={-1}
        data-state={state} data-variant={variant}
        style={{ maxHeight: Math.max(0, viewport.height - (sheet ? 8 : 32)) }}
        className={`overlay-panel relative flex w-full flex-col border border-cream-300 bg-cream-50 shadow-xl dark:border-brown-700 dark:bg-brown-950 ${
          sheet ? 'rounded-t-3xl border-b-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]' : 'max-w-sm rounded-2xl p-4'}`}>
        {sheet ? (
          // The handle and title row are the swipe surface; the list below keeps native scrolling.
          <div className="shrink-0 touch-none px-4 pb-3" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
            onPointerUp={event => endDrag(event, false)} onPointerCancel={event => endDrag(event, true)}>
            <div className="flex h-7 items-center justify-center" aria-hidden="true">
              <span className="h-1.5 w-10 rounded-full bg-brown-300 dark:bg-brown-600" />
            </div>
            {heading}
          </div>
        ) : <div className="mb-4 shrink-0">{heading}</div>}
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain ${sheet ? 'px-4' : '-mx-1 px-1 pb-1'}`}>{children}</div>
      </div>
    </div>
  );
}
