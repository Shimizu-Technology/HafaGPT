import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AudioLines,
  BookOpen,
  Check,
  Clock3,
  HandHeart,
  Headphones,
  HeartHandshake,
  HelpCircle,
  Landmark,
  Leaf,
  MapPin,
  MessageCircle,
  Moon,
  RotateCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Sun,
  TreePine,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  CONFIDENCE_OPTIONS,
  DAILY_GOAL_OPTIONS,
  DEFAULT_DAILY_SESSION_MINUTES,
  LEARNER_MODE_OPTIONS,
  LEARNING_GOAL_OPTIONS,
  READING_SUPPORT_OPTIONS,
  type DailyGoalMinutes,
  type LearnerMode,
  type LearningGoal,
  type ReadingSupport,
  type SkillLevel,
  normalizeDailyGoalMinutes,
} from '../data/learningPreferences';
import { useTheme } from '../hooks/useTheme';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { getLevelInfo, useUpdateDailyGoal, useXP } from '../hooks/useXP';
import { AuthButton } from './AuthButton';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

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

interface SettingsChoiceProps<T extends string | number> {
  id: T;
  title: string;
  description: string;
  selected: boolean;
  icon: LucideIcon;
  onSelect: (id: T) => void;
  disabled?: boolean;
}

function SettingsChoice<T extends string | number>({
  id,
  title,
  description,
  selected,
  icon: Icon,
  onSelect,
  disabled = false,
}: SettingsChoiceProps<T>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      disabled={disabled}
      className={`flex min-h-16 w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-slate-900 ${
        selected
          ? 'border-coral-500 bg-coral-50 dark:border-teal-400 dark:bg-teal-950/30'
          : 'border-cream-200 bg-white hover:border-coral-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-700'
      }`}
    >
      <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${
        selected
          ? 'bg-coral-100 text-coral-700 dark:bg-teal-900 dark:text-teal-200'
          : 'bg-cream-100 text-brown-600 dark:bg-slate-700 dark:text-gray-300'
      }`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-brown-950 dark:text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-brown-600 dark:text-gray-300">{description}</span>
      </span>
      {selected && <Check className="h-5 w-5 flex-none text-coral-600 dark:text-teal-300" aria-hidden="true" />}
    </button>
  );
}

function SettingsSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
      <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-bold text-brown-950 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-brown-600 dark:text-gray-400">{description}</p>
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { preferences, updatePreferencesAsync, isUpdating } = useUserPreferences();
  const { data: xpData, isLoading: isLoadingXP, isError: isXPError } = useXP();
  const updateDailyGoal = useUpdateDailyGoal();
  const savedSessionMinutes = xpData
    ? normalizeDailyGoalMinutes(xpData.daily_goal_minutes)
    : DEFAULT_DAILY_SESSION_MINUTES;

  const [skillLevel, setSkillLevel] = useState<SkillLevel>(preferences.skill_level);
  const [learningGoal, setLearningGoal] = useState<LearningGoal>(preferences.learning_goal);
  const [learnerMode, setLearnerMode] = useState<LearnerMode>(preferences.learner_mode);
  const [readingSupport, setReadingSupport] = useState<ReadingSupport>(preferences.reading_support);
  const [sessionMinutes, setSessionMinutes] = useState<DailyGoalMinutes>(savedSessionMinutes);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaveTransactionPending, setIsSaveTransactionPending] = useState(false);
  const isSaving = isUpdating || updateDailyGoal.isPending || isSaveTransactionPending;

  useEffect(() => {
    setSkillLevel(preferences.skill_level);
    setLearningGoal(preferences.learning_goal);
    setLearnerMode(preferences.learner_mode);
    setReadingSupport(preferences.reading_support);
    setSessionMinutes(savedSessionMinutes);
  }, [
    preferences.learner_mode,
    preferences.learning_goal,
    preferences.reading_support,
    preferences.skill_level,
    savedSessionMinutes,
  ]);

  useEffect(() => {
    if (!saved) return undefined;
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const metadataHasChanges = skillLevel !== preferences.skill_level
    || learningGoal !== preferences.learning_goal
    || learnerMode !== preferences.learner_mode
    || readingSupport !== preferences.reading_support;
  const dailyGoalIsAvailable = Boolean(xpData);
  const goalHasChanges = dailyGoalIsAvailable && sessionMinutes !== savedSessionMinutes;
  const hasChanges = metadataHasChanges || goalHasChanges;

  const handleSave = async () => {
    if (isSaveTransactionPending) return;

    let goalWasUpdated = false;
    setIsSaveTransactionPending(true);
    try {
      setSaveError('');
      setSaved(false);
      if (goalHasChanges) {
        await updateDailyGoal.mutateAsync(sessionMinutes);
        goalWasUpdated = true;
      }
      if (metadataHasChanges) {
        await updatePreferencesAsync({
          skill_level: skillLevel,
          learning_goal: learningGoal,
          learner_mode: learnerMode,
          reading_support: readingSupport,
        });
      }
      setSaved(true);
    } catch {
      if (goalWasUpdated && metadataHasChanges) {
        try {
          await updateDailyGoal.mutateAsync(savedSessionMinutes);
          setSaveError('We could not save all your preferences, so we restored your previous daily session. Reload to confirm your other choices before trying again.');
        } catch {
          setSaveError('We could not finish or undo every change. Your daily session may have changed. Reload this page to check your saved settings before trying again.');
        }
      } else {
        setSaveError('We could not save or confirm your changes. Reload this page to check your saved settings before trying again.');
      }
    } finally {
      setIsSaveTransactionPending(false);
    }
  };

  const handleReset = () => {
    setSkillLevel(preferences.skill_level);
    setLearningGoal(preferences.learning_goal);
    setLearnerMode(preferences.learner_mode);
    setReadingSupport(preferences.reading_support);
    setSessionMinutes(savedSessionMinutes);
    setSaveError('');
  };

  return (
    <LearnerPageShell className={hasChanges ? 'pb-40 sm:pb-28' : ''}>
      <LearnerPageHeader
        title="Settings"
        subtitle="Choose how HåfaGPT supports your learning."
        icon={SlidersHorizontal}
        backTo="/"
        backLabel="Back home"
        maxWidthClassName="max-w-3xl"
        trailing={<AuthButton />}
        showThemeToggle={false}
      />

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-5 sm:py-8">
        <SettingsSection
          eyebrow="Learning style"
          title="Make practice feel right"
          description="Choose who is learning and how much reading support to show. HåfaGPT does not need a child’s name, age, or school."
        >
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-brown-800 dark:text-gray-100">How you are learning</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {LEARNER_MODE_OPTIONS.map((option) => (
                <SettingsChoice
                  key={option.id}
                  {...option}
                  icon={MODE_ICONS[option.id]}
                  selected={learnerMode === option.id}
                  onSelect={setLearnerMode}
                  disabled={isSaving}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-bold text-brown-800 dark:text-gray-100">Reading support</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {READING_SUPPORT_OPTIONS.map((option) => (
                <SettingsChoice
                  key={option.id}
                  {...option}
                  icon={READING_ICONS[option.id]}
                  selected={readingSupport === option.id}
                  onSelect={setReadingSupport}
                  disabled={isSaving}
                />
              ))}
            </div>
          </fieldset>
        </SettingsSection>

        <SettingsSection
          eyebrow="Learning plan"
          title="Set your pace and focus"
          description="These choices shape recommendations while keeping every lesson, story, game, and tool available."
        >
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-brown-800 dark:text-gray-100">Chamorro confidence</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {CONFIDENCE_OPTIONS.map((option) => (
                <SettingsChoice
                  key={option.id}
                  {...option}
                  icon={CONFIDENCE_ICONS[option.id]}
                  selected={skillLevel === option.id}
                  onSelect={setSkillLevel}
                  disabled={isSaving}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-bold text-brown-800 dark:text-gray-100">Primary goal</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {LEARNING_GOAL_OPTIONS.map((option) => (
                <SettingsChoice
                  key={option.id}
                  {...option}
                  icon={GOAL_ICONS[option.id]}
                  selected={learningGoal === option.id}
                  onSelect={setLearningGoal}
                  disabled={isSaving}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-bold text-brown-800 dark:text-gray-100">Preferred daily session</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {DAILY_GOAL_OPTIONS.map((option) => (
                <SettingsChoice
                  key={option.id}
                  {...option}
                  icon={Clock3}
                  selected={sessionMinutes === option.id}
                  onSelect={setSessionMinutes}
                  disabled={isSaving || !dailyGoalIsAvailable}
                />
              ))}
            </div>
            {isXPError && !xpData && (
              <p role="alert" className="mt-3 text-sm font-medium text-amber-800 dark:text-amber-200">
                Your saved daily session could not load, so it will not be changed. Reload this page to try again.
              </p>
            )}
          </fieldset>
        </SettingsSection>

        {xpData ? (
          <Link
            to="/dashboard"
            aria-label={`View learning progress, level ${xpData.level}, ${xpData.total_xp} total XP`}
            className="group flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-900 dark:bg-amber-950/20"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-amber-700 dark:text-amber-300">Learning progress</span>
              <span className="block font-bold text-brown-950 dark:text-white">
                Level {xpData.level} · {getLevelInfo(xpData.level).title}
              </span>
              <span className="block text-xs text-brown-600 dark:text-gray-400">{xpData.total_xp.toLocaleString()} total XP</span>
            </span>
            <span className="text-sm font-semibold text-amber-800 group-hover:underline dark:text-amber-200">View</span>
          </Link>
        ) : isLoadingXP ? (
          <div className="h-24 animate-pulse rounded-2xl bg-cream-200 motion-reduce:animate-none dark:bg-slate-800" aria-label="Loading learning progress" />
        ) : null}

        <section className="rounded-3xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">Display</p>
          <h2 className="mt-1 text-xl font-bold text-brown-950 dark:text-white">Appearance</h2>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-cream-100 text-brown-700 dark:bg-slate-700 dark:text-teal-300">
                {theme === 'dark' ? <Moon className="h-5 w-5" aria-hidden="true" /> : <Sun className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div>
                <p className="font-bold text-brown-950 dark:text-white">Dark mode</p>
                <p className="text-sm text-brown-500 dark:text-gray-400">{theme === 'dark' ? 'On' : 'Off'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Dark mode"
              role="switch"
              aria-checked={theme === 'dark'}
              className={`flex h-11 w-16 flex-none items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 ${
                theme === 'dark' ? 'justify-end bg-teal-600' : 'justify-start bg-cream-300'
              }`}
            >
              <span className="h-9 w-9 rounded-full bg-white shadow-sm" aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-cream-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <h2 className="px-4 pt-4 text-lg font-bold text-brown-950 dark:text-white sm:px-6 sm:pt-5">Help and privacy</h2>
          <div className="mt-2 divide-y divide-cream-100 dark:divide-slate-700">
            <Link
              to="/support"
              className="flex min-h-14 items-center gap-3 px-4 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-coral-500 dark:hover:bg-slate-700/50 sm:px-6"
            >
              <HelpCircle className="h-5 w-5 text-coral-600 dark:text-teal-300" aria-hidden="true" />
              <span className="font-semibold text-brown-800 dark:text-gray-200">Help & support</span>
            </Link>
            <Link
              to="/privacy"
              className="flex min-h-14 items-center gap-3 px-4 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-coral-500 dark:hover:bg-slate-700/50 sm:px-6"
            >
              <Shield className="h-5 w-5 text-coral-600 dark:text-teal-300" aria-hidden="true" />
              <span className="font-semibold text-brown-800 dark:text-gray-200">Privacy policy</span>
            </Link>
          </div>
        </section>
      </main>

      {hasChanges && (
        <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-cream-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(69,47,37,0.08)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 sm:bottom-0">
          <div className="mx-auto max-w-3xl">
            {saveError && <p role="alert" className="mb-2 text-sm font-semibold text-red-700 dark:text-red-300">{saveError}</p>}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold text-brown-600 hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isLoadingXP}
                className="inline-flex min-h-12 min-w-40 items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-700"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {saved && !hasChanges && (
        <div
          role="status"
          className="fixed bottom-20 left-4 right-4 z-40 mx-auto flex max-w-sm items-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-white shadow-lg sm:bottom-4"
        >
          <Check className="h-5 w-5" aria-hidden="true" />
          <span className="font-semibold">Preferences saved</span>
        </div>
      )}
    </LearnerPageShell>
  );
}

export default SettingsPage;
