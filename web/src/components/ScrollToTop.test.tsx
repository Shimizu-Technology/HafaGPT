import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ScrollToTop } from './ScrollToTop';

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
});
afterEach(() => { vi.restoreAllMocks(); });

function Page({ title }: { title: string }) {
  const navigate = useNavigate();
  return <main><h1>{title}</h1><button onClick={() => navigate('/about')}>About</button><input aria-label="Search" onChange={e => navigate(`?q=${e.target.value}`, { replace: true })} /></main>;
}
function setup() {
  const router = createMemoryRouter([{ element: <><ScrollToTop /><Outlet /></>, children: [
    { path: '/support', element: <Page title="Support" /> },
    { path: '/about', element: <Page title="About" /> },
    { path: '/chat/:id?', element: <main><h1>Chat</h1><div data-testid="messages" /></main> },
  ] }], { initialEntries: ['/support'] });
  const view = render(<RouterProvider router={router} />, { container: document.body.appendChild(Object.assign(document.createElement('div'), { id: 'root' })) });
  return { router, root: view.container };
}

it('resets the actual root on PUSH, focuses the heading, and restores both POP entries', async () => {
  const { router, root } = setup();
  root.scrollTop = 640;
  fireEvent.scroll(root);
  fireEvent.click(screen.getByRole('button', { name: 'About' }));
  expect(root.scrollTop).toBe(0);
  expect(screen.getByRole('heading', { name: 'About' })).toHaveFocus();
  root.scrollTop = 220;
  fireEvent.scroll(root);
  await act(async () => { await router.navigate(-1); });
  expect(root.scrollTop).toBe(640);
  expect(screen.getByRole('heading', { name: 'Support' })).toHaveFocus();
  await act(async () => { await router.navigate(1); });
  expect(root.scrollTop).toBe(220);
});

it('does not steal focus on same-page query changes or alter the nested chat scroller', async () => {
  const { router } = setup();
  const input = screen.getByRole('textbox');
  input.focus();
  fireEvent.change(input, { target: { value: 'hello' } });
  expect(input).toHaveFocus();
  await act(async () => { await router.navigate('/chat'); });
  const messages = screen.getByTestId('messages');
  messages.scrollTop = 123;
  await act(async () => { await router.navigate('/chat/saved', { replace: true }); });
  expect(messages.scrollTop).toBe(123);
});

it('waits for async content to restore a POP offset and focus the arriving heading', async () => {
  let ready = true;
  let setReady: ((value: boolean) => void) | undefined;
  // A short loading state clamps the root just as a real async route does.
  function AsyncSupport() {
    const [loaded, update] = useState(ready);
    setReady = update;
    return loaded ? <main><h1>Async support</h1></main> : <div>Loading…</div>;
  }
  const root = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'root' }));
  let offset = 0;
  Object.defineProperty(root, 'scrollTop', { configurable: true, get: () => offset, set: value => { offset = ready ? value : 0; } });
  const router = createMemoryRouter([{ element: <><ScrollToTop /><Outlet /></>, children: [
    { path: '/support', element: <AsyncSupport /> },
    { path: '/about', element: <main><h1>About</h1></main> },
  ] }], { initialEntries: ['/support'] });
  render(<RouterProvider router={router} />, { container: root });
  root.scrollTop = 500;
  fireEvent.scroll(root);
  await act(async () => { await router.navigate('/about'); });
  ready = false;
  await act(async () => { await router.navigate(-1); });
  expect(root.scrollTop).toBe(0);
  expect(screen.queryByRole('heading', { name: 'Async support' })).not.toBeInTheDocument();
  await act(async () => { ready = true; setReady?.(true); });
  expect(root.scrollTop).toBe(500);
  expect(screen.getByRole('heading', { name: 'Async support' })).toHaveFocus();
});
