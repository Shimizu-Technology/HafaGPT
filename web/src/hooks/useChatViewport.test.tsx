import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { useChatViewport } from './useChatViewport';

class Viewport extends EventTarget {
  height = 844;
  offsetTop = 0;
  scale = 1;
}
let visual: Viewport;
let coarse: boolean;
function resize(height: number, top = 0, scale = 1) {
  act(() => {
    visual.height = height; visual.offsetTop = top; visual.scale = scale;
    visual.dispatchEvent(new Event('resize'));
    vi.runOnlyPendingTimers();
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  visual = new Viewport(); coarse = true;
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: visual });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: coarse })) });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => window.setTimeout(() => callback(0), 0));
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => window.clearTimeout(id));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.querySelectorAll('textarea, input').forEach(element => element.remove()); });

describe('useChatViewport', () => {
  it('tracks visible height and offset, hides navigation only for an editable software keyboard, and restores it after dismissal', () => {
    const { result } = renderHook(() => useChatViewport());
    const input = document.createElement('textarea'); document.body.appendChild(input); input.focus();
    resize(400, 28);
    expect(result.current).toEqual({ isMobile: true, height: 400, top: 28, keyboardOpen: true });
    act(() => { input.blur(); vi.runOnlyPendingTimers(); });
    expect(result.current.keyboardOpen).toBe(true);
    resize(844);
    expect(result.current.keyboardOpen).toBe(false);
  });
  it('does not mistake browser toolbars, pinch zoom, or a noneditable focus for a keyboard', () => {
    const { result } = renderHook(() => useChatViewport());
    resize(400);
    expect(result.current.keyboardOpen).toBe(false);
    const input = document.createElement('textarea'); document.body.appendChild(input); input.focus();
    resize(770);
    expect(result.current.keyboardOpen).toBe(false);
    resize(400, 60, 2);
    expect(result.current.keyboardOpen).toBe(false);
    resize(400, 0, 1);
    expect(result.current.keyboardOpen).toBe(true);
  });
  it('recognizes a keyboard on a wide touch viewport while keeping the desktop navigation layout', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    const { result } = renderHook(() => useChatViewport());
    const input = document.createElement('input'); input.type = 'text'; document.body.appendChild(input); input.focus();
    resize(450);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.keyboardOpen).toBe(true);
  });
  it('uses the layout baseline when Android resizes both viewport heights', () => {
    const { result } = renderHook(() => useChatViewport());
    const input = document.createElement('textarea'); document.body.appendChild(input); input.focus();
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 });
    resize(400);
    expect(result.current.keyboardOpen).toBe(true);
  });
  it('does not hide navigation for desktop window resizing and cleans every listener and scheduled frame', () => {
    coarse = false;
    const removeVisual = vi.spyOn(visual, 'removeEventListener');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const { result, unmount } = renderHook(() => useChatViewport());
    const input = document.createElement('textarea'); document.body.appendChild(input); input.focus();
    resize(400);
    expect(result.current.keyboardOpen).toBe(false);
    visual.dispatchEvent(new Event('scroll'));
    unmount();
    expect(removeVisual.mock.calls.map(call => call[0])).toEqual(['resize', 'scroll']);
    expect(removeWindow).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith('focusin', expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith('focusout', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
  it('works without VisualViewport and adds no listeners when disabled', () => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
    const add = vi.spyOn(window, 'addEventListener');
    const { result } = renderHook(() => useChatViewport(false));
    expect(result.current.height).toBe(844);
    expect(result.current.keyboardOpen).toBe(false);
    expect(add).not.toHaveBeenCalledWith('resize', expect.any(Function));
  });
});


describe('Tutor keyboard navigation', () => {
  it('hides and makes mobile navigation inert only for a confirmed software keyboard', () => {
    render(<MemoryRouter initialEntries={['/chat']}><BottomNav /></MemoryRouter>);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const input = document.createElement('textarea'); document.body.appendChild(input); input.focus();
    resize(400);
    expect(nav).toHaveAttribute('hidden');
    expect(nav).toHaveAttribute('inert');
    expect(screen.queryByRole('link', { name: 'Today' })).not.toBeInTheDocument();
    resize(844);
    expect(nav).not.toHaveAttribute('hidden');
    expect(nav).not.toHaveAttribute('inert');
    expect(screen.getByRole('link', { name: 'Today' })).toBeInTheDocument();
  });
  it('keeps wide navigation available when a touch keyboard opens', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 844 });
    render(<MemoryRouter initialEntries={['/chat']}><BottomNav /></MemoryRouter>);
    const input = document.createElement('textarea'); document.body.appendChild(input); input.focus();
    resize(400);
    expect(screen.getByRole('navigation', { name: 'Primary' })).not.toHaveAttribute('hidden');
    expect(screen.getByRole('link', { name: 'Today' })).toBeInTheDocument();
  });
});
