import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Check, Save, RotateCcw } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useUserPreferences, SkillLevel, LearningGoal } from '../hooks/useUserPreferences';
import { useSubscription } from '../hooks/useSubscription';
import { AuthButton } from './AuthButton';

const SKILL_LEVELS: { id: SkillLevel; icon: string; title: string; description: string }[] = [
  {
    id: 'beginner',
    icon: '🌱',
    title: 'Beginner',
    description: 'New to Chamorro. Simple explanations with lots of English help.',
  },
  {
    id: 'intermediate',
    icon: '🌿',
    title: 'Intermediate',
    description: 'Know some basics. Ready for more Chamorro with practice exercises.',
  },
  {
    id: 'advanced',
    icon: '🌳',
    title: 'Advanced',
    description: 'Can understand Chamorro. Nuanced explanations and cultural depth.',
  },
];

const LEARNING_GOALS: { id: LearningGoal; icon: string; title: string }[] = [
  { id: 'conversation', icon: '💬', title: 'Conversation' },
  { id: 'culture', icon: '🌴', title: 'Culture' },
  { id: 'family', icon: '👨‍👩‍👧‍👦', title: 'Family' },
  { id: 'travel', icon: '✈️', title: 'Travel' },
  { id: 'all', icon: '✨', title: 'Everything' },
];

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { preferences, updatePreferencesAsync, isUpdating } = useUserPreferences();
  const { isChristmasTheme } = useSubscription();
  
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(preferences.skill_level);
  const [learningGoal, setLearningGoal] = useState<LearningGoal>(preferences.learning_goal);
  const [saved, setSaved] = useState(false);
  
  // Sync state when preferences load
  useEffect(() => {
    setSkillLevel(preferences.skill_level);
    setLearningGoal(preferences.learning_goal);
  }, [preferences.skill_level, preferences.learning_goal]);
  
  // Track if there are unsaved changes
  const hasChanges = skillLevel !== preferences.skill_level || learningGoal !== preferences.learning_goal;

  const handleSave = async () => {
    try {
      await updatePreferencesAsync({
        skill_level: skillLevel,
        learning_goal: learningGoal,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const handleReset = () => {
    setSkillLevel(preferences.skill_level);
    setLearningGoal(preferences.learning_goal);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-cream-200/50 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link 
              to="/"
              className="p-2 -ml-2 rounded-lg hover:bg-cream-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-brown-600 dark:text-gray-300" />
            </Link>
            <span className="text-lg">{isChristmasTheme ? '🎄' : '🌺'}</span>
            <h1 className="text-lg font-bold text-brown-800 dark:text-white">Settings</h1>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-cream-100 dark:hover:bg-gray-700 transition-colors"
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
        {/* Skill Level Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-cream-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-cream-200/50 dark:border-gray-700/50">
            <h2 className="font-semibold text-brown-800 dark:text-white">Experience Level</h2>
            <p className="text-xs text-brown-500 dark:text-gray-400 mt-0.5">
              How familiar are you with Chamorro?
            </p>
          </div>
          
          <div className="p-3 space-y-2">
            {SKILL_LEVELS.map((level) => {
              const isSelected = skillLevel === level.id;
              return (
                <button
                  key={level.id}
                  onClick={() => setSkillLevel(level.id)}
                  className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-coral-500 dark:border-ocean-400 bg-coral-50 dark:bg-ocean-500/20'
                      : 'border-cream-200 dark:border-gray-600 hover:border-coral-300 dark:hover:border-ocean-600 bg-white dark:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
                      isSelected 
                        ? 'bg-coral-100 dark:bg-ocean-600/50' 
                        : 'bg-cream-100 dark:bg-gray-600'
                    }`}>
                      {level.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`block font-medium ${
                        isSelected 
                          ? 'text-coral-700 dark:text-ocean-300' 
                          : 'text-brown-800 dark:text-white'
                      }`}>
                        {level.title}
                      </span>
                      <p className={`text-xs mt-0.5 ${
                        isSelected 
                          ? 'text-coral-600 dark:text-ocean-200' 
                          : 'text-brown-500 dark:text-gray-400'
                      }`}>
                        {level.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-coral-500 dark:text-ocean-400 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Learning Goal Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-cream-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-cream-200/50 dark:border-gray-700/50">
            <h2 className="font-semibold text-brown-800 dark:text-white">Learning Goal</h2>
            <p className="text-xs text-brown-500 dark:text-gray-400 mt-0.5">
              What's your main reason for learning?
            </p>
          </div>
          
          <div className="p-3">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {LEARNING_GOALS.map((goal) => {
                const isSelected = learningGoal === goal.id;
                return (
                  <button
                    key={goal.id}
                    onClick={() => setLearningGoal(goal.id)}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'border-coral-500 dark:border-ocean-400 bg-coral-50 dark:bg-ocean-500/20'
                        : 'border-cream-200 dark:border-gray-600 hover:border-coral-300 dark:hover:border-ocean-600 bg-white dark:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-xl">{goal.icon}</span>
                    <span className={`text-xs font-medium text-center ${
                      isSelected 
                        ? 'text-coral-700 dark:text-ocean-300' 
                        : 'text-brown-700 dark:text-gray-300'
                    }`}>
                      {goal.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Save Bar - Fixed at bottom when there are changes */}
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-cream-200 dark:border-gray-700 p-4 shadow-lg z-20">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 text-sm text-brown-600 dark:text-gray-300 hover:text-brown-800 dark:hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="flex-1 max-w-xs px-4 py-2.5 bg-coral-500 dark:bg-ocean-500 hover:bg-coral-600 dark:hover:bg-ocean-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
        )}

        {/* Saved Toast */}
        {saved && !hasChanges && (
          <div className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-20 animate-fade-in">
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
                className={`flex items-center w-[52px] h-[28px] rounded-full p-[2px] transition-colors flex-shrink-0 ${
                  theme === 'dark' 
                    ? 'bg-ocean-500 justify-end' 
                    : 'bg-cream-300 justify-start'
                }`}
                role="switch"
                aria-checked={theme === 'dark'}
              >
                <span className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-200">
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
        
        {/* Spacer for fixed save bar */}
        {hasChanges && <div className="h-20" />}
      </main>
    </div>
  );
}

export default SettingsPage;
