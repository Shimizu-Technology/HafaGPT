import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
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
  Sparkles,
  Sprout,
  Sun,
  TreePine,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useSubscription } from '../hooks/useSubscription';
import { useXP, useUpdateDailyGoal, getLevelInfo } from '../hooks/useXP';
import { AuthButton } from './AuthButton';
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

const MODE_ICONS: Record<LearnerMode, LucideIcon> = { self: UserRound, with_child: UsersRound, helping_family: HandHeart };
const READING_ICONS: Record<ReadingSupport, LucideIcon> = { audio_pictures: Headphones, short_text_audio: AudioLines, independent: BookOpen };
const CONFIDENCE_ICONS: Record<SkillLevel, LucideIcon> = { beginner: Sprout, intermediate: Leaf, advanced: TreePine };
const GOAL_ICONS: Record<LearningGoal, LucideIcon> = { conversation: MessageCircle, culture: Landmark, family: HeartHandshake, travel: MapPin, all: Sparkles };

interface SettingsChoiceProps<T extends string | number> {
  id: T;
  title: string;
  description: string;
  selected: boolean;
  icon: LucideIcon;
  onSelect: (id: T) => void;
}

function SettingsChoice<T extends string | number>({ id, title, description, selected, icon: Icon, onSelect }: SettingsChoiceProps<T>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      className={`flex min-h-16 w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:focus-visible:ring-ocean-400 dark:focus-visible:ring-offset-gray-900 ${
        selected
          ? 'border-coral-500 bg-coral-50 dark:border-ocean-400 dark:bg-ocean-900/30'
          : 'border-cream-200 bg-white hover:border-coral-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-ocean-600'
      }`}
    >
      <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${selected ? 'bg-coral-100 text-coral-700 dark:bg-ocean-800 dark:text-ocean-200' : 'bg-cream-100 text-brown-600 dark:bg-gray-700 dark:text-gray-300'}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-brown-900 dark:text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-brown-600 dark:text-gray-300">{description}</span>
      </span>
      {selected && <Check className="h-5 w-5 flex-none text-coral-600 dark:text-ocean-300" aria-hidden="true" />}
    </button>
  );
}

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { preferences, updatePreferencesAsync, isUpdating } = useUserPreferences();
  const { isChristmasTheme, isNewYearTheme } = useSubscription();
  const { data: xpData, isLoading: isLoadingXP } = useXP();
  const updateDailyGoal = useUpdateDailyGoal();
  
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(preferences.skill_level);
  const [learningGoal, setLearningGoal] = useState<LearningGoal>(preferences.learning_goal);
  const [learnerMode, setLearnerMode] = useState<LearnerMode>(preferences.learner_mode);
  const [readingSupport, setReadingSupport] = useState<ReadingSupport>(preferences.reading_support);
  const [sessionMinutes, setSessionMinutes] = useState<DailySessionMinutes>(preferences.daily_session_minutes);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  // Sync state when preferences load
  useEffect(() => {
    setSkillLevel(preferences.skill_level);
    setLearningGoal(preferences.learning_goal);
    setLearnerMode(preferences.learner_mode);
    setReadingSupport(preferences.reading_support);
    setSessionMinutes(preferences.daily_session_minutes);
  }, [
    preferences.daily_session_minutes,
    preferences.learner_mode,
    preferences.learning_goal,
    preferences.reading_support,
    preferences.skill_level,
  ]);
  
  // Track if there are unsaved changes
  const hasChanges = skillLevel !== preferences.skill_level
    || learningGoal !== preferences.learning_goal
    || learnerMode !== preferences.learner_mode
    || readingSupport !== preferences.reading_support
    || sessionMinutes !== preferences.daily_session_minutes;

  const handleSave = async () => {
    try {
      setSaveError('');
      await updatePreferencesAsync({
        skill_level: skillLevel,
        learning_goal: learningGoal,
        learner_mode: learnerMode,
        reading_support: readingSupport,
        daily_session_minutes: sessionMinutes,
      });
      if (xpData && xpData.daily_goal_minutes !== sessionMinutes) {
        try {
          await updateDailyGoal.mutateAsync(sessionMinutes);
        } catch {
          // The capability preference is canonical for the Today planner. The
          // legacy XP goal sync is best-effort during the compatibility period.
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError('We could not save your preferences. Please try again.');
    }
  };

  const handleReset = () => {
    setSkillLevel(preferences.skill_level);
    setLearningGoal(preferences.learning_goal);
    setLearnerMode(preferences.learner_mode);
    setReadingSupport(preferences.reading_support);
    setSessionMinutes(preferences.daily_session_minutes);
    setSaveError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-cream-200/50 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between safe-area-top">
          <div className="flex items-center gap-2">
            <Link 
              to="/"
              aria-label="Back to home"
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-cream-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="w-5 h-5 text-brown-600 dark:text-gray-300" />
            </Link>
            <span className="text-lg">{isChristmasTheme ? '🎄' : isNewYearTheme ? '🎆' : '🌺'}</span>
            <h1 className="text-lg font-bold text-brown-800 dark:text-white">Settings</h1>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-cream-100 dark:hover:bg-gray-700"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-brown-600" />
              )}
            </button>
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <section className="overflow-hidden rounded-2xl border border-cream-200/70 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-cream-200/70 px-4 py-4 dark:border-gray-700">
            <h2 className="font-semibold text-brown-900 dark:text-white">Your learning setup</h2>
            <p className="mt-1 text-sm text-brown-600 dark:text-gray-300">
              These choices personalize pacing and presentation. We do not ask for a child’s name, age, or school.
            </p>
          </div>

          <div className="space-y-6 p-4">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-brown-800 dark:text-gray-100">How you are learning</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {LEARNER_MODE_OPTIONS.map((option) => (
                  <SettingsChoice key={option.id} {...option} icon={MODE_ICONS[option.id]} selected={learnerMode === option.id} onSelect={setLearnerMode} />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-brown-800 dark:text-gray-100">Reading support</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {READING_SUPPORT_OPTIONS.map((option) => (
                  <SettingsChoice key={option.id} {...option} icon={READING_ICONS[option.id]} selected={readingSupport === option.id} onSelect={setReadingSupport} />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-brown-800 dark:text-gray-100">Chamorro confidence</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {CONFIDENCE_OPTIONS.map((option) => (
                  <SettingsChoice key={option.id} {...option} icon={CONFIDENCE_ICONS[option.id]} selected={skillLevel === option.id} onSelect={setSkillLevel} />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-brown-800 dark:text-gray-100">Primary goal</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {LEARNING_GOAL_OPTIONS.map((option) => (
                  <SettingsChoice key={option.id} {...option} icon={GOAL_ICONS[option.id]} selected={learningGoal === option.id} onSelect={setLearningGoal} />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-brown-800 dark:text-gray-100">Preferred daily session</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DAILY_SESSION_OPTIONS.map((option) => (
                  <SettingsChoice key={option.id} {...option} icon={Clock3} selected={sessionMinutes === option.id} onSelect={setSessionMinutes} />
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        {/* Existing XP progress remains visible during the preference rollout. */}
        {xpData && (
          <section className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-700/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-200/50 dark:border-amber-700/50">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-brown-800 dark:text-white">Learning progress</h2>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Current XP Display */}
              <div className="flex items-center gap-4 p-3 bg-white/60 dark:bg-gray-800/40 rounded-xl">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md">
                  <span className="text-2xl">{getLevelInfo(xpData.level).emoji}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-amber-800 dark:text-amber-200">
                      Level {xpData.level}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-amber-200/60 dark:bg-amber-700/40 rounded-full text-amber-700 dark:text-amber-300 font-medium">
                      {getLevelInfo(xpData.level).title}
                    </span>
                  </div>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {xpData.total_xp.toLocaleString()} XP total
                  </p>
                  {/* Progress bar */}
                  <div className="mt-2 h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500"
                      style={{ width: `${xpData.xp_progress}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </section>
        )}

        {isLoadingXP && (
          <section className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-700/50 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-200 dark:bg-amber-700/50" />
              <div className="space-y-2">
                <div className="h-5 w-24 bg-amber-200 dark:bg-amber-700/50 rounded" />
                <div className="h-3 w-16 bg-amber-100 dark:bg-amber-800/50 rounded" />
              </div>
            </div>
            <div className="h-2.5 bg-amber-200 dark:bg-amber-800 rounded-full" />
          </section>
        )}

        {/* Save Bar - Fixed at bottom when there are changes */}
        {hasChanges && (
          <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-cream-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:bottom-0">
            <div className="mx-auto max-w-2xl">
              {saveError && <p role="alert" className="mb-2 text-sm font-medium text-red-700 dark:text-red-300">{saveError}</p>}
              <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleReset}
                className="flex min-h-11 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm text-brown-600 transition-colors hover:text-brown-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-gray-300 dark:hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="flex min-h-11 max-w-xs flex-1 items-center justify-center gap-2 rounded-xl bg-coral-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-coral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-ocean-500 dark:hover:bg-ocean-600 dark:focus-visible:ring-ocean-400"
              >
                {isUpdating ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
              </div>
            </div>
          </div>
        )}

        {/* Saved Toast */}
        {saved && !hasChanges && (
          <div role="status" className="fixed bottom-20 left-4 right-4 z-30 mx-auto flex max-w-sm items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-white shadow-lg sm:bottom-4">
            <Check className="w-5 h-5" />
            <span className="font-medium">Preferences saved!</span>
          </div>
        )}

        {/* Appearance Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-cream-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-cream-200/50 dark:border-gray-700/50">
            <h2 className="font-semibold text-brown-800 dark:text-white">Appearance</h2>
          </div>
          
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-cream-100'
                }`}>
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-ocean-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-brown-800 dark:text-white">Dark Mode</p>
                  <p className="text-xs text-brown-500 dark:text-gray-400">
                    {theme === 'dark' ? 'On' : 'Off'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                aria-label="Dark mode"
                className={`flex h-11 w-14 flex-shrink-0 items-center rounded-full p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 ${
                  theme === 'dark' 
                    ? 'bg-ocean-500 justify-end' 
                    : 'bg-cream-300 justify-start'
                }`}
                role="switch"
                aria-checked={theme === 'dark'}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md transition-all duration-200">
                  {theme === 'dark' ? (
                    <Moon className="w-3.5 h-3.5 text-ocean-600" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-yellow-500" />
                  )}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Quick Links Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-cream-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-cream-200/50 dark:border-gray-700/50">
            <h2 className="font-semibold text-brown-800 dark:text-white">More</h2>
          </div>
          
          <div className="divide-y divide-cream-100 dark:divide-gray-700">
            <Link 
              to="/support"
              className="flex items-center gap-3 px-4 py-3 hover:bg-cream-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              <span className="text-brown-700 dark:text-gray-300">Help & Support</span>
            </Link>
            <Link 
              to="/privacy"
              className="flex items-center gap-3 px-4 py-3 hover:bg-cream-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Shield className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              <span className="text-brown-700 dark:text-gray-300">Privacy Policy</span>
            </Link>
          </div>
        </section>
        
        {/* Spacer for fixed save bar and bottom nav */}
        <div className={hasChanges ? "h-28" : "h-20"} />
      </main>
    </div>
  );
}

export default SettingsPage;
