import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Map, Library } from 'lucide-react';
import { useChatViewport } from '../hooks/useChatViewport';

const destinations = [
  { to: '/', label: 'Today', icon: Home, paths: ['/'] },
  { to: '/chat', label: 'Tutor', icon: MessageSquare, paths: ['/chat', '/practice'] },
  { to: '/learning', label: 'Learn', icon: Map, paths: ['/learning', '/learn'] },
  { to: '/library', label: 'Library', icon: Library, paths: ['/library', '/vocabulary', '/stories', '/flashcards', '/quiz', '/games'] },
];

/** Four shared destinations; every learning tool remains directly addressable. */
export function BottomNav() {
  const { pathname } = useLocation();
  const tutor = pathname === '/chat' || pathname.startsWith('/chat/');
  const { keyboardOpen } = useChatViewport(tutor);
  const keyboardHidden = tutor && keyboardOpen;
  if (pathname.startsWith('/admin') || pathname.startsWith('/share/')) return null;
  const immersive = pathname !== '/flashcards/my-decks' && ['/quiz/', '/flashcards/', '/stories/', '/practice/', '/games/', '/learn/'].some(path => pathname.startsWith(path));
  return (
    <nav aria-label="Primary" hidden={keyboardHidden} aria-hidden={keyboardHidden || undefined} {...(keyboardHidden ? { inert: '' } : {})} className={`${keyboardHidden ? '!hidden' : ''} border-cream-200 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95 sm:relative sm:border-b ${immersive ? 'hidden sm:block' : 'fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-sm safe-area-bottom sm:block sm:border-t-0'}`}>
      <div className="mx-auto grid min-h-16 max-w-6xl grid-cols-4 items-stretch gap-0 px-0 py-1 sm:min-h-12 sm:max-w-2xl">
        {destinations.map(({ to, label, icon: Icon, paths }) => {
          const active = paths.some(path => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`));
          return (
            <Link key={to} to={to} aria-current={active ? 'page' : undefined} className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-[2px] py-1 text-center [overflow-wrap:anywhere] text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 sm:flex-row sm:gap-2 sm:text-sm ${active ? 'text-coral-700 dark:text-ocean-300 sm:bg-coral-50 sm:dark:bg-ocean-950' : 'text-brown-600 hover:bg-cream-100 dark:text-gray-300 dark:hover:bg-slate-800'}`}>
              <Icon className="h-[20px] w-[20px] flex-none" aria-hidden="true" />{label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
