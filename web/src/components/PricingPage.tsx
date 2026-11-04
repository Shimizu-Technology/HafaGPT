import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, SignUpButton, PricingTable, useClerk } from '@clerk/clerk-react';
import { Crown, ChevronDown, Settings } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { getFreeLimitLabel, PREMIUM_PRICING } from '../lib/planConfig';
import { PublicPage } from './PublicPage';

const primaryAction = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-action px-3 py-3 font-semibold text-white transition-colors duration-150 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2';
const secondaryAction = 'flex min-h-12 w-full items-center justify-center rounded-xl bg-cream-100 px-3 py-3 font-semibold text-brown-800 transition-colors duration-150 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-brown-700 dark:text-cream-100 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-brown-600';

export function PricingPage() {
  const { isSignedIn } = useAuth();
  const { openUserProfile } = useClerk();
  const { isPremium, isLoading: subscriptionLoading } = useSubscription();
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <PublicPage title="Plans" titleAs="p" subtitle="Compare current access and subscription options" icon={Crown} maxWidthClassName="max-w-5xl" stickyHeader={false}>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-brown-800 dark:text-cream-100 sm:text-4xl">Plans and prices</h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-brown-600 dark:text-brown-100">Start free, or choose Premium for unlimited chat, games, and quizzes.</p>
      </div>

      <section aria-label="Plans at a glance" className="mb-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3 sm:gap-5">
          <article aria-labelledby="free-plan" className="flex min-w-0 flex-col rounded-2xl border border-cream-200 bg-white p-3 dark:border-brown-700 dark:bg-brown-900 sm:p-5">
            <h2 id="free-plan" className="text-lg font-bold text-brown-950 dark:text-cream-100">Free</h2>
            <p className="mt-2 text-base text-brown-600 dark:text-brown-100"><strong className="text-2xl text-brown-950 dark:text-cream-100">$0</strong><span className="block sm:inline"> /month</span></p>
            <ul className="my-4 space-y-2 text-base text-brown-700 dark:text-cream-200">
              {(['chat', 'game', 'quiz'] as const).map((type) => <li key={type}>{getFreeLimitLabel(type)}</li>)}
            </ul>
            <div className="mt-auto">
              {!isSignedIn ? <SignUpButton mode="modal"><button className={secondaryAction}>Sign Up Free</button></SignUpButton> : <Link to="/chat" className={secondaryAction}>Keep learning</Link>}
            </div>
          </article>
          <article aria-labelledby="premium-plan" className="flex min-w-0 flex-col rounded-2xl border border-coral-300 bg-coral-50 p-3 dark:bg-brown-900 sm:p-5">
            <h2 id="premium-plan" className="text-lg font-bold text-brown-950 dark:text-cream-100">Premium</h2>
            <p className="mt-2 text-base text-brown-600 dark:text-brown-100"><strong className="text-2xl text-brown-950 dark:text-cream-100">{PREMIUM_PRICING.monthly}</strong><span className="block sm:inline"> /month</span></p>
            <p className="mt-1 text-base text-brown-600 dark:text-brown-100">or {PREMIUM_PRICING.annual}/year</p>
            <ul className="my-4 space-y-2 text-base text-brown-700 dark:text-cream-200"><li>Unlimited AI chat messages</li><li>Unlimited learning games</li><li>Unlimited quizzes</li></ul>
            <div className="mt-auto">
              {!isSignedIn ? (
                <SignUpButton mode="modal"><button className={primaryAction}>Sign Up &amp; Upgrade</button></SignUpButton>
              ) : subscriptionLoading ? (
                <p role="status" className="py-3 text-base text-brown-600 dark:text-brown-100">Checking your plan…</p>
              ) : isPremium ? (
                <button onClick={() => openUserProfile()} className={primaryAction}><Settings className="h-4 w-4 shrink-0" aria-hidden="true" /> Manage Subscription</button>
              ) : (
                <button onClick={() => setShowCheckout(!showCheckout)} aria-expanded={showCheckout} aria-controls="pricing-checkout" className={primaryAction}>
                  {showCheckout ? 'Hide Options' : 'Upgrade Now'}<ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
              )}
            </div>
          </article>
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base text-brown-600 dark:text-brown-100">Premium is at early-adopter pricing during the beta, and the yearly plan saves {PREMIUM_PRICING.annualSavings} over paying monthly. Your subscription helps cover AI and hosting costs while we continue improving the platform.</p>
        {!isSignedIn && <p className="mt-3 text-center text-base text-brown-600 dark:text-brown-100">A free account is needed to chat, play games, or take quizzes.</p>}
        {isSignedIn && !subscriptionLoading && <p className="mt-3 text-center text-base text-brown-600 dark:text-brown-100">Your current plan: {isPremium ? 'Premium' : 'Free'}</p>}
        {isSignedIn && !isPremium && !subscriptionLoading && showCheckout && (
          <div id="pricing-checkout" className="mt-4 rounded-xl border border-cream-200 bg-white p-3 dark:border-brown-700 dark:bg-brown-900"><div className="pricing-table-compact">
            <style>{`.pricing-table-compact [data-localization-key*="free"], .pricing-table-compact > div > div > div:first-child { display: none !important; }`}</style>
            <PricingTable />
          </div></div>
        )}
      </section>

      <section aria-labelledby="plan-details" className="mx-auto mb-10 max-w-2xl">
        <h2 id="plan-details" className="mb-3 text-xl font-bold text-brown-950 dark:text-cream-100">In both plans</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-base text-brown-700 marker:text-brown-500 dark:text-cream-200">
          <li>Unlimited vocabulary browsing</li>
          <li>Daily word &amp; stories</li>
        </ul>
        <p className="mt-3 text-base text-brown-600 dark:text-brown-100">Premium also includes priority support, and every subscription supports Chamorro language learning.</p>
      </section>
        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto">
          <h2 className="mb-4 text-xl font-bold text-brown-800 dark:text-cream-100">
            Frequently asked questions
          </h2>
          
          <div className="divide-y divide-cream-200 rounded-2xl border border-cream-200 bg-white dark:divide-brown-700 dark:border-brown-700 dark:bg-brown-900">
            <div className="p-5">
              <h3 className="font-semibold text-brown-800 dark:text-cream-100 mb-2">
                What is early-adopter pricing?
              </h3>
              <p className="text-base text-brown-600 dark:text-brown-100">
                We're in beta and adding new features regularly! Early adopters get special discounted pricing. These funds help us cover AI costs (every message uses paid APIs) and keep the platform running.
              </p>
            </div>

            <div className="p-5">
              <h3 className="font-semibold text-brown-800 dark:text-cream-100 mb-2">
                When do my free uses reset?
              </h3>
              <p className="text-base text-brown-600 dark:text-brown-100">
                Your daily limits reset at midnight (Guam time) every day. Come back tomorrow for more free uses!
              </p>
            </div>

            <div className="p-5">
              <h3 className="font-semibold text-brown-800 dark:text-cream-100 mb-2">
                Can I cancel my subscription?
              </h3>
              <p className="text-base text-brown-600 dark:text-brown-100">
                Yes! You can cancel anytime from your account settings. You'll keep Premium access until the end of your billing period.
              </p>
            </div>

            <div className="p-5">
              <h3 className="font-semibold text-brown-800 dark:text-cream-100 mb-2">
                How does my subscription help?
              </h3>
              <p className="text-base text-brown-600 dark:text-brown-100">
                Every chat message, game, and quiz uses services that cost money to run. Your subscription helps cover AI, servers, and development so we can keep HåfaGPT accessible and continue improving it. Si Yu&apos;os Ma&apos;åse&apos;!
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-brown-600 dark:text-brown-100 text-base mb-4">
            Questions? Contact us at{' '}
            <a 
              href="mailto:support@shimizutechnology.com"
              className="break-all text-coral-700 [@media(hover:hover)_and_(pointer:fine)]:hover:underline"
            >
              support@shimizutechnology.com
            </a>
          </p>
        </div>
    </PublicPage>
  );
}

export default PricingPage;
