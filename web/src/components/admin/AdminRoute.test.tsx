import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminRoute } from './AdminRoute';
const auth = vi.hoisted(() => ({ isLoaded: false, user: null as null | { publicMetadata: { role: string } } }));
vi.mock('@clerk/clerk-react', () => ({ useUser: () => auth }));
afterEach(() => { vi.useRealTimers(); auth.isLoaded = false; auth.user = null; });
it('offers recovery without exposing protected content when auth stalls', () => {
  vi.useFakeTimers();
  const { rerender } = render(<MemoryRouter><AdminRoute><p>Private admin content</p></AdminRoute></MemoryRouter>);
  expect(screen.queryByText('Private admin content')).not.toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(3000); });
  expect(screen.getByRole('alert')).toHaveTextContent('We could not check your sign-in');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  auth.isLoaded = true; auth.user = { publicMetadata: { role: 'admin' } };
  rerender(<MemoryRouter><AdminRoute><p>Private admin content</p></AdminRoute></MemoryRouter>);
  expect(screen.getByText('Private admin content')).toBeInTheDocument();
});
