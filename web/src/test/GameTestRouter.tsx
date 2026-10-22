import { createContext, useContext, useState, type ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

const Content = createContext<ReactNode>(null);
function Contents() { return useContext(Content); }
export function GameTestRouter({ children, initialEntries = ['/'], initialIndex }: { children: ReactNode; initialEntries?: string[]; initialIndex?: number }) {
  const [router] = useState(() => createMemoryRouter([{ path: '*', element: <Contents /> }], { initialEntries, initialIndex }));
  return <Content.Provider value={children}><RouterProvider router={router} /></Content.Provider>;
}
