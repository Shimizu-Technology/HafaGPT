import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, CheckCircle, RotateCcw, BookOpen, ChevronDown, ChevronUp, Map as MapIcon, Trophy } from 'lucide-react';
import { useRecommendedTopic, useAllProgress } from '../hooks/useLearningPath';
import { BEGINNER_PATH, INTERMEDIATE_PATH, ADVANCED_PATH, ALL_TOPICS, isLevelComplete } from '../data/learningPath';

export function RecommendedLearning() {
  const { data, isLoading, error } = useRecommendedTopic();
  const { data: allProgress } = useAllProgress();
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-coral-400 to-coral-500 dark:from-ocean-500 dark:to-ocean-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden animate-pulse">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20" />
            <div className="flex-1">
              <div className="h-3 w-24 bg-white/20 rounded mb-2" />
              <div className="h-5 w-40 bg-white/30 rounded" />
            </div>
          </div>
          <div className="h-4 w-full bg-white/20 rounded mb-2" />
          <div className="h-4 w-2/3 bg-white/20 rounded mb-4" />
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 bg-white/20 rounded" />
            <div className="h-10 w-28 bg-white/30 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything on error or no data
  if (error || !data) {
    return null;
  }

  const { recommendation_type, topic, progress, completed_topics, total_topics, message } = data;

  // Build a map of topic progress for quick lookup
  const progressMap = new Map(
    allProgress?.topics.map(t => [t.topic.id, t.progress]) || []
  );

  // Check which levels are complete
  const completedTopicIds = Array.from(progressMap.entries())
    .filter(([_, progress]) => progress.completed_at)
    .map(([id]) => id);
  
  const beginnerComplete = isLevelComplete('beginner', completedTopicIds);
  const intermediateComplete = isLevelComplete('intermediate', completedTopicIds);
  const advancedComplete = isLevelComplete('advanced', completedTopicIds);

  // If beginner is complete but intermediate is not, suggest intermediate
  if (beginnerComplete && !intermediateComplete && recommendation_type === 'complete') {
    // Find first incomplete intermediate topic
    const nextIntermediate = INTERMEDIATE_PATH.find(
      t => !completedTopicIds.includes(t.id)
    ) || INTERMEDIATE_PATH[0];

    return (
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          {/* Celebration banner */}
          <div className="flex items-center gap-2 mb-4 bg-white/20 px-3 py-2 rounded-lg w-fit">
            <Trophy className="w-4 h-4 text-amber-200" />
            <span className="text-sm font-medium">Beginner Complete!</span>
          </div>

          {/* Next level intro */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
                {nextIntermediate.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                    🌿 Intermediate Level
                  </span>
                </div>
                <h3 className="font-bold text-lg sm:text-xl">{nextIntermediate.title}</h3>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-white/60" />
          </div>

          <p className="text-white/90 mb-4 text-sm sm:text-base">
            You've mastered the basics! Time to level up with grammar patterns, new vocabulary, and sentence building.
          </p>

          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80">⏱️ ~{nextIntermediate.estimatedMinutes} min</span>
            <Link
              to={`/learn/${nextIntermediate.id}`}
              className="inline-flex items-center gap-2 bg-white text-gray-900 
                         px-4 py-2.5 rounded-xl font-semibold text-sm
                         hover:bg-white/90 transition-colors shadow-sm"
            >
              Start Intermediate
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* View full path */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <Link
              to="/learning"
              className="flex items-center justify-center gap-2 text-white/70 hover:text-white 
                         text-sm py-2 transition-colors"
            >
              <MapIcon className="w-4 h-4" />
              View Full Learning Path
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If intermediate is complete but advanced is not, suggest advanced
  if (intermediateComplete && !advancedComplete && recommendation_type === 'complete') {
    // Find first incomplete advanced topic
    const nextAdvanced = ADVANCED_PATH.find(
      t => !completedTopicIds.includes(t.id)
    ) || ADVANCED_PATH[0];

    return (
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-600 dark:to-pink-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          {/* Celebration banner */}
          <div className="flex items-center gap-2 mb-4 bg-white/20 px-3 py-2 rounded-lg w-fit">
            <Trophy className="w-4 h-4 text-purple-200" />
            <span className="text-sm font-medium">Intermediate Complete!</span>
          </div>

          {/* Next level intro */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
                {nextAdvanced.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                    🌳 Advanced Level
                  </span>
                </div>
                <h3 className="font-bold text-lg sm:text-xl">{nextAdvanced.title}</h3>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-white/60" />
          </div>

          <p className="text-white/90 mb-4 text-sm sm:text-base">
            You're ready for advanced topics! Master real-world skills like directions, shopping, and Chamorro culture.
          </p>

          <Link
            to={`/learn/${nextAdvanced.id}`}
            className="w-full flex items-center justify-center gap-2 bg-white text-purple-600 
                       hover:bg-white/90 font-semibold py-3 px-6 rounded-xl shadow-lg 
                       hover:shadow-xl transition-all group"
          >
            Start Advanced Level
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <div className="mt-4 pt-4 border-t border-white/20">
            <Link
              to="/learning"
              className="flex items-center justify-center gap-2 text-white/70 hover:text-white 
                         text-sm py-2 transition-colors"
            >
              <MapIcon className="w-4 h-4" />
              View Full Learning Path
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // All topics complete (all levels) - show celebration with option to review
  if (recommendation_type === 'complete' && !topic) {
    return (
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">All Paths Complete! 🎉</h3>
              <p className="text-sm text-white/80">Beginner, Intermediate & Advanced mastered</p>
            </div>
          </div>
        </div>
        
        <p className="text-white/90 mb-4">{message || "Amazing work! You've completed all available lessons."}</p>
        
        {/* Toggle to show all topics for review */}
        <button
          onClick={() => setShowAllTopics(!showAllTopics)}
          className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 
                     px-4 py-3 rounded-xl font-medium transition-colors mb-3"
        >
          <span className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Review a Topic
          </span>
          {showAllTopics ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* Topic list for review - both levels */}
        {showAllTopics && (
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            <div className="text-xs text-white/60 px-1 py-1 font-medium">🌱 Beginner</div>
            {BEGINNER_PATH.map((pathTopic) => {
              const prog = progressMap.get(pathTopic.id);
              return (
                <Link
                  key={pathTopic.id}
                  to={`/learn/${pathTopic.id}`}
                  className="flex items-center justify-between bg-white/10 hover:bg-white/20 
                           px-4 py-3 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{pathTopic.icon}</span>
                    <span className="font-medium">{pathTopic.title}</span>
                  </div>
                  {prog?.best_quiz_score !== null && prog?.best_quiz_score !== undefined && (
                    <span className={`text-sm font-semibold ${
                      prog.best_quiz_score >= 80 ? 'text-emerald-200' :
                      prog.best_quiz_score >= 60 ? 'text-yellow-200' : 'text-red-200'
                    }`}>
                      {prog.best_quiz_score}%
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="text-xs text-white/60 px-1 py-1 font-medium mt-3">🌿 Intermediate</div>
            {INTERMEDIATE_PATH.map((pathTopic) => {
              const prog = progressMap.get(pathTopic.id);
              return (
                <Link
                  key={pathTopic.id}
                  to={`/learn/${pathTopic.id}`}
                  className="flex items-center justify-between bg-white/10 hover:bg-white/20 
                           px-4 py-3 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{pathTopic.icon}</span>
                    <span className="font-medium">{pathTopic.title}</span>
                  </div>
                  {prog?.best_quiz_score !== null && prog?.best_quiz_score !== undefined && (
                    <span className={`text-sm font-semibold ${
                      prog.best_quiz_score >= 80 ? 'text-emerald-200' :
                      prog.best_quiz_score >= 60 ? 'text-yellow-200' : 'text-red-200'
                    }`}>
                      {prog.best_quiz_score}%
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="text-xs text-white/60 px-1 py-1 font-medium mt-3">🌳 Advanced</div>
            {ADVANCED_PATH.map((pathTopic) => {
              const prog = progressMap.get(pathTopic.id);
              return (
                <Link
                  key={pathTopic.id}
                  to={`/learn/${pathTopic.id}`}
                  className="flex items-center justify-between bg-white/10 hover:bg-white/20 
                           px-4 py-3 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{pathTopic.icon}</span>
                    <span className="font-medium">{pathTopic.title}</span>
                  </div>
                  {prog?.best_quiz_score !== null && prog?.best_quiz_score !== undefined && (
                    <span className={`text-sm font-semibold ${
                      prog.best_quiz_score >= 80 ? 'text-emerald-200' :
                      prog.best_quiz_score >= 60 ? 'text-yellow-200' : 'text-red-200'
                    }`}>
                      {prog.best_quiz_score}%
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          <Link
            to="/games"
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 
                       px-4 py-2.5 rounded-xl font-medium transition-colors"
          >
            Play Games to Practice
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/learning"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 
                       px-4 py-2.5 rounded-xl font-medium transition-colors"
          >
            <MapIcon className="w-4 h-4" />
            View Full Path
          </Link>
        </div>
      </div>
    );
  }

  if (!topic) return null;

  // Determine styling based on recommendation type
  const isReview = recommendation_type === 'review';
  const isContinue = recommendation_type === 'continue';
  const isStart = recommendation_type === 'start';

  // Get gradient colors based on type
  const gradientClass = isReview
    ? 'from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600'
    : isContinue
    ? 'from-ocean-500 to-teal-500 dark:from-ocean-600 dark:to-teal-600'
    : 'from-coral-500 to-rose-500 dark:from-coral-600 dark:to-rose-600';

  // Build the link to the lesson for this topic
  const topicLink = `/learn/${topic.id}`;

  // Action text
  const actionText = isReview
    ? 'Review Now'
    : isContinue
    ? 'Continue'
    : 'Start Learning';

  // Icon
  const IconComponent = isReview ? RotateCcw : isContinue ? BookOpen : Sparkles;

  return (
    <div className={`bg-gradient-to-r ${gradientClass} rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden`}>
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
              {topic.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                  {isStart ? 'Recommended for You' : isContinue ? 'Continue Learning' : 'Time to Review'}
                </span>
              </div>
              <h3 className="font-bold text-lg sm:text-xl">{topic.title}</h3>
            </div>
          </div>
          <IconComponent className="w-5 h-5 text-white/60" />
        </div>

        {/* Description */}
        <p className="text-white/90 mb-4 text-sm sm:text-base">
          {topic.description}
        </p>

        {/* Progress bar (if continuing or reviewing) */}
        {(isContinue || isReview) && progress && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>
                {progress.flashcards_viewed} {progress.flashcards_viewed === 1 ? 'flashcard' : 'flashcards'} viewed
              </span>
              {progress.best_quiz_score !== null && (
                <span>Best score: {progress.best_quiz_score}%</span>
              )}
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/60 rounded-full transition-all"
                style={{ 
                  width: `${Math.min((progress.flashcards_viewed / 10) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Main action */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 text-sm text-white/80">
            <span>⏱️ ~{topic.estimated_minutes} min</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              {completed_topics}/{total_topics} topics done
            </span>
          </div>
          
          <Link
            to={topicLink}
            className="inline-flex items-center gap-2 bg-white text-gray-900 
                       px-4 py-2.5 rounded-xl font-semibold text-sm
                       hover:bg-white/90 transition-colors shadow-sm
                       active:scale-[0.98]"
          >
            {actionText}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Choose different topic (always available when topics are completed) */}
        {completed_topics > 0 && (
          <>
            <button
              onClick={() => setShowAllTopics(!showAllTopics)}
              className="w-full flex items-center justify-center gap-2 text-white/70 hover:text-white 
                         text-sm py-2 transition-colors"
            >
              {showAllTopics ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide all topics
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Choose a different topic
                </>
              )}
            </button>

            {showAllTopics && (
              <div className="space-y-2 mt-3 pt-3 border-t border-white/20 max-h-64 overflow-y-auto">
                <div className="text-xs text-white/60 px-1 py-1 font-medium">🌱 Beginner</div>
                {BEGINNER_PATH.map((pathTopic) => {
                  const prog = progressMap.get(pathTopic.id);
                  const isCurrentTopic = pathTopic.id === topic.id;
                  return (
                    <Link
                      key={pathTopic.id}
                      to={`/learn/${pathTopic.id}`}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                        isCurrentTopic 
                          ? 'bg-white/30 ring-2 ring-white/50' 
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{pathTopic.icon}</span>
                        <span className="font-medium">{pathTopic.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {prog?.completed_at && (
                          <CheckCircle className="w-4 h-4 text-emerald-300" />
                        )}
                        {prog?.best_quiz_score !== null && prog?.best_quiz_score !== undefined && (
                          <span className={`text-sm font-semibold ${
                            prog.best_quiz_score >= 80 ? 'text-emerald-200' :
                            prog.best_quiz_score >= 60 ? 'text-yellow-200' : 'text-red-200'
                          }`}>
                            {prog.best_quiz_score}%
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
                
                {/* Show intermediate topics if beginner is complete */}
                {beginnerComplete && (
                  <>
                    <div className="text-xs text-white/60 px-1 py-1 font-medium mt-3">🌿 Intermediate</div>
                    {INTERMEDIATE_PATH.map((pathTopic) => {
                      const prog = progressMap.get(pathTopic.id);
                      const isCurrentTopic = pathTopic.id === topic.id;
                      return (
                        <Link
                          key={pathTopic.id}
                          to={`/learn/${pathTopic.id}`}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                            isCurrentTopic 
                              ? 'bg-white/30 ring-2 ring-white/50' 
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{pathTopic.icon}</span>
                            <span className="font-medium">{pathTopic.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {prog?.completed_at && (
                              <CheckCircle className="w-4 h-4 text-emerald-300" />
                            )}
                            {prog?.best_quiz_score !== null && prog?.best_quiz_score !== undefined && (
                              <span className={`text-sm font-semibold ${
                                prog.best_quiz_score >= 80 ? 'text-emerald-200' :
                                prog.best_quiz_score >= 60 ? 'text-yellow-200' : 'text-red-200'
                              }`}>
                                {prog.best_quiz_score}%
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </>
                )}

                {/* Show advanced topics if intermediate is complete */}
                {intermediateComplete && (
                  <>
                    <div className="text-xs text-white/60 px-1 py-1 font-medium mt-3">🌳 Advanced</div>
                    {ADVANCED_PATH.map((pathTopic) => {
                      const prog = progressMap.get(pathTopic.id);
                      const isCurrentTopic = pathTopic.id === topic.id;
                      return (
                        <Link
                          key={pathTopic.id}
                          to={`/learn/${pathTopic.id}`}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                            isCurrentTopic 
                              ? 'bg-white/30 ring-2 ring-white/50' 
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{pathTopic.icon}</span>
                            <span className="font-medium">{pathTopic.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {prog?.completed_at && (
                              <CheckCircle className="w-4 h-4 text-emerald-300" />
                            )}
                            {prog?.best_quiz_score !== null && prog?.best_quiz_score !== undefined && (
                              <span className={`text-sm font-semibold ${
                                prog.best_quiz_score >= 80 ? 'text-emerald-200' :
                                prog.best_quiz_score >= 60 ? 'text-yellow-200' : 'text-red-200'
                              }`}>
                                {prog.best_quiz_score}%
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* View Full Path link */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <Link
            to="/learning"
            className="flex items-center justify-center gap-2 text-white/70 hover:text-white 
                       text-sm py-2 transition-colors"
          >
            <MapIcon className="w-4 h-4" />
            View Full Learning Path
          </Link>
        </div>
      </div>
    </div>
  );
}

