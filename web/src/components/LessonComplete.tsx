import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Star, ArrowRight, Home, RotateCcw, Sparkles } from 'lucide-react';
import { LearningTopic, getNextTopic } from '../data/learningPath';

interface LessonCompleteProps {
  topic: LearningTopic;
  topicIndex: number;
  totalTopics: number;
  quizScore: number;
  onNextTopic: () => void;
}

export function LessonComplete({ topic, topicIndex, totalTopics, quizScore, onNextTopic }: LessonCompleteProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  
  const nextTopic = getNextTopic(topic.id);
  const isPassing = quizScore >= 70;
  const isPerfect = quizScore === 100;
  const isLastTopic = topicIndex === totalTopics;

  // Calculate stars (1-3 based on score)
  const stars = quizScore >= 90 ? 3 : quizScore >= 70 ? 2 : 1;

  useEffect(() => {
    if (isPassing) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isPassing]);

  return (
    <div className="animate-fade-in space-y-6 text-center">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              {['🎉', '⭐', '🌺', '✨', '🎊'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* Trophy/Result card */}
      <div className={`rounded-3xl p-8 shadow-xl ${
        isPassing
          ? 'bg-gradient-to-br from-amber-400 to-orange-500'
          : 'bg-gradient-to-br from-slate-400 to-slate-500'
      }`}>
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
          {isPassing ? (
            <Trophy className="w-10 h-10 text-white" />
          ) : (
            <RotateCcw className="w-10 h-10 text-white" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {isPerfect ? 'Perfect Score!' : isPassing ? 'Lesson Complete!' : 'Keep Practicing!'}
        </h2>

        <p className="text-white/80 mb-4">
          {isPassing
            ? `You've completed ${topic.title}`
            : `You need 70% to pass. Let's try again!`}
        </p>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              className={`w-10 h-10 transition-all duration-500 ${
                n <= stars
                  ? 'text-yellow-300 fill-yellow-300 scale-110'
                  : 'text-white/30'
              }`}
              style={{ animationDelay: `${n * 0.2}s` }}
            />
          ))}
        </div>

        {/* Score */}
        <div className="text-5xl font-bold text-white mb-2">
          {quizScore}%
        </div>
        <p className="text-white/70 text-sm">Quiz Score</p>
      </div>

      {/* Progress update */}
      {isPassing && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg border border-cream-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-brown-600 dark:text-gray-400">Beginner Path Progress</span>
            <span className="font-semibold text-coral-600 dark:text-ocean-400">
              {topicIndex}/{totalTopics}
            </span>
          </div>
          
          <div className="h-3 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000"
              style={{ width: `${(topicIndex / totalTopics) * 100}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {Array.from({ length: totalTopics }).map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  i < topicIndex
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                    : i === topicIndex - 1
                    ? 'bg-coral-100 dark:bg-ocean-900/40 text-coral-600 dark:text-ocean-400 ring-2 ring-coral-500 dark:ring-ocean-400'
                    : 'bg-cream-100 dark:bg-slate-700 text-brown-400 dark:text-gray-500'
                }`}
              >
                {i < topicIndex ? '✓' : i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next topic preview */}
      {isPassing && nextTopic && !isLastTopic && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-2xl p-5 border border-teal-200/50 dark:border-teal-700/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow flex items-center justify-center text-2xl">
              {nextTopic.icon}
            </div>
            <div className="text-left">
              <p className="text-sm text-teal-600 dark:text-teal-400 font-medium">Up Next</p>
              <p className="font-semibold text-teal-900 dark:text-teal-100">{nextTopic.title}</p>
            </div>
          </div>
          <p className="text-sm text-teal-700 dark:text-teal-300 text-left">
            {nextTopic.description}
          </p>
        </div>
      )}

      {/* All topics complete celebration */}
      {isPassing && isLastTopic && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-700/30">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-500" />
          <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-2">
            🎉 You've completed all beginner topics!
          </h3>
          <p className="text-purple-700 dark:text-purple-300 text-sm">
            Amazing work! You've built a solid foundation in Chamorro. Keep practicing with games, chat, and quizzes!
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        {isPassing ? (
          <>
            {nextTopic && !isLastTopic ? (
              <button
                onClick={onNextTopic}
                className="w-full py-4 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600
                         text-white font-semibold rounded-2xl shadow-lg
                         hover:from-coral-600 hover:to-coral-700 dark:hover:from-ocean-600 dark:hover:to-ocean-700
                         transition-all flex items-center justify-center gap-2"
              >
                Continue to {nextTopic.title}
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <Link
                to="/games"
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600
                         text-white font-semibold rounded-2xl shadow-lg
                         hover:from-purple-600 hover:to-purple-700
                         transition-all flex items-center justify-center gap-2"
              >
                Play Learning Games
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
            
            <Link
              to="/"
              className="w-full py-3 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300
                       font-medium rounded-xl hover:bg-cream-200 dark:hover:bg-slate-600
                       transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </>
        ) : (
          <>
            <Link
              to={`/learn/${topic.id}`}
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600
                       text-white font-semibold rounded-2xl shadow-lg
                       hover:from-coral-600 hover:to-coral-700 dark:hover:from-ocean-600 dark:hover:to-ocean-700
                       transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Try Again
            </Link>
            
            <Link
              to="/"
              className="w-full py-3 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300
                       font-medium rounded-xl hover:bg-cream-200 dark:hover:bg-slate-600
                       transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

