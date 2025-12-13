import { useState, useEffect } from 'react';
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { Sparkles, Settings, Shield, Sliders } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';

export function AuthButton() {
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';
  
  // Check dark mode from DOM directly (syncs with global theme toggle)
  const [isDark, setIsDark] = useState(() => 
    document.documentElement.classList.contains('dark')
  );
  
  // Listen for theme changes via MutationObserver
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Show sign in button when logged out */}
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-teal-500 hover:bg-teal-600 dark:bg-ocean-500 dark:hover:bg-ocean-600 text-white rounded-lg sm:rounded-xl transition-all duration-200 text-xs sm:text-sm font-medium shadow-sm hover:shadow-md active:scale-95">
            Sign In
          </button>
        </SignInButton>
      </SignedOut>
      
      {/* Show user profile button when logged in */}
      <SignedIn>
        <UserButton 
          afterSignOutUrl="/"
          appearance={{
            baseTheme: isDark ? dark : undefined,
            elements: {
              avatarBox: "w-8 h-8 sm:w-9 sm:h-9",
              userButtonPopoverCard: "rounded-xl shadow-xl",
              userButtonPopoverActionButton: isDark ? "hover:bg-gray-800" : "hover:bg-teal-50",
            }
          }}
          // Center the popover on mobile, default alignment on desktop
          userProfileMode="modal"
          userProfileProps={{
            appearance: {
              baseTheme: isDark ? dark : undefined,
              elements: {
                modalContent: "mx-auto"
              }
            }
          }}
        >
          {/* Custom menu items */}
          <UserButton.MenuItems>
            {/* Admin Dashboard link - only for admins */}
            {isAdmin && (
              <UserButton.Action
                label="Admin Dashboard"
                labelIcon={<Shield className="w-4 h-4" style={{ color: '#ef4444' }} />}
                onClick={() => navigate('/admin')}
              />
            )}
            {/* Learning Preferences / Settings */}
            <UserButton.Action
              label="Learning Preferences"
              labelIcon={<Sliders className="w-4 h-4" style={{ color: isDark ? '#60a5fa' : '#0891b2' }} />}
              onClick={() => navigate('/settings')}
            />
            {/* Subscription management */}
            {isPremium ? (
              <UserButton.Action
                label="Manage Subscription"
                labelIcon={<Settings className="w-4 h-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }} />}
                onClick={() => navigate('/pricing')}
              />
            ) : (
              <UserButton.Action
                label="Upgrade to Premium"
                labelIcon={<Sparkles className="w-4 h-4 text-amber-500" />}
                onClick={() => navigate('/pricing')}
              />
            )}
          </UserButton.MenuItems>
        </UserButton>
      </SignedIn>
    </>
  );
}

