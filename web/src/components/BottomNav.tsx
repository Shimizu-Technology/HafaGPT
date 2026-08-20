import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  Map as MapIcon,
  Gamepad2,
  Menu,
  X,
  Brain,
  Book,
  BookMarked,
  MessagesSquare,
  Settings,
  Layers
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  to: string;
  matchPaths?: string[];
}

export function BottomNav() {
  const location = useLocation();
  const { user } = useUser();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreDialogRef = useRef<HTMLDivElement>(null);
  const closeMoreButtonRef = useRef<HTMLButtonElement>(null);
  
  // Don't show on detail/session pages where full-screen experience is needed
  const hiddenPaths = ['/quiz/', '/flashcards/', '/stories/', '/practice/', '/games/', '/learn/'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  const isNavigationHidden = shouldHide || location.pathname.startsWith('/share/') || location.pathname.startsWith('/admin');

  useEffect(() => {
    setShowMoreMenu(false);
  }, [location.pathname]);

  useModalAccessibility({
    isOpen: showMoreMenu && !isNavigationHidden,
    onClose: () => setShowMoreMenu(false),
    dialogRef: moreDialogRef,
    initialFocusRef: closeMoreButtonRef,
  });
  
  // Also hide on shared conversation page and admin pages
  if (isNavigationHidden) {
    return null;
  }

  const mainNavItems: NavItem[] = [
    { 
      icon: <Home className="w-5 h-5" />, 
      label: 'Home', 
      to: '/',
      matchPaths: ['/']
    },
    { 
      icon: <MessageSquare className="w-5 h-5" />, 
      label: 'Chat', 
      to: '/chat',
      matchPaths: ['/chat']
    },
    { 
      icon: <MapIcon className="w-5 h-5" />, 
      label: 'Learn', 
      to: '/learning',
      matchPaths: ['/learning', '/learn']
    },
    { 
      icon: <Gamepad2 className="w-5 h-5" />, 
      label: 'Games', 
      to: '/games',
      matchPaths: ['/games']
    },
  ];

  const moreMenuItems = [
    { icon: <Layers className="w-5 h-5" />, label: 'Flashcards', to: '/flashcards' },
    { icon: <Brain className="w-5 h-5" />, label: 'Quizzes', to: '/quiz' },
    { icon: <Book className="w-5 h-5" />, label: 'Vocabulary', to: '/vocabulary' },
    { icon: <BookMarked className="w-5 h-5" />, label: 'Stories', to: '/stories' },
    { icon: <MessagesSquare className="w-5 h-5" />, label: 'Practice', to: '/practice' },
    ...(user ? [
      { icon: <Settings className="w-5 h-5" />, label: 'Settings', to: '/settings' },
    ] : []),
  ];

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(path => 
        path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
      );
    }
    return location.pathname === item.to;
  };
  const moreIsActive = moreMenuItems.some((item) => location.pathname.startsWith(item.to));

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setShowMoreMenu(false)}
          aria-hidden="true"
        />
      )}

      {/* More Menu Panel */}
      {showMoreMenu && (
        <div
          ref={moreDialogRef}
          id="more-navigation-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="more-navigation-title"
          tabIndex={-1}
          className="fixed left-0 right-0 bg-white dark:bg-slate-800 border-t border-cream-200 dark:border-slate-700 rounded-t-2xl shadow-2xl z-50 sm:hidden animate-slide-up above-bottom-nav"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 id="more-navigation-title" className="font-semibold text-brown-800 dark:text-white">More ways to learn</h2>
              <button
                ref={closeMoreButtonRef}
                type="button"
                onClick={() => setShowMoreMenu(false)}
                aria-label="Close more navigation"
                className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-cream-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5 text-brown-600 dark:text-gray-400" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreMenuItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMoreMenu(false)}
                  aria-current={location.pathname.startsWith(item.to) ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${
                    location.pathname.startsWith(item.to)
                      ? 'bg-coral-100 dark:bg-ocean-900/30 text-coral-600 dark:text-ocean-400'
                      : 'hover:bg-cream-100 dark:hover:bg-slate-700 text-brown-600 dark:text-gray-400'
                  }`}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav aria-label="Primary" className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-t border-cream-200 dark:border-slate-700 z-40 sm:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {mainNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setShowMoreMenu(false)}
              aria-current={isActive(item) ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[64px] transition-colors ${
                isActive(item)
                  ? 'text-coral-600 dark:text-ocean-400'
                  : 'text-brown-500 dark:text-gray-500 hover:text-brown-700 dark:hover:text-gray-300'
              }`}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span className={`text-[10px] font-medium ${
                isActive(item) ? 'text-coral-600 dark:text-ocean-400' : ''
              }`}>
                {item.label}
              </span>
            </Link>
          ))}
          
          {/* More button */}
          <button
            ref={moreButtonRef}
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            aria-expanded={showMoreMenu}
            aria-controls="more-navigation-dialog"
            aria-haspopup="dialog"
            aria-label="More ways to learn"
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[64px] transition-colors ${
              showMoreMenu || moreIsActive
                ? 'text-coral-600 dark:text-ocean-400'
                : 'text-brown-500 dark:text-gray-500 hover:text-brown-700 dark:hover:text-gray-300'
            }`}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
            <span className={`text-[10px] font-medium ${
              showMoreMenu ? 'text-coral-600 dark:text-ocean-400' : ''
            }`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
