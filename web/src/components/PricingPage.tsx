import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, SignUpButton, PricingTable, useClerk } from '@clerk/clerk-react';
import { Check, Sparkles, MessageSquare, Gamepad2, GraduationCap, BookOpen, Users, Heart, Crown, ChevronDown, Settings, Clock } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { getFreeLimitLabel, PREMIUM_PRICING } from '../lib/planConfig';
import { PublicPage } from './PublicPage';

const primaryAction = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral-700 px-3 py-3 font-semibold text-white transition-colors duration-150 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-coral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-teal-700 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-teal-800';
const secondaryAction = 'flex min-h-12 w-full items-center justify-center rounded-xl bg-cream-100 px-3 py-3 font-semibold text-brown-800 transition-colors duration-150 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-slate-700 dark:text-white dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-slate-600';

const features = {
  free: [
    { text: getFreeLimitLabel('chat'), icon: MessageSquare },
    { text: getFreeLimitLabel('game'), icon: Gamepad2 },
    { text: getFreeLimitLabel('quiz'), icon: GraduationCap },
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
    <PublicPage title="Plans" subtitle="Compare current access and subscription options" icon={Crown} maxWidthClassName="max-w-5xl" stickyHeader={false}>
      <div className="mb-6 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-coral-100 px-4 py-2 text-sm font-medium text-coral-800 dark:bg-teal-950 dark:text-teal-300">
          <Sparkles className="h-4 w-4" aria-hidden="true" /> Start learning Chamorro today
        </div>
        <h2 className="text-2xl font-bold text-brown-800 dark:text-white sm:text-4xl">Unlock Unlimited Learning</h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-brown-600 dark:text-gray-300">Start free, or choose Premium for unlimited chat, games, and quizzes.</p>
      </div>

      <section aria-label="Plans at a glance" className="mb-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3 sm:gap-5">
          <article aria-labelledby="free-plan" className="flex min-w-0 flex-col rounded-2xl border border-cream-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
            <h3 id="free-plan" className="text-lg font-bold text-brown-950 dark:text-white">Free</h3>
            <p className="mt-2 text-base text-brown-600 dark:text-gray-300"><strong className="text-2xl text-brown-950 dark:text-white">$0</strong><span className="block sm:inline"> /month</span></p>
            <ul className="my-4 space-y-2 text-base text-brown-700 dark:text-gray-200">
              {(['chat', 'game', 'quiz'] as const).map((type) => <li key={type}>{getFreeLimitLabel(type)}</li>)}
            </ul>
            <div className="mt-auto">
              {!isSignedIn ? <SignUpButton mode="modal"><button className={secondaryAction}>Sign Up Free</button></SignUpButton> : <Link to="/chat" className={secondaryAction}>Keep learning</Link>}
            </div>
          </article>
          <article aria-labelledby="premium-plan" className="flex min-w-0 flex-col rounded-2xl border border-coral-300 bg-coral-50 p-3 dark:border-teal-700 dark:bg-slate-800 sm:p-5">
            <h3 id="premium-plan" className="text-lg font-bold text-brown-950 dark:text-white">Premium</h3>
            <p className="mt-2 text-base text-brown-600 dark:text-gray-300"><strong className="text-2xl text-brown-950 dark:text-white">{PREMIUM_PRICING.monthly}</strong><span className="block sm:inline"> /month</span></p>
            <p className="mt-1 text-base text-brown-600 dark:text-gray-300">or {PREMIUM_PRICING.annual}/year</p>
            <ul className="my-4 space-y-2 text-base text-brown-700 dark:text-gray-200"><li>Unlimited AI chat messages</li><li>Unlimited learning games</li><li>Unlimited quizzes</li></ul>
            <div className="mt-auto">
              {!isSignedIn ? (
                <SignUpButton mode="modal"><button className={primaryAction}>Sign Up &amp; Upgrade</button></SignUpButton>
              ) : subscriptionLoading ? (
                <p role="status" className="py-3 text-base text-brown-600 dark:text-gray-300">Checking your plan…</p>
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
        {!isSignedIn && <p className="mt-3 text-center text-base text-brown-600 dark:text-gray-300">A free account is needed to chat, play games, or take quizzes.</p>}
        {isSignedIn && !subscriptionLoading && <p className="mt-3 text-center text-base text-brown-600 dark:text-gray-300">Your current plan: {isPremium ? 'Premium' : 'Free'}</p>}
        {isSignedIn && !isPremium && !subscriptionLoading && showCheckout && (
          <div id="pricing-checkout" className="mt-4 rounded-xl border border-cream-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"><div className="pricing-table-compact">
            <style>{`.pricing-table-compact [data-localization-key*="free"], .pricing-table-compact > div > div > div:first-child { display: none !important; }`}</style>
            <PricingTable />
          </div></div>
        )}
      </section>

      <section aria-labelledby="plan-details" className="mb-10">
        <h2 id="plan-details" className="mb-4 text-xl font-bold text-brown-950 dark:text-white">Plan details</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 text-lg font-semibold text-brown-950 dark:text-white">Included with Free</h3>
            <ul className="space-y-3">{features.free.map(({ text, icon: Icon }) => <li key={text} className="flex items-start gap-3 text-base text-brown-700 dark:text-gray-200"><Icon className="mt-1 h-4 w-4 shrink-0 text-brown-600 dark:text-gray-300" aria-hidden="true" />{text}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-coral-200 bg-white p-5 dark:border-teal-800 dark:bg-slate-800">
            <h3 className="mb-3 text-lg font-semibold text-brown-950 dark:text-white">Included with Premium</h3>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-800 px-3 py-1 text-xs font-semibold text-white"><Clock className="h-3 w-3" aria-hidden="true" /> EARLY ADOPTER PRICING</span>
              <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950 dark:text-teal-300">Save {PREMIUM_PRICING.annualSavings}</span>
            </div>
            <p className="mb-4 text-base text-brown-600 dark:text-gray-300">{PREMIUM_PRICING.monthly}/month or {PREMIUM_PRICING.annual}/year. <strong>Beta pricing!</strong> Your subscription helps cover AI and hosting costs while we continue improving the platform.</p>
            <ul className="space-y-3">{features.premium.map(({ text }) => <li key={text} className="flex items-start gap-3 text-base text-brown-700 dark:text-gray-200"><Check className="mt-1 h-4 w-4 shrink-0 text-teal-800 dark:text-teal-300" aria-hidden="true" />{text}</li>)}</ul>
          </div>
        </div>
      </section>
        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-brown-800 dark:text-white text-center mb-6">
            Frequently Asked Questions
          </h3>
          
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-cream-200 dark:border-slate-700">
              <h4 className="font-semibold text-brown-800 dark:text-white mb-2">
                What is "Early Adopter Pricing"?
              </h4>
              <p className="text-base text-brown-600 dark:text-gray-300">
                We're in beta and adding new features regularly! Early adopters get special discounted pricing. These funds help us cover AI costs (every message uses paid APIs) and keep the platform running.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-cream-200 dark:border-slate-700">
              <h4 className="font-semibold text-brown-800 dark:text-white mb-2">
                When do my free uses reset?
              </h4>
              <p className="text-base text-brown-600 dark:text-gray-300">
                Your daily limits reset at midnight (Guam time) every day. Come back tomorrow for more free uses!
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-cream-200 dark:border-slate-700">
              <h4 className="font-semibold text-brown-800 dark:text-white mb-2">
                Can I cancel my subscription?
              </h4>
              <p className="text-base text-brown-600 dark:text-gray-300">
                Yes! You can cancel anytime from your account settings. You'll keep Premium access until the end of your billing period.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-cream-200 dark:border-slate-700">
              <h4 className="font-semibold text-brown-800 dark:text-white mb-2">
                How does my subscription help?
              </h4>
              <p className="text-base text-brown-600 dark:text-gray-300">
                Every chat message, game, and quiz uses services that cost money to run. Your subscription helps cover AI, servers, and development so we can keep HåfaGPT accessible and continue improving it. Si Yu&apos;os Ma&apos;åse&apos;!
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-brown-600 dark:text-gray-300 text-base mb-4">
            Questions? Contact us at{' '}
            <a 
              href="mailto:support@shimizutechnology.com"
              className="break-all text-coral-700 dark:text-teal-300 [@media(hover:hover)_and_(pointer:fine)]:hover:underline"
            >
              support@shimizutechnology.com
            </a>
          </p>
        </div>
    </PublicPage>
  );
}

export default PricingPage;
