import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ModalAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function useModalAccessibility({
  isOpen,
  onClose,
  dialogRef,
  initialFocusRef,
}: ModalAccessibilityOptions) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusInitialControl = window.requestAnimationFrame(() => {
      const fallback = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (initialFocusRef?.current ?? fallback ?? dialogRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const openDialogs = Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"]'));
      if (openDialogs[openDialogs.length - 1] !== dialogRef.current) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const controls = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null);

      if (controls.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusInitialControl);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [dialogRef, initialFocusRef, isOpen]);
}
