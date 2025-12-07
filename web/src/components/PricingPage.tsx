import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, SignInButton, PricingTable, useClerk } from '@clerk/clerk-react';
import { 
  ArrowLeft, 
  Check, 
  Sparkles, 
  MessageSquare, 
  Gamepad2, 
  GraduationCap, 
  BookOpen,
  Users,
  Heart,
  Zap,
  Crown,
  ChevronDown,
  Settings
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

const features = {
  free: [
    { text: "5 AI chat messages per day", icon: MessageSquare },
    { text: "5 learning games per day", icon: Gamepad2 },
    { text: "3 quizzes per day", icon: GraduationCap },
    { text: "Unlimited vocabulary browsing", icon: BookOpen },
    { text: "Daily word & stories", icon: BookOpen },
  ],
  premium: [
    { text: "Unlimited AI chat conversations", icon: MessageSquare, highlight: true },
    { text: "Unlimited learning games", icon: Gamepad2, highlight: true },
    { text: "Unlimited quizzes", icon: GraduationCap, highlight: true },
    { text: "Unlimited vocabulary browsing", icon: BookOpen },
    { text: "Daily word & stories", icon: BookOpen },
    { text: "Priority support", icon: Users },
    { text: "Support Chamorro language learning", icon: Heart, highlight: true },
  ],
};

export function PricingPage() {
  const { isSignedIn } = useAuth();
  const { openUserProfile } = useClerk();
  const { isPremium, isLoading: subscriptionLoading } = useSubscription();
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header - Not sticky to allow Clerk checkout panel full visibility */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-cream-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-brown-600 dark:text-gray-400 hover:text-brown-800 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white">
              Choose Your Plan
            </h1>
          </div>
          <div className="w-20 sm:w-24" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-coral-100 dark:bg-ocean-900/30 rounded-full text-coral-600 dark:text-ocean-400 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Start learning Chamorro today
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-brown-800 dark:text-white mb-3">
            Unlock Unlimited Learning
          </h2>
          <p className="text-brown-600 dark:text-gray-400 max-w-xl mx-auto">
            Master the Chamorro language with our AI-powered platform. 
            Upgrade to Premium for unlimited access to all features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 items-stretch">
          {/* Free Plan */}
          <div className="flex flex-col bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-cream-200 dark:border-slate-700 shadow-lg">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-brown-800 dark:text-white mb-1">
                Free
              </h3>
              <p className="text-sm text-brown-600 dark:text-gray-400">
                Great for exploring
              </p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-brown-800 dark:text-white">$0</span>
              <span className="text-brown-600 dark:text-gray-400">/month</span>
            </div>

            <ul className="space-y-3 flex-1">
              {features.free.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-cream-100 dark:bg-slate-700 flex items-center justify-center mt-0.5">
                      <Icon className="w-3 h-3 text-brown-500 dark:text-gray-400" />
                    </div>
                    <span className="text-sm text-brown-700 dark:text-gray-300">
                      {feature.text}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8">
              {!isSignedIn ? (
                <SignInButton mode="modal">
                  <button className="w-full px-6 py-3 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors">
                    Sign Up Free
                  </button>
                </SignInButton>
              ) : isPremium ? (
                <div className="w-full px-6 py-3 bg-cream-100/50 dark:bg-slate-700/50 text-brown-500 dark:text-gray-500 font-semibold rounded-xl text-center">
                  Free Plan
                </div>
              ) : (
                <div className="w-full px-6 py-3 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 font-semibold rounded-xl text-center">
                  ✓ Current Plan
                </div>
              )}
            </div>
          </div>

          {/* Premium Plan */}
          <div className="relative flex flex-col bg-gradient-to-br from-coral-50 to-coral-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 sm:p-8 border-2 border-coral-300 dark:border-ocean-400 shadow-xl dark:shadow-ocean-500/20">
            {/* Popular badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white text-xs font-semibold rounded-full shadow-lg">
                <Crown className="w-3 h-3" />
                MOST POPULAR
              </div>
            </div>

            <div className="mb-6 mt-2">
              <h3 className="text-lg font-semibold text-brown-800 dark:text-white mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Premium
              </h3>
              <p className="text-sm text-brown-600 dark:text-gray-400">
                Unlimited learning
              </p>
            </div>

            <div className="mb-2">
              <span className="text-4xl font-bold text-brown-800 dark:text-white">$4.99</span>
              <span className="text-brown-600 dark:text-gray-400">/month</span>
            </div>
            <div className="mb-6 flex items-center gap-2">
              <span className="text-sm text-brown-600 dark:text-gray-400">
                or $39.99/year
              </span>
              <span className="text-xs px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full font-medium">
                Save 33%
              </span>
            </div>

            <ul className="space-y-3 flex-1">
              {features.premium.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <li key={index} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                      feature.highlight 
                        ? 'bg-coral-200 dark:bg-ocean-500/30' 
                        : 'bg-coral-100/50 dark:bg-slate-700'
                    }`}>
                      {feature.highlight ? (
                        <Check className="w-3 h-3 text-coral-600 dark:text-ocean-300" />
                      ) : (
                        <Icon className="w-3 h-3 text-brown-500 dark:text-gray-400" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      feature.highlight 
                        ? 'text-brown-800 dark:text-white font-medium' 
                        : 'text-brown-700 dark:text-gray-300'
                    }`}>
                      {feature.text}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Action Area */}
            <div className="mt-8">
              {!isSignedIn ? (
                <SignInButton mode="modal">
                  <button className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg">
                    <Zap className="w-5 h-5" />
                    Sign Up & Upgrade
                  </button>
                </SignInButton>
              ) : isPremium ? (
                /* Already subscribed - show current plan status */
                <div className="space-y-3">
                  <div className="w-full px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white font-semibold rounded-xl text-center">
                    ✓ Current Plan
                  </div>
                  <button
                    onClick={() => openUserProfile()}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white/50 dark:bg-slate-700/50 text-brown-700 dark:text-gray-300 font-medium rounded-lg hover:bg-white/70 dark:hover:bg-slate-700/70 transition-colors text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    Manage Subscription
                  </button>
                </div>
              ) : subscriptionLoading ? (
                /* Loading state */
                <div className="w-full px-6 py-3 bg-cream-200 dark:bg-slate-700 text-brown-600 dark:text-gray-400 font-semibold rounded-xl text-center animate-pulse">
                  Loading...
                </div>
              ) : (
                /* Accordion checkout for non-premium signed-in users */
                <div className="space-y-3">
                  {/* Upgrade Button */}
                  <button 
                    onClick={() => setShowCheckout(!showCheckout)}
                    className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg"
                  >
                    <Zap className="w-5 h-5" />
                    {showCheckout ? 'Hide Options' : 'Upgrade Now'}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showCheckout ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Expandable Checkout Section */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    showCheckout ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="pt-2">
                      <div className="pricing-table-compact bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
                        <style>{`
                          .pricing-table-compact [data-localization-key*="free"],
                          .pricing-table-compact > div > div > div:first-child {
                            display: none !important;
                          }
                        `}</style>
                        <PricingTable />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-brown-800 dark:text-white text-center mb-6">
            Frequently Asked Questions
          </h3>
          
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-cream-200 dark:border-slate-700">
              <h4 className="font-semibold text-brown-800 dark:text-white mb-2">
                When do my free uses reset?
              </h4>
              <p className="text-sm text-brown-600 dark:text-gray-400">
                Your daily limits reset at midnight (Guam time) every day. Come back tomorrow for more free uses!
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-cream-200 dark:border-slate-700">
              <h4 className="font-semibold text-brown-800 dark:text-white mb-2">
                Can I cancel my subscription?
              </h4>
              <p className="text-sm text-brown-600 dark:text-gray-400">
                Yes! You can cancel anytime from your account settings. You'll keep Premium access until the end of your billing period.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-cream-200 dark:border-slate-700">
              <h4 className="font-semibold text-brown-800 dark:text-white mb-2">
                How does my subscription help?
              </h4>
              <p className="text-sm text-brown-600 dark:text-gray-400">
                Your subscription helps us keep HåfaGPT running and supports our mission to make Chamorro language learning accessible to everyone. Si Yu'us Ma'åse'! 🌺
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-brown-600 dark:text-gray-400 text-sm mb-4">
            Questions? Contact us at{' '}
            <a 
              href="mailto:shimizutechnology@gmail.com" 
              className="text-coral-600 dark:text-ocean-400 hover:underline"
            >
              shimizutechnology@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PricingPage;
