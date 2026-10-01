import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStreamTextBatcher } from './streamTextBatcher';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('stream text batching', () => {
  it('coalesces rapid chunks and flushes the exact final Unicode and markdown text once', () => {
    const onText = vi.fn();
    const batcher = createStreamTextBatcher(onText);
    const chunks = ['Håfa', ' adai!\n\n', '| Word | Meaning |\n', '| --- | --- |\n', '| hånom | water |'];
    chunks.slice(0, 3).forEach(batcher.append);
    expect(onText).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(onText).toHaveBeenCalledTimes(1);
    chunks.slice(3).forEach(batcher.append);
    batcher.flush();
    expect(onText).toHaveBeenLastCalledWith(chunks.slice(3).join(''), chunks.join(''));
    vi.advanceTimersByTime(100);
    expect(onText).toHaveBeenCalledTimes(2);
  });

  it('discards queued work after cancellation or an error', () => {
    const onText = vi.fn();
    const batcher = createStreamTextBatcher(onText);
    batcher.append('Do not render after leaving');
    batcher.cancel();
    vi.advanceTimersByTime(100);
    batcher.flush();
    expect(onText).not.toHaveBeenCalled();
  });
});
