import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const chunk = vi.hoisted(() => ({ user: null as null | { id: string } }));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: chunk.user }),
}));

vi.mock('../hooks/useSubscription', () => ({
  usePromoStatus: () => ({ data: undefined }),
}));

function Bar({ BottomNav }: { BottomNav: ComponentType }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <BottomNav />
      <main><h1>Page content</h1></main>
    </MemoryRouter>
  );
}

// The account slot keeps module-level lazy state, so each test loads a fresh BottomNav
// whose first import of the account chunk fails.
async function renderBar(mockChunk: () => Record<string, unknown> = () => {
  throw new Error('Failed to fetch dynamically imported module: AuthButton');
}) {
  vi.resetModules();
  vi.doMock('./AuthButton', mockChunk);
  const { BottomNav } = await import('./BottomNav');
  return { ...render(<Bar BottomNav={BottomNav} />), BottomNav };
}

function slotWidths() {
  return {
    settings: document.querySelector('[data-slot="settings"]')!.className,
    account: document.querySelector('[data-slot="account"]')!.className,
  };
}

describe('app bar account slot', () => {
  beforeEach(() => {
    chunk.user = null;
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('640px'), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('keeps the nav and page when the account chunk fails, and offers a working fallback', async () => {
    const recover = vi.fn().mockResolvedValue(undefined);
    window.__hafagptRecoverStaleBuild = recover;
    await renderBar();

    const fallback = await screen.findByRole('link', { name: 'Account and settings' });
    expect(fallback).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('button', { name: 'Retry loading the account menu' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Primary' })).getAllByRole('link')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Page content' })).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Application Error/i)).not.toBeInTheDocument();
    expect(recover).toHaveBeenCalled();
    delete window.__hafagptRecoverStaleBuild;
  });

  it('retries the account chunk and swaps the fallback for the real control', async () => {
    // The chunk's export is unreadable until the "network" recovers, then the next load succeeds.
    let recovered = false;
    await renderBar(() => ({
      get AuthButton() {
        if (!recovered) throw new Error('Failed to fetch dynamically imported module: AuthButton');
        return () => <button type="button">Sign In</button>;
      },
    }));
    const retry = await screen.findByRole('button', { name: 'Retry loading the account menu' });

    recovered = true;
    fireEvent.click(retry);

    expect(await screen.findByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Account and settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Page content' })).toBeInTheDocument();
  });

  it('reserves the same fixed-width slots while loading, as a guest, after a failure, and when signed in', async () => {
    const view = await renderBar();
    const loading = slotWidths();
    expect(loading.settings).toContain('w-11');
    expect(loading.account).toContain('w-[5.5rem]');
    expect(document.querySelector('[data-slot="settings"] a')).toBeNull();

    // Chunk failure: fallback replaces the control inside the same slot.
    await screen.findByRole('link', { name: 'Account and settings' });
    expect(slotWidths()).toEqual(loading);

    // Signed in: the Settings link fills its reserved slot instead of inserting a new one.
    chunk.user = { id: 'user_1' };
    view.rerender(<Bar BottomNav={view.BottomNav} />);
    await waitFor(() => expect(screen.getByRole('link', { name: 'Learning settings' })).toBeInTheDocument());
    expect(slotWidths()).toEqual(loading);
    expect(document.querySelector('[data-slot="settings"]')).toContainElement(screen.getByRole('link', { name: 'Learning settings' }));
  });
});
