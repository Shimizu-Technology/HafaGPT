import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Sparkles, MessageSquare, Gamepad2, GraduationCap, Check, Zap } from 'lucide-react';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { FREE_TIER_LIMITS, PREMIUM_PRICING } from '../lib/planConfig';

interface UpgradePromptProps {
  feature: 'chat' | 'game' | 'quiz';
  onClose: () => void;
  usageCount?: number;
  usageLimit?: number;
}

const featureInfo = {
  chat: {
    icon: MessageSquare,
    title: "You've reached your daily chat limit",
    unit: 'AI chat messages',
    benefit: "Get unlimited conversations with our AI Chamorro tutor",
    color: "coral",
  },
  game: {
    icon: Gamepad2,
    title: "You've reached your daily game limit",
    unit: 'learning games',
    benefit: "Play unlimited learning games to master Chamorro",
    color: "teal",
  },
  quiz: {
    icon: GraduationCap,
    title: "You've reached your daily quiz limit",
    unit: 'quizzes',
    benefit: "Take unlimited quizzes to test your knowledge",
    color: "ocean",
  },
};

const premiumBenefits = [
  "Unlimited AI chat conversations",
  "Unlimited learning games",
  "Unlimited quizzes",
  "Priority support",
  "Support Chamorro language learning",
];

export function UpgradePrompt({ feature, onClose, usageCount, usageLimit }: UpgradePromptProps) {
  const info = featureInfo[feature];
  const Icon = info.icon;
  const displayedLimit = usageLimit ?? FREE_TIER_LIMITS[feature];
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useModalAccessibility({
    isOpen: true,
    onClose,
    dialogRef,
    initialFocusRef: closeButtonRef,
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-prompt-title"
        tabIndex={-1}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-cream-300 bg-cream-50 shadow-xl animate-scale-in dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-cream-200/50 dark:bg-gray-700/50 text-brown-600 dark:text-gray-400 hover:bg-cream-300 dark:hover:bg-gray-600 transition-colors z-10"
          aria-label="Close upgrade offer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="bg-coral-600 px-6 py-8 text-center dark:bg-teal-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h2 id="upgrade-prompt-title" className="text-xl font-bold text-white mb-2">
            {info.title}
          </h2>
          <p className="text-white/90 text-sm">
            You have used all {displayedLimit} free {info.unit} for today.
          </p>
          {usageCount !== undefined && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-white text-sm">
              <span>{usageCount}/{displayedLimit} used today</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Premium pitch */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="font-semibold text-brown-800 dark:text-white">
              Upgrade to Premium
            </span>
          </div>

          {/* Benefits list */}
          <ul className="space-y-3 mb-6">
            {premiumBenefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mt-0.5">
                  <Check className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                </div>
                <span className="text-sm text-brown-700 dark:text-gray-300">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>

          {/* Pricing */}
          <div className="bg-cream-100 dark:bg-gray-800 rounded-xl p-4 mb-6">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold text-brown-800 dark:text-white">{PREMIUM_PRICING.monthly}</span>
                <span className="text-brown-600 dark:text-gray-400 text-sm">/month</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-brown-600 dark:text-gray-400">or</span>
                <div className="text-brown-800 dark:text-white font-semibold">
                  {PREMIUM_PRICING.annual}<span className="text-sm font-normal text-brown-600 dark:text-gray-400">/year</span>
                </div>
                <span className="text-xs text-teal-600 dark:text-teal-400">Save {PREMIUM_PRICING.annualSavings}</span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Link
              to="/pricing"
              onClick={onClose}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              <Zap className="w-5 h-5" />
              Upgrade Now
            </Link>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 text-brown-600 dark:text-gray-400 text-sm hover:text-brown-800 dark:hover:text-gray-200 transition-colors"
            >
              Maybe later · Come back tomorrow for more free uses
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-brown-500 dark:text-gray-500">
            Your subscription helps keep HåfaGPT running for Chamorro learners 🌺
          </p>
        </div>
      </div>
    </div>
  );
}

export default UpgradePrompt;
