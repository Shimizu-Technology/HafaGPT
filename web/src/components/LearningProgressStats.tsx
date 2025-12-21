import { BookOpen, Trophy, Target, Flame, Star } from 'lucide-react';
import { useAllProgress } from '../hooks/useLearningPath';
import { useStreak } from '../hooks/useStreak';

// Calculate total stars earned
function calculateTotalStars(topics: { progress: { best_quiz_score: number | null; completed_at: string | null } }[]): { earned: number; total: number } {
  let earned = 0;
  const total = topics.length * 3; // Max 3 stars per topic

  for (const { progress } of topics) {
    if (progress.completed_at && progress.best_quiz_score !== null) {
      if (progress.best_quiz_score >= 90) earned += 3;
      else if (progress.best_quiz_score >= 70) earned += 2;
      else earned += 1;
    }
  }

  return { earned, total };
}

// Calculate total flashcards viewed
function calculateTotalFlashcards(topics: { progress: { flashcards_viewed: number } }[]): number {
  return topics.reduce((sum, { progress }) => sum + (progress.flashcards_viewed || 0), 0);
}

// Calculate average quiz score
function calculateAverageScore(topics: { progress: { best_quiz_score: number | null; completed_at: string | null } }[]): number | null {
  const scores = topics
    .filter(t => t.progress.completed_at && t.progress.best_quiz_score !== null)
    .map(t => t.progress.best_quiz_score as number);
  
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function LearningProgressStats() {
  const { data: allProgress, isLoading: isLoadingProgress } = useAllProgress();
  const { streak, isLoading: isLoadingStreak } = useStreak();

  const isLoading = isLoadingProgress || isLoadingStreak;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-cream-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!allProgress) return null;

  const completedTopics = allProgress.completed_topics;
  const totalTopics = allProgress.total_topics;
  const stars = calculateTotalStars(allProgress.topics);
  const flashcardsViewed = calculateTotalFlashcards(allProgress.topics);
  const avgScore = calculateAverageScore(allProgress.topics);
  const currentStreak = streak?.streak || 0;

  const stats = [
    {
      icon: <BookOpen className="w-5 h-5" />,
      label: 'Topics',
      value: `${completedTopics}/${totalTopics}`,
      subtext: 'completed',
      color: 'bg-coral-100 dark:bg-ocean-900/50 text-coral-600 dark:text-ocean-400',
    },
    {
      icon: <Star className="w-5 h-5" />,
      label: 'Stars',
      value: `${stars.earned}/${stars.total}`,
      subtext: 'earned',
      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    },
    {
      icon: <Target className="w-5 h-5" />,
      label: 'Avg Score',
      value: avgScore !== null ? `${avgScore}%` : '—',
      subtext: avgScore !== null ? 'on quizzes' : 'no quizzes yet',
      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: <Flame className="w-5 h-5" />,
      label: 'Streak',
      value: currentStreak.toString(),
      subtext: currentStreak === 1 ? 'day' : 'days',
      color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-cream-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-brown-800 dark:text-white">
          Your Learning Progress
        </h2>
        <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
      </div>

      {/* Stats Grid - 4 columns on mobile for compact view */}
      <div className="grid grid-cols-4 sm:grid-cols-2 gap-2 sm:gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-cream-50 dark:bg-gray-700/50 text-center sm:text-left"
          >
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center mb-1 sm:mb-2 mx-auto sm:mx-0 ${stat.color} [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-5 sm:[&>svg]:h-5`}>
              {stat.icon}
            </div>
            <div className="text-base sm:text-xl font-bold text-brown-800 dark:text-white">
              {stat.value}
            </div>
            <div className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400 truncate">
              {stat.subtext}
            </div>
          </div>
        ))}
      </div>

      {/* Encouragement message */}
      {completedTopics > 0 && completedTopics < totalTopics && (
        <div className="mt-3 sm:mt-4 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-coral-50 to-teal-50 dark:from-ocean-900/30 dark:to-teal-900/30 border border-coral-100 dark:border-ocean-700">
          <p className="text-xs sm:text-sm text-brown-600 dark:text-gray-300 text-center">
            {completedTopics < 3 && "Great start! Keep going 🌟"}
            {completedTopics >= 3 && completedTopics < 5 && "Halfway there! 🚀"}
            {completedTopics >= 5 && completedTopics < totalTopics && "Almost there! 💪"}
          </p>
        </div>
      )}

      {completedTopics === totalTopics && (
        <div className="mt-3 sm:mt-4 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-900/30 dark:to-emerald-900/30 border border-amber-200 dark:border-amber-700">
          <p className="text-xs sm:text-sm text-brown-600 dark:text-gray-300 text-center">
            🎉 All beginner topics mastered!
          </p>
        </div>
      )}

      {/* Flashcards viewed stat - hidden on mobile */}
      {flashcardsViewed > 0 && (
        <div className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-brown-500 dark:text-gray-400 hidden sm:block">
          📚 {flashcardsViewed} flashcard{flashcardsViewed !== 1 ? 's' : ''} studied so far
        </div>
      )}
    </div>
  );
}

