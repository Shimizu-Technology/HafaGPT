import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { ResponsiveSheet } from './ResponsiveSheet';

function mockMedia(matching: string[]) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: matching.includes(query), media: query,
      addEventListener: () => undefined, removeEventListener: () => undefined,
    }),
  });
}

// jsdom has no PointerEvent; a MouseEvent carrying the pointer fields is enough for the drag logic.
if (!('PointerEvent' in window)) {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  Object.defineProperty(window, 'PointerEvent', { configurable: true, value: PointerEventPolyfill });
}

// jsdom does no layout; give every element a 400px height so "half the sheet" means 200px.
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 400 });

const PHONE = '(max-width: 639px)';
const REDUCED = '(prefers-reduced-motion: reduce)';

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open options</button>
      <ResponsiveSheet open={open} onClose={() => { onClose?.(); setOpen(false); }} title="Tutor options" titleId="t" closeLabel="Close tutor options" viewport={{ top: 0, height: 700 }}>
        <button type="button">Inside</button>
      </ResponsiveSheet>
    </>
  );
}

function dialog() {
  return screen.getByRole('dialog', { name: 'Tutor options' });
}
function handle() {
  return dialog().querySelector<HTMLElement>('.touch-none')!;
}

describe('ResponsiveSheet', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.style.overflow = '';
  });

  it('is a centred dialog on wide screens and a bottom sheet on a phone', () => {
    mockMedia([]);
    const wide = render(<Harness />);
    fireEvent.click(screen.getByText('Open options'));
    expect(dialog()).toHaveAttribute('data-variant', 'dialog');
    expect(handle()).toBeNull();
    wide.unmount();

    mockMedia([PHONE]);
    render(<Harness />);
    fireEvent.click(screen.getByText('Open options'));
    expect(dialog()).toHaveAttribute('data-variant', 'sheet');
    expect(handle()).not.toBeNull();
  });

  it('focuses the close control, closes on Escape, locks scroll, and returns focus', async () => {
    mockMedia([]);
    render(<Harness />);
    const trigger = screen.getByText('Open options');
    trigger.focus();
    fireEvent.click(trigger);
    await act(async () => { vi.advanceTimersByTime(20); });
    expect(screen.getByRole('button', { name: 'Close tutor options' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
    expect(trigger).toHaveFocus();
  });

  it('stays mounted while it animates out, hidden from assistive technology, then unmounts', () => {
    mockMedia([PHONE]);
    render(<Harness />);
    fireEvent.click(screen.getByText('Open options'));
    fireEvent.click(screen.getByRole('button', { name: 'Close tutor options' }));
    expect(screen.queryByRole('dialog', { name: 'Tutor options' })).not.toBeInTheDocument();
    const closing = document.querySelector<HTMLElement>('.overlay-panel')!;
    expect(closing).toHaveAttribute('data-state', 'closed');
    expect(closing).not.toHaveAttribute('aria-modal');
    expect(closing.parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(closing.parentElement).toHaveClass('pointer-events-none');
    act(() => { vi.advanceTimersByTime(160); });
    expect(document.querySelector('.overlay-panel')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(40); });
    expect(document.querySelector('.overlay-panel')).toBeNull();
  });

  it('sits inside the visible area so the on-screen keyboard never covers it', () => {
    mockMedia([PHONE]);
    render(<ResponsiveSheet open onClose={() => undefined} title="Tutor options" titleId="t" closeLabel="Close tutor options" viewport={{ top: 120, height: 400 }}><p>Body</p></ResponsiveSheet>);
    const panel = dialog();
    const container = panel.parentElement!;
    expect(container.style.top).toBe('120px');
    expect(container.style.height).toBe('400px');
    expect(container).toHaveClass('items-end');
    expect(panel.style.maxHeight).toBe('392px');
    expect(panel.className).toContain('env(safe-area-inset-bottom');
  });

  it('closes by backdrop click', () => {
    mockMedia([]);
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByText('Open options'));
    fireEvent.click(document.querySelector('.overlay-backdrop')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('swipe down on the phone sheet', () => {
    function swipe(distance: number, durationMs: number) {
      const zone = handle();
      fireEvent.pointerDown(zone, { pointerId: 1, clientY: 100, pointerType: 'touch' });
      act(() => { vi.advanceTimersByTime(durationMs); });
      fireEvent.pointerMove(zone, { pointerId: 1, clientY: 100 + distance, pointerType: 'touch' });
      fireEvent.pointerUp(zone, { pointerId: 1, clientY: 100 + distance, pointerType: 'touch' });
    }

    beforeEach(() => mockMedia([PHONE]));

    it('dismisses when the release velocity is above 0.11 px/ms', () => {
      const onClose = vi.fn();
      render(<Harness onClose={onClose} />);
      fireEvent.click(screen.getByText('Open options'));
      swipe(60, 400); // 0.15 px/ms
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('springs back when slower than 0.11 px/ms and under half the height', () => {
      const onClose = vi.fn();
      render(<Harness onClose={onClose} />);
      fireEvent.click(screen.getByText('Open options'));
      swipe(40, 600); // 0.067 px/ms
      expect(onClose).not.toHaveBeenCalled();
      expect(dialog().style.transform).toBe('');
    });

    it('ignores a tiny jitter even if it was quick', () => {
      const onClose = vi.fn();
      render(<Harness onClose={onClose} />);
      fireEvent.click(screen.getByText('Open options'));
      swipe(8, 20);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not start a drag from the close button', () => {
      const onClose = vi.fn();
      render(<Harness onClose={onClose} />);
      fireEvent.click(screen.getByText('Open options'));
      const button = screen.getByRole('button', { name: 'Close tutor options' });
      fireEvent.pointerDown(button, { pointerId: 1, clientY: 100, pointerType: 'touch' });
      fireEvent.pointerMove(button, { pointerId: 1, clientY: 300, pointerType: 'touch' });
      expect(dialog().style.transform).toBe('');
    });
  });

  it('uses fades only under reduced motion (the stylesheet swaps the animation; the sheet stays a sheet)', () => {
    mockMedia([PHONE, REDUCED]);
    render(<Harness />);
    fireEvent.click(screen.getByText('Open options'));
    fireEvent.click(screen.getByRole('button', { name: 'Close tutor options' }));
    act(() => { vi.advanceTimersByTime(100); });
    expect(document.querySelector('.overlay-panel')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(30); });
    expect(document.querySelector('.overlay-panel')).toBeNull();
  });
});
