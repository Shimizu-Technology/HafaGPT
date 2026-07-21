import { useState } from 'react';
import { 
  GraduationCap, Users, Palmtree, Globe, Sparkles, ArrowRight, Check,
  MessageSquare, Brain, Gamepad2, BookOpen, BookMarked, Flame
} from 'lucide-react';
import { useUserPreferences, SkillLevel, LearningGoal } from '../hooks/useUserPreferences';
import { useSubscription } from '../hooks/useSubscription';

const FEATURES = [
  { icon: MessageSquare, title: 'AI Chat', description: 'Ask anything about Chamorro', color: 'text-coral-500 dark:text-ocean-400', bg: 'bg-coral-100 dark:bg-ocean-900/30' },
  { icon: Brain, title: 'Quizzes', description: 'Test your knowledge', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { icon: Gamepad2, title: 'Games', description: 'Learn while playing', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { icon: BookOpen, title: 'Stories', description: 'Read & translate', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { icon: BookMarked, title: 'Flashcards', description: 'Study vocabulary', color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  { icon: Flame, title: 'Streaks', description: 'Track your progress', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SKILL_LEVELS: { id: SkillLevel; icon: string; title: string; description: string }[] = [
  {
    id: 'beginner',
    icon: '🌱',
    title: 'Beginner',
    description: 'New to Chamorro. I want simple explanations and lots of English help.',
  },
  {
    id: 'intermediate',
    icon: '🌿',
    title: 'Intermediate',
    description: 'I know some basics. Ready for more Chamorro with practice exercises.',
  },
  {
    id: 'advanced',
    icon: '🌳',
    title: 'Advanced',
    description: 'I can understand Chamorro. Give me nuanced explanations and cultural depth.',
  },
];

const LEARNING_GOALS: { id: LearningGoal; icon: React.ReactNode; title: string; description: string }[] = [
  {
    id: 'conversation',
    icon: <Users className="w-5 h-5" />,
    title: 'Daily Conversation',
    description: 'Speak with family and friends',
  },
  {
    id: 'culture',
    icon: <Palmtree className="w-5 h-5" />,
    title: 'Culture & Heritage',
    description: 'Connect with Chamorro roots',
  },
  {
    id: 'family',
    icon: <GraduationCap className="w-5 h-5" />,
    title: 'Teach My Family',
    description: 'Pass on the language',
  },
  {
    id: 'travel',
    icon: <Globe className="w-5 h-5" />,
    title: 'Travel to Guam',
    description: 'Prepare for a visit',
  },
  {
    id: 'all',
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Everything!',
    description: 'Learn it all',
  },
];

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>('beginner');
  const [selectedGoal, setSelectedGoal] = useState<LearningGoal>('all');
  const { completeOnboarding, isUpdating } = useUserPreferences();
  const { isChristmasTheme, isNewYearTheme } = useSubscription();

  if (!isOpen) return null;

  const handleComplete = async () => {
    try {
      await completeOnboarding(selectedLevel, selectedGoal);
      onClose();
    } catch (error) {
      console.error('Failed to save onboarding preferences:', error);
      // Still close on error - user can update preferences later
      onClose();
    }
  };

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    // Skip with defaults
    completeOnboarding('beginner', 'all').then(() => onClose()).catch(() => onClose());
  };

  const getStepTitle = () => {
    switch (step) {
      case 0: return 'Welcome to HåfaGPT!';
      case 1: return "What's your level?";
      case 2: return 'What brings you here?';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 0: return 'Your AI-powered Chamorro language tutor';
      case 1: return "Let's personalize your experience";
      case 2: return 'This helps us tailor your journey';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
        {/* Header with gradient */}
        <div className={`px-4 sm:px-6 py-4 sm:py-5 flex-shrink-0 ${
          isChristmasTheme 
            ? 'bg-gradient-to-r from-red-500 to-green-600' 
            : 'bg-gradient-to-r from-coral-500 to-teal-500 dark:from-ocean-600 dark:to-teal-600'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                {getStepTitle()}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 mt-0.5 sm:mt-1">
                {getStepSubtitle()}
              </p>
            </div>
            <div className="text-2xl sm:text-3xl flex-shrink-0">
              {isChristmasTheme ? '🎄' : isNewYearTheme ? '🎆' : '🌺'}
            </div>
          </div>
          
          {/* Progress indicator - 3 steps */}
          <div className="flex gap-2 mt-3 sm:mt-4">
            <div className={`h-1 sm:h-1.5 flex-1 rounded-full ${step >= 0 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`h-1 sm:h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`h-1 sm:h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
          {step === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-brown-600 dark:text-gray-300 text-center">
                Everything you need to learn Chamorro
              </p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.title}
                      className="p-3 sm:p-4 rounded-xl bg-cream-50 dark:bg-gray-700/50 border border-cream-200 dark:border-gray-600"
                    >
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${feature.bg} flex items-center justify-center mb-2`}>
                        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${feature.color}`} />
                      </div>
                      <p className="font-semibold text-sm text-brown-800 dark:text-white">
                        {feature.title}
                      </p>
                      <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400 leading-tight">
                        {feature.description}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-center text-brown-500 dark:text-gray-400 pt-2">
                Built specifically for learning the Chamorro language 🇬🇺
              </p>
            </div>
          ) : step === 1 ? (
            <div className="space-y-2 sm:space-y-3">
              <p className="text-sm text-brown-600 dark:text-gray-300 mb-3 sm:mb-4">
                What's your Chamorro experience level?
              </p>
              {SKILL_LEVELS.map((level) => {
                const isSelected = selectedLevel === level.id;
                return (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevel(level.id)}
                    className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-coral-500 dark:border-ocean-400 bg-coral-50 dark:bg-ocean-500/20'
                        : 'border-cream-200 dark:border-gray-600 hover:border-coral-300 dark:hover:border-ocean-600 bg-white dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <span className="text-xl sm:text-2xl flex-shrink-0">{level.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold text-sm sm:text-base ${
                            isSelected 
                              ? 'text-coral-700 dark:text-ocean-300' 
                              : 'text-brown-800 dark:text-white'
                          }`}>
                            {level.title}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-coral-500 dark:text-ocean-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className={`text-xs sm:text-sm mt-0.5 leading-snug ${
                          isSelected 
                            ? 'text-coral-600 dark:text-ocean-200' 
                            : 'text-brown-500 dark:text-gray-400'
                        }`}>
                          {level.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-brown-600 dark:text-gray-300 mb-4">
                Choose your main learning goal:
              </p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {LEARNING_GOALS.map((goal) => {
                  const isSelected = selectedGoal === goal.id;
                  return (
                    <button
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal.id)}
                      className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                        goal.id === 'all' ? 'col-span-2' : ''
                      } ${
                        isSelected
                          ? 'border-coral-500 dark:border-ocean-400 bg-coral-50 dark:bg-ocean-500/20'
                          : 'border-cream-200 dark:border-gray-600 hover:border-coral-300 dark:hover:border-ocean-600 bg-white dark:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                          isSelected
                            ? 'bg-coral-100 dark:bg-ocean-600/50 text-coral-600 dark:text-ocean-200'
                            : 'bg-cream-100 dark:bg-gray-600 text-brown-500 dark:text-gray-400'
                        }`}>
                          {goal.icon}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`font-semibold text-xs sm:text-sm leading-tight ${
                              isSelected 
                                ? 'text-coral-700 dark:text-ocean-300' 
                                : 'text-brown-800 dark:text-white'
                            }`}>
                              {goal.title}
                            </span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-coral-500 dark:text-ocean-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className={`text-[10px] sm:text-xs leading-tight mt-0.5 ${
                            isSelected 
                              ? 'text-coral-600 dark:text-ocean-200' 
                              : 'text-brown-500 dark:text-gray-400'
                          }`}>
                            {goal.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-cream-50 dark:bg-gray-700/50 border-t border-cream-200 dark:border-gray-600 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleSkip}
            className="text-xs sm:text-sm text-brown-500 dark:text-gray-400 hover:text-brown-700 dark:hover:text-gray-200 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleNext}
            disabled={isUpdating}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium text-white text-sm sm:text-base transition-all flex items-center gap-1.5 sm:gap-2 ${
              isChristmasTheme
                ? 'bg-gradient-to-r from-red-500 to-green-600 hover:from-red-600 hover:to-green-700'
                : 'bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 dark:from-ocean-500 dark:to-ocean-600'
            } disabled:opacity-50`}
          >
            {isUpdating ? (
              'Saving...'
            ) : step === 0 ? (
              <>
                Get Started
                <ArrowRight className="w-4 h-4" />
              </>
            ) : step === 1 ? (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Start Learning
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingModal;
