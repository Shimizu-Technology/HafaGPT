import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLayout } from './AdminLayout';

vi.mock('@clerk/clerk-react', () => ({ useUser: () => ({ user: null }) }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));

let desktop: boolean;
let notifyResize: (() => void) | undefined;

beforeEach(() => {
  desktop = false;
  notifyResize = undefined;
  vi.stubGlobal('matchMedia', () => ({
    get matches() { return desktop; },
    addEventListener: (_event: string, listener: () => void) => { notifyResize = listener; },
    removeEventListener: vi.fn(),
  }));
  // jsdom has no native modal behavior. Exercise our controlled open/close state;
  // actual focus containment and return are checked in the browser.
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});

function openNavigation() {
  fireEvent.click(screen.getByRole('button', { name: 'Open admin navigation' }));
  return screen.getByRole('dialog', { name: 'Admin navigation' });
}

describe('Admin mobile navigation', () => {
  it('keeps the closed drawer inaccessible and restores page scrolling on cancel', () => {
    document.body.style.overflow = 'auto';
    render(<MemoryRouter><AdminLayout><p>Dashboard content</p></AdminLayout></MemoryRouter>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const drawer = openNavigation();
    expect(screen.getByRole('button', { name: 'Open admin navigation' })).toHaveAttribute('aria-expanded', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent(drawer, new Event('cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('closes after navigation and marks the new destination', () => {
    render(<MemoryRouter><AdminLayout><p>Dashboard content</p></AdminLayout></MemoryRouter>);
    fireEvent.click(within(openNavigation()).getByRole('link', { name: 'Analytics' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
    expect(within(openNavigation()).getByRole('link', { name: 'Analytics' })).toHaveAttribute('aria-current', 'page');
  });

  it('releases the modal when the viewport becomes desktop', () => {
    render(<MemoryRouter><AdminLayout><p>Dashboard content</p></AdminLayout></MemoryRouter>);
    openNavigation();
    desktop = true;
    // The real MediaQueryList fires a change event at the lg breakpoint.
    act(() => notifyResize?.());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});


function DashboardRoute() {
  return <AdminLayout><h1>Dashboard page</h1></AdminLayout>;
}

function AnalyticsRoute() {
  return <AdminLayout><h1>Analytics page</h1></AdminLayout>;
}

it('focuses the new route main when navigation unmounts the previous page layout', () => {
  document.body.style.overflow = 'auto';
  render(<MemoryRouter initialEntries={['/admin']}><Routes>
    <Route path="/admin" element={<DashboardRoute />} />
    <Route path="/admin/analytics" element={<AnalyticsRoute />} />
  </Routes></MemoryRouter>);
  const oldMain = screen.getByRole('main');
  expect(oldMain).toHaveFocus();
  const destinationLink = within(openNavigation()).getByRole('link', { name: 'Analytics' });
  destinationLink.focus();
  expect(destinationLink).toHaveFocus();
  fireEvent.click(destinationLink);
  const newMain = screen.getByRole('main');
  expect(screen.getByRole('heading', { name: 'Analytics page' })).toBeInTheDocument();
  expect(oldMain.isConnected).toBe(false);
  expect(destinationLink.isConnected).toBe(false);
  expect(newMain).not.toBe(oldMain);
  expect(newMain).toHaveAttribute('tabindex', '-1');
  expect(newMain).toHaveFocus();
  expect(document.body).not.toHaveFocus();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open admin navigation' })).toHaveAttribute('aria-expanded', 'false');
  expect(document.body.style.overflow).toBe('auto');
});
