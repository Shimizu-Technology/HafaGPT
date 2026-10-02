import { useRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatAutoScroll } from './useChatAutoScroll';
import type { ChatScrollMessage } from '../lib/chatScroll';

const messages = (content: string): ChatScrollMessage[] => [
  { role: 'user', content: 'Earlier question' },
  { role: 'assistant', content: 'Earlier answer' },
  { role: 'user', content: 'Translate the worksheet' },
  { role: 'assistant', content },
];

function Harness({ content = 'Streaming', initial = false }: { content?: string; initial?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { showScrollButton, resumeFollowing } = useChatAutoScroll(ref, initial ? messages(content).slice(2) : messages(content));
  return <>
    <div ref={ref} data-testid="scroller" style={{ paddingBottom: 200 }}><div>{content}</div></div>
    {showScrollButton && <button onClick={resumeFollowing}>Latest</button>}
  </>;
}

function setup(initial = false) {
  const view = render(<Harness initial={initial} />);
  const container = screen.getByTestId('scroller');
  let height = initial ? 550 : 1600;
  Object.defineProperties(container, {
    scrollHeight: { configurable: true, get: () => height },
    clientHeight: { configurable: true, value: 500 },
  });
  const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
    container.scrollTop = top ?? 0;
    fireEvent.scroll(container);
  });
  Object.defineProperty(container, 'scrollTo', { value: scrollTo, configurable: true });
  act(() => vi.advanceTimersByTime(20));
  scrollTo.mockClear();
  return { ...view, container, scrollTo, grow(nextHeight: number, content: string) {
    height = nextHeight;
    view.rerender(<Harness content={content} initial={initial} />);
  } };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('chat follow and reading modes', () => {
  it('keeps a short first exchange at the header instead of scrolling through composer space', () => {
    const { container } = setup(true);
    expect(container.scrollTop).toBe(0);
    expect(screen.queryByRole('button', { name: 'Latest' })).not.toBeInTheDocument();
  });

  it('offers and preserves explicit resume when composer padding overflows the first exchange', () => {
    const { container, grow } = setup(true);
    grow(650, 'Content extends behind the fixed composer');
    act(() => vi.advanceTimersByTime(20));
    expect(container.scrollTop).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Latest' }));
    expect(container.scrollTop).toBe(150);
    grow(680, 'Another first-exchange chunk');
    act(() => vi.advanceTimersByTime(20));
    expect(container.scrollTop).toBe(180);
  });

  it('cancels pending follow immediately on touch and preserves reading position through streaming and completion', () => {
    const { container, grow, scrollTo } = setup();
    grow(1800, 'More streamed text');
    fireEvent.touchStart(container, { touches: [{ clientY: 400 }] });
    act(() => vi.advanceTimersByTime(20));
    expect(scrollTo).not.toHaveBeenCalled();
    container.scrollTop = 350;
    fireEvent.scroll(container);
    grow(2200, 'Long markdown table and later text');
    act(() => vi.advanceTimersByTime(20));
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.touchEnd(container);
    grow(2300, 'Completed answer with sources');
    act(() => vi.advanceTimersByTime(20));
    expect(container.scrollTop).toBe(350);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Latest' })).toBeInTheDocument();
  });

  it('resumes only after scrolling toward the bottom, without writing during the touch', () => {
    const { container, grow, scrollTo } = setup();
    fireEvent.touchStart(container);
    container.scrollTop = 100;
    fireEvent.scroll(container);
    container.scrollTop = 1080;
    fireEvent.scroll(container);
    grow(1620, 'Still streaming');
    act(() => vi.advanceTimersByTime(20));
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.touchEnd(container);
    act(() => vi.advanceTimersByTime(20));
    expect(container.scrollTop).toBe(1120);
    grow(1800, 'Following again');
    act(() => vi.advanceTimersByTime(20));
    expect(container.scrollTop).toBe(1300);
  });

  it('respects wheel and keyboard reading then resumes from the explicit latest button', () => {
    const { container, grow, scrollTo } = setup();
    fireEvent.wheel(container, { deltaY: -100 });
    container.scrollTop = 100;
    fireEvent.scroll(container);
    grow(2000, 'Next chunk');
    act(() => vi.advanceTimersByTime(20));
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Latest' }));
    expect(container.scrollTop).toBe(1500);
    grow(2200, 'Next chunk follows');
    act(() => vi.advanceTimersByTime(20));
    expect(container.scrollTop).toBe(1700);
    fireEvent.keyDown(container, { key: 'PageUp' });
    container.scrollTop = 600;
    fireEvent.scroll(container);
    scrollTo.mockClear();
    grow(2400, 'Reading with keyboard');
    act(() => vi.advanceTimersByTime(20));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('cleans up queued animation work when the conversation unmounts', () => {
    const { grow, scrollTo, unmount } = setup();
    grow(1900, 'Queued update');
    unmount();
    act(() => vi.advanceTimersByTime(100));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
