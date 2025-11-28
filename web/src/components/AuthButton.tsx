import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';

export function AuthButton() {
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
            elements: {
              avatarBox: "w-8 h-8 sm:w-9 sm:h-9",
              userButtonPopoverCard: "rounded-xl shadow-xl",
              userButtonPopoverActionButton: "hover:bg-teal-50 dark:hover:bg-gray-800",
            }
          }}
          // Center the popover on mobile, default alignment on desktop
          userProfileMode="modal"
          userProfileProps={{
            appearance: {
              elements: {
                modalContent: "mx-auto"
              }
            }
          }}
        />
      </SignedIn>
    </>
  );
}

