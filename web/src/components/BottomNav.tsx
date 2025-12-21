import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  BookOpen, 
  Gamepad2,
  Menu,
  X,
  Brain,
  Book,
  BookMarked,
  MessagesSquare,
  Settings,
  Calendar
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

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
  
  // Don't show on detail/session pages where full-screen experience is needed
  const hiddenPaths = ['/quiz/', '/flashcards/', '/stories/', '/practice/', '/games/'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  
  // Also hide on shared conversation page and admin pages
  if (shouldHide || location.pathname.startsWith('/share/') || location.pathname.startsWith('/admin')) {
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
      icon: <BookOpen className="w-5 h-5" />, 
      label: 'Learn', 
      to: '/flashcards',
      matchPaths: ['/flashcards', '/quiz', '/stories', '/vocabulary', '/practice']
    },
    { 
      icon: <Gamepad2 className="w-5 h-5" />, 
      label: 'Games', 
      to: '/games',
      matchPaths: ['/games']
    },
  ];

  const moreMenuItems = [
    { icon: <Brain className="w-5 h-5" />, label: 'Quizzes', to: '/quiz' },
    { icon: <Book className="w-5 h-5" />, label: 'Vocabulary', to: '/vocabulary' },
    { icon: <BookMarked className="w-5 h-5" />, label: 'Stories', to: '/stories' },
    { icon: <MessagesSquare className="w-5 h-5" />, label: 'Practice', to: '/practice' },
    { icon: <Calendar className="w-5 h-5" />, label: 'Daily Word', to: '/daily-word' },
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

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* More Menu Panel */}
      {showMoreMenu && (
        <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-slate-800 border-t border-cream-200 dark:border-slate-700 rounded-t-2xl shadow-2xl z-50 sm:hidden animate-slide-up">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-brown-800 dark:text-white">More</h3>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-lg hover:bg-cream-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5 text-brown-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreMenuItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMoreMenu(false)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${
                    location.pathname.startsWith(item.to)
                      ? 'bg-coral-100 dark:bg-ocean-900/30 text-coral-600 dark:text-ocean-400'
                      : 'hover:bg-cream-100 dark:hover:bg-slate-700 text-brown-600 dark:text-gray-400'
                  }`}
                >
                  {item.icon}
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-t border-cream-200 dark:border-slate-700 z-40 sm:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {mainNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[64px] transition-colors ${
                isActive(item)
                  ? 'text-coral-600 dark:text-ocean-400'
                  : 'text-brown-500 dark:text-gray-500 hover:text-brown-700 dark:hover:text-gray-300'
              }`}
            >
              {item.icon}
              <span className={`text-[10px] font-medium ${
                isActive(item) ? 'text-coral-600 dark:text-ocean-400' : ''
              }`}>
                {item.label}
              </span>
            </Link>
          ))}
          
          {/* More button */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[64px] transition-colors ${
              showMoreMenu
                ? 'text-coral-600 dark:text-ocean-400'
                : 'text-brown-500 dark:text-gray-500 hover:text-brown-700 dark:hover:text-gray-300'
            }`}
          >
            <Menu className="w-5 h-5" />
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
