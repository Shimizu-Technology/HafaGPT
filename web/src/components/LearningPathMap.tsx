import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Lock, CheckCircle, Play, RotateCcw, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { useAllProgress } from '../hooks/useLearningPath';
import { BEGINNER_PATH, INTERMEDIATE_PATH, LearningTopic, LearningLevel, isLevelComplete } from '../data/learningPath';

interface TopicProgress {
  topic_id: string;
  started_at: string | null;
  completed_at: string | null;
  best_quiz_score: number | null;
  flashcards_viewed: number;
  last_activity_at: string | null;
}

// Calculate stars based on quiz score
function getStars(score: number | null): number {
  if (score === null) return 0;
  if (score >= 90) return 3;
  if (score >= 70) return 2;
  return 1;
}

// Get status of a topic
function getTopicStatus(
  topic: LearningTopic,
  progress: TopicProgress | undefined,
  prevCompleted: boolean,
  isFirst: boolean
): 'locked' | 'available' | 'in_progress' | 'completed' {
  if (progress?.completed_at) return 'completed';
  if (progress?.started_at) return 'in_progress';
  if (isFirst || prevCompleted) return 'available';
  return 'locked';
}

function StarDisplay({ count, size = 'sm' }: { count: number; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses} ${
            star <= count
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

function TopicNode({
  topic,
  progress,
  status,
  index,
}: {
  topic: LearningTopic;
  progress: TopicProgress | undefined;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  index: number;
}) {
  const stars = getStars(progress?.best_quiz_score ?? null);
  const isLocked = status === 'locked';
  
  const statusColors = {
    locked: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    available: 'bg-white dark:bg-gray-800 border-coral-300 dark:border-ocean-400 shadow-md',
    in_progress: 'bg-gradient-to-br from-coral-50 to-white dark:from-ocean-900 dark:to-gray-800 border-coral-400 dark:border-ocean-400 shadow-lg ring-2 ring-coral-200 dark:ring-ocean-500/30',
    completed: 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/30 dark:to-gray-800 border-emerald-400 dark:border-emerald-500 shadow-md',
  };

  const iconColors = {
    locked: 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
    available: 'bg-coral-100 dark:bg-ocean-800 text-coral-600 dark:text-ocean-400',
    in_progress: 'bg-coral-500 dark:bg-ocean-500 text-white',
    completed: 'bg-emerald-500 text-white',
  };

  const content = (
    <div
      className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all ${statusColors[status]} ${
        isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] cursor-pointer active:scale-[0.98]'
      }`}
    >
      {/* Topic number badge */}
      <div className="absolute -top-2 -left-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brown-600 dark:bg-ocean-500 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center shadow-sm">
        {index + 1}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 ${iconColors[status]}`}>
          {status === 'completed' ? (
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : status === 'locked' ? (
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            topic.icon
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm truncate ${
            isLocked ? 'text-gray-400 dark:text-gray-500' : 'text-brown-800 dark:text-white'
          }`}>
            {topic.title}
          </h3>
          
          <p className={`text-xs mt-0.5 truncate hidden sm:block ${
            isLocked ? 'text-gray-400 dark:text-gray-600' : 'text-brown-500 dark:text-gray-400'
          }`}>
            {topic.description}
          </p>

          {/* Status indicator */}
          <div className="flex items-center gap-2 mt-1 sm:mt-2">
            {status === 'completed' && (
              <>
                <StarDisplay count={stars} />
                {progress?.best_quiz_score !== null && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {progress.best_quiz_score}%
                  </span>
                )}
              </>
            )}
            {status === 'in_progress' && (
              <span className="text-xs text-coral-600 dark:text-ocean-400 font-medium flex items-center gap-1">
                <Play className="w-3 h-3 fill-current" />
                In Progress
              </span>
            )}
            {status === 'available' && (
              <span className="text-xs text-coral-600 dark:text-ocean-400 font-medium">
                Ready to start
              </span>
            )}
            {status === 'locked' && (
              <span className="text-xs text-gray-400 dark:text-gray-600 hidden sm:inline">
                Complete previous first
              </span>
            )}
          </div>
        </div>

        {/* Action indicator */}
        {!isLocked && (
          <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
            status === 'completed' 
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-coral-100 dark:bg-ocean-800 text-coral-600 dark:text-ocean-400'
          }`}>
            {status === 'completed' ? (
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (isLocked) {
    return content;
  }

  return (
    <Link to={`/learn/${topic.id}`}>
      {content}
    </Link>
  );
}

interface LevelSectionProps {
  level: LearningLevel;
  title: string;
  icon: string;
  topics: LearningTopic[];
  progressMap: Map<string, TopicProgress>;
  isLocked: boolean;
  completedCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function LevelSection({
  level,
  title,
  icon,
  topics,
  progressMap,
  isLocked,
  completedCount,
  isExpanded,
  onToggle,
}: LevelSectionProps) {
  let prevCompleted = false;

  const levelColors = {
    beginner: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-700',
      text: 'text-emerald-700 dark:text-emerald-400',
      progress: 'from-emerald-400 to-teal-500',
    },
    intermediate: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-700',
      text: 'text-amber-700 dark:text-amber-400',
      progress: 'from-amber-400 to-orange-500',
    },
    advanced: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-700',
      text: 'text-purple-700 dark:text-purple-400',
      progress: 'from-purple-400 to-pink-500',
    },
  };

  const colors = levelColors[level];
  const isComplete = completedCount === topics.length;

  return (
    <div className={`rounded-xl border ${isLocked ? 'opacity-60' : ''} ${colors.border} overflow-hidden`}>
      {/* Level Header */}
      <button
        onClick={onToggle}
        disabled={isLocked}
        className={`w-full p-3 sm:p-4 flex items-center justify-between ${colors.bg} ${
          isLocked ? 'cursor-not-allowed' : 'hover:brightness-95 transition-all'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">{icon}</span>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className={`font-bold text-sm sm:text-base ${colors.text}`}>
                {title}
              </h3>
              {isComplete && (
                <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
              )}
              {isLocked && (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <p className="text-xs text-brown-500 dark:text-gray-400">
              {isLocked ? 'Complete beginner first' : `${completedCount} of ${topics.length} topics`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mini progress bar */}
          {!isLocked && (
            <div className="hidden sm:block w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${colors.progress} rounded-full`}
                style={{ width: `${(completedCount / topics.length) * 100}%` }}
              />
            </div>
          )}
          {!isLocked && (
            isExpanded ? (
              <ChevronUp className="w-5 h-5 text-brown-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-brown-500 dark:text-gray-400" />
            )
          )}
        </div>
      </button>

      {/* Topics List */}
      {isExpanded && !isLocked && (
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 bg-white dark:bg-gray-800">
          {topics.map((topic, index) => {
            const progress = progressMap.get(topic.id);
            const status = getTopicStatus(topic, progress, prevCompleted, index === 0);
            
            if (progress?.completed_at) {
              prevCompleted = true;
            } else {
              prevCompleted = false;
            }

            return (
              <TopicNode
                key={topic.id}
                topic={topic}
                progress={progress}
                status={status}
                index={index}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LearningPathMap() {
  const { data: allProgress, isLoading } = useAllProgress();
  const [expandedLevel, setExpandedLevel] = useState<LearningLevel>('beginner');

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-cream-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Build progress map
  const progressMap = new Map<string, TopicProgress>(
    allProgress?.topics.map(t => [t.topic.id, t.progress]) || []
  );

  // Calculate completed topics per level
  const beginnerCompleted = BEGINNER_PATH.filter(
    topic => progressMap.get(topic.id)?.completed_at
  ).length;
  const intermediateCompleted = INTERMEDIATE_PATH.filter(
    topic => progressMap.get(topic.id)?.completed_at
  ).length;

  // Check if beginner is complete to unlock intermediate
  const completedTopicIds = Array.from(progressMap.entries())
    .filter(([_, progress]) => progress.completed_at)
    .map(([id, _]) => id);
  const beginnerComplete = isLevelComplete('beginner', completedTopicIds);

  // Total progress
  const totalTopics = BEGINNER_PATH.length + INTERMEDIATE_PATH.length;
  const totalCompleted = beginnerCompleted + intermediateCompleted;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-cream-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-brown-800 dark:text-white">
            Your Learning Journey
          </h2>
          <p className="text-xs sm:text-sm text-brown-500 dark:text-gray-400">
            {totalCompleted} of {totalTopics} topics mastered
          </p>
        </div>
        <div className="text-2xl sm:text-3xl">🗺️</div>
      </div>

      {/* Overall progress bar */}
      <div className="mb-4 sm:mb-6">
        <div className="h-1.5 sm:h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${(totalCompleted / totalTopics) * 100}%` }}
          />
        </div>
      </div>

      {/* Level sections */}
      <div className="space-y-3">
        <LevelSection
          level="beginner"
          title="Beginner"
          icon="🌱"
          topics={BEGINNER_PATH}
          progressMap={progressMap}
          isLocked={false}
          completedCount={beginnerCompleted}
          isExpanded={expandedLevel === 'beginner'}
          onToggle={() => setExpandedLevel(expandedLevel === 'beginner' ? 'intermediate' : 'beginner')}
        />

        <LevelSection
          level="intermediate"
          title="Intermediate"
          icon="🌿"
          topics={INTERMEDIATE_PATH}
          progressMap={progressMap}
          isLocked={!beginnerComplete}
          completedCount={intermediateCompleted}
          isExpanded={expandedLevel === 'intermediate'}
          onToggle={() => setExpandedLevel(expandedLevel === 'intermediate' ? 'beginner' : 'intermediate')}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-cream-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brown-600 dark:text-gray-300">
          <span className="text-brown-500 dark:text-gray-400">Stars:</span>
          <div className="flex items-center gap-1">
            <StarDisplay count={1} />
            <span>Done</span>
          </div>
          <div className="flex items-center gap-1">
            <StarDisplay count={2} />
            <span>70%+</span>
          </div>
          <div className="flex items-center gap-1">
            <StarDisplay count={3} />
            <span>90%+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

