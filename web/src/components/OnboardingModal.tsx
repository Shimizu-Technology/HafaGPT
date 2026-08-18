import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  Clock3,
  HandHeart,
  Headphones,
  HeartHandshake,
  Landmark,
  Leaf,
  MapPin,
  MessageCircle,
  Sparkles,
  Sprout,
  TreePine,
  UserRound,
  UsersRound,
} from 'lucide-react';
import {
  CONFIDENCE_OPTIONS,
  DAILY_SESSION_OPTIONS,
  LEARNER_MODE_OPTIONS,
  LEARNING_GOAL_OPTIONS,
  READING_SUPPORT_OPTIONS,
  DailySessionMinutes,
  LearnerMode,
  LearningGoal,
  ReadingSupport,
  SkillLevel,
} from '../data/learningPreferences';
import {
  DEFAULT_PREFERENCES,
  OnboardingPreferences,
  useUserPreferences,
} from '../hooks/useUserPreferences';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODE_ICONS: Record<LearnerMode, LucideIcon> = {
  self: UserRound,
  with_child: UsersRound,
  helping_family: HandHeart,
};

const READING_ICONS: Record<ReadingSupport, LucideIcon> = {
  audio_pictures: Headphones,
  short_text_audio: AudioLines,
  independent: BookOpen,
};

const CONFIDENCE_ICONS: Record<SkillLevel, LucideIcon> = {
  beginner: Sprout,
  intermediate: Leaf,
  advanced: TreePine,
};

const GOAL_ICONS: Record<LearningGoal, LucideIcon> = {
  conversation: MessageCircle,
  culture: Landmark,
  family: HeartHandshake,
  travel: MapPin,
  all: Sparkles,
};

const STEP_COPY = [
  {
    title: 'How will you use HåfaGPT?',
    subtitle: 'Choose what fits today. You can change this anytime.',
  },
  {
    title: 'What reading support feels best?',
    subtitle: 'This changes how much listening and text we show first.',
  },
  {
    title: 'How confident are you with Chamorro?',
    subtitle: 'An honest starting point helps us choose the right pace.',
  },
  {
    title: 'What would you most like to do?',
    subtitle: 'We will use this to prioritize your daily practice.',
  },
  {
    title: 'How long should a daily session be?',
    subtitle: 'A small routine is enough. You can always do more.',
  },
] as const;

interface ChoiceCardProps<T extends string | number> {
  id: T;
  title: string;
  description: string;
  selected: boolean;
  icon: LucideIcon;
  onSelect: (id: T) => void;
}

function ChoiceCard<T extends string | number>({
  id,
  title,
  description,
  selected,
  icon: Icon,
  onSelect,
}: ChoiceCardProps<T>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:focus-visible:ring-ocean-400 dark:focus-visible:ring-offset-gray-900 ${
        selected
          ? 'border-coral-500 bg-coral-50 dark:border-ocean-400 dark:bg-ocean-900/30'
          : 'border-cream-200 bg-white hover:border-coral-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-ocean-600'
      }`}
    >
      <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${
        selected
          ? 'bg-coral-100 text-coral-700 dark:bg-ocean-800 dark:text-ocean-200'
          : 'bg-cream-100 text-brown-600 dark:bg-gray-700 dark:text-gray-300'
      }`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-brown-900 dark:text-white">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-brown-600 dark:text-gray-300">
          {description}
        </span>
      </span>
      {selected && <Check className="h-5 w-5 flex-none text-coral-600 dark:text-ocean-300" aria-hidden="true" />}
    </button>
  );
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [learnerMode, setLearnerMode] = useState<LearnerMode>(DEFAULT_PREFERENCES.learner_mode);
  const [readingSupport, setReadingSupport] = useState<ReadingSupport>(DEFAULT_PREFERENCES.reading_support);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(DEFAULT_PREFERENCES.skill_level);
  const [learningGoal, setLearningGoal] = useState<LearningGoal>(DEFAULT_PREFERENCES.learning_goal);
  const [sessionMinutes, setSessionMinutes] = useState<DailySessionMinutes>(DEFAULT_PREFERENCES.daily_session_minutes);
  const [saveError, setSaveError] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { completeOnboarding, isUpdating } = useUserPreferences();

  useEffect(() => {
    if (!isOpen) return;
    contentRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [isOpen, step]);

  if (!isOpen) return null;

  const selectedPreferences: OnboardingPreferences = {
    learner_mode: learnerMode,
    reading_support: readingSupport,
    skill_level: skillLevel,
    learning_goal: learningGoal,
    daily_session_minutes: sessionMinutes,
  };

  const saveAndClose = async (preferences: OnboardingPreferences) => {
    setSaveError('');
    try {
      await completeOnboarding(preferences);
      onClose();
    } catch {
      setSaveError('We could not save your choices. Please try again.');
    }
  };

  const handleContinue = () => {
    if (step < STEP_COPY.length - 1) {
      setSaveError('');
      setStep((current) => current + 1);
      return;
    }
    void saveAndClose(selectedPreferences);
  };

  const handleSkip = () => {
    void saveAndClose({
      learner_mode: DEFAULT_PREFERENCES.learner_mode,
      reading_support: DEFAULT_PREFERENCES.reading_support,
      skill_level: DEFAULT_PREFERENCES.skill_level,
      learning_goal: DEFAULT_PREFERENCES.learning_goal,
      daily_session_minutes: DEFAULT_PREFERENCES.daily_session_minutes,
    });
  };

  const copy = STEP_COPY[step];

  const keepFocusInDialog = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [],
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown-950/55 p-3 backdrop-blur-sm sm:p-5">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-subtitle"
        onKeyDown={keepFocusInDialog}
        className="flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-cream-200 bg-cream-50 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <header className="border-b border-cream-200 bg-white px-5 py-5 dark:border-gray-700 dark:bg-gray-800 sm:px-7">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-coral-100 text-coral-700 dark:bg-ocean-900 dark:text-ocean-200">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Make HåfaGPT yours</p>
                <p className="text-xs text-brown-500 dark:text-gray-400">No name, age, or school information needed</p>
              </div>
            </div>
            <span className="text-sm font-medium text-brown-500 dark:text-gray-400">
              {step + 1} of {STEP_COPY.length}
            </span>
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            {STEP_COPY.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-coral-500 dark:bg-ocean-400' : 'bg-cream-200 dark:bg-gray-700'}`}
              />
            ))}
          </div>
          <h2 id="onboarding-title" className="mt-5 text-xl font-bold text-brown-950 dark:text-white sm:text-2xl">
            {copy.title}
          </h2>
          <p id="onboarding-subtitle" className="mt-1 text-sm text-brown-600 dark:text-gray-300">
            {copy.subtitle}
          </p>
        </header>

        <div ref={contentRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-2.5">
            {step === 0 && LEARNER_MODE_OPTIONS.map((option) => (
              <ChoiceCard key={option.id} {...option} icon={MODE_ICONS[option.id]} selected={learnerMode === option.id} onSelect={setLearnerMode} />
            ))}
            {step === 1 && READING_SUPPORT_OPTIONS.map((option) => (
              <ChoiceCard key={option.id} {...option} icon={READING_ICONS[option.id]} selected={readingSupport === option.id} onSelect={setReadingSupport} />
            ))}
            {step === 2 && CONFIDENCE_OPTIONS.map((option) => (
              <ChoiceCard key={option.id} {...option} icon={CONFIDENCE_ICONS[option.id]} selected={skillLevel === option.id} onSelect={setSkillLevel} />
            ))}
            {step === 3 && LEARNING_GOAL_OPTIONS.map((option) => (
              <ChoiceCard key={option.id} {...option} icon={GOAL_ICONS[option.id]} selected={learningGoal === option.id} onSelect={setLearningGoal} />
            ))}
            {step === 4 && DAILY_SESSION_OPTIONS.map((option) => (
              <ChoiceCard key={option.id} {...option} icon={Clock3} selected={sessionMinutes === option.id} onSelect={setSessionMinutes} />
            ))}
          </div>
          {saveError && (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
              {saveError}
            </p>
          )}
        </div>

        <footer className="flex min-h-18 items-center gap-2 border-t border-cream-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((current) => current - 1)}
              disabled={isUpdating}
              aria-label="Go back"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-brown-600 hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : <span className="min-w-11" />}
          <button
            type="button"
            onClick={handleSkip}
            disabled={isUpdating}
            className="min-h-11 px-2 text-sm font-medium text-brown-600 hover:text-brown-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:opacity-50 dark:text-gray-300 dark:hover:text-white"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={isUpdating}
            className="ml-auto flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coral-600 px-4 py-2.5 font-semibold text-white hover:bg-coral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-ocean-500 dark:hover:bg-ocean-600 dark:focus-visible:ring-ocean-400 dark:focus-visible:ring-offset-gray-900"
          >
            {isUpdating ? 'Saving…' : step === STEP_COPY.length - 1 ? 'Start learning' : 'Continue'}
            {!isUpdating && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default OnboardingModal;
