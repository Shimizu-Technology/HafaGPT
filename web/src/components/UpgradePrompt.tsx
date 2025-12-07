import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Sparkles, MessageSquare, Gamepad2, GraduationCap, Check, Zap } from 'lucide-react';

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
    description: "You've used all 5 free AI chat messages for today.",
    benefit: "Get unlimited conversations with our AI Chamorro tutor",
    color: "coral",
  },
  game: {
    icon: Gamepad2,
    title: "You've reached your daily game limit",
    description: "You've played all 5 free games for today.",
    benefit: "Play unlimited learning games to master Chamorro",
    color: "teal",
  },
  quiz: {
    icon: GraduationCap,
    title: "You've reached your daily quiz limit",
    description: "You've taken all 3 free quizzes for today.",
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

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-br from-cream-50 to-cream-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-cream-200/50 dark:bg-gray-700/50 text-brown-600 dark:text-gray-400 hover:bg-cream-300 dark:hover:bg-gray-600 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {info.title}
          </h2>
          <p className="text-white/90 text-sm">
            {info.description}
          </p>
          {usageCount !== undefined && usageLimit !== undefined && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-white text-sm">
              <span>{usageCount}/{usageLimit} used today</span>
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
                <span className="text-2xl font-bold text-brown-800 dark:text-white">$4.99</span>
                <span className="text-brown-600 dark:text-gray-400 text-sm">/month</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-brown-600 dark:text-gray-400">or</span>
                <div className="text-brown-800 dark:text-white font-semibold">
                  $39.99<span className="text-sm font-normal text-brown-600 dark:text-gray-400">/year</span>
                </div>
                <span className="text-xs text-teal-600 dark:text-teal-400">Save 33%</span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Link
              to="/pricing"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg"
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

