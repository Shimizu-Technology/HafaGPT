import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3,
  Settings,
  ArrowLeft,
  Menu,
  X,
  Shield,
  Moon,
  Sun
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { user } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-800 border-r border-cream-200 dark:border-slate-700 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-cream-200 dark:border-slate-700">
          <Link to="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Shield className="w-6 h-6 text-coral-500 dark:text-ocean-400" />
            <span className="font-bold text-brown-800 dark:text-white">Admin</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-cream-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5 text-brown-600 dark:text-gray-400" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors
                  ${isActive 
                    ? 'bg-coral-100 dark:bg-ocean-900/30 text-coral-600 dark:text-ocean-400' 
                    : 'text-brown-600 dark:text-gray-400 hover:bg-cream-100 dark:hover:bg-slate-700'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cream-200 dark:border-slate-700">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-brown-600 dark:text-gray-400 hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to App
          </Link>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-cream-200 dark:border-slate-700 sticky top-0 z-30">
          <div className="px-4 py-3 flex items-center justify-between safe-area-top">
            {/* Mobile menu button */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-cream-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <Menu className="w-5 h-5 text-brown-600 dark:text-gray-400" />
            </button>
            
            {/* Page title - shows on mobile */}
            <div className="lg:hidden font-semibold text-brown-800 dark:text-white">
              Admin Dashboard
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                aria-label="Toggle theme"
              >
                {theme === 'light' 
                  ? <Moon className="w-5 h-5 text-brown-600 dark:text-gray-400" /> 
                  : <Sun className="w-5 h-5 text-brown-600 dark:text-gray-400" />
                }
              </button>
              
              {user && (
                <div className="flex items-center gap-2">
                  {user.imageUrl && (
                    <img 
                      src={user.imageUrl} 
                      alt={user.firstName || 'Admin'} 
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="hidden sm:inline text-sm font-medium text-brown-700 dark:text-gray-300">
                    {user.firstName || user.emailAddresses[0]?.emailAddress}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;

