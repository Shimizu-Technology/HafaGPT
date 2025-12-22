import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Brain, Trophy, Zap, Sparkles, BookOpen } from 'lucide-react';
import { QUIZ_CATEGORIES } from '../data/quizData';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';

export function QuizList() {
  const [quizMode, setQuizMode] = useState<'curated' | 'dictionary'>('curated');
  const { data: vocabCategories } = useVocabularyCategories();

  // Dictionary categories for quiz (filter to ones with enough words)
  const dictionaryCategories = vocabCategories?.categories?.filter(c => c.word_count >= 10) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between safe-area-top">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
            </Link>
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-coral-500 dark:text-ocean-400" />
              <h1 className="text-xl font-semibold text-brown-800 dark:text-white">
                Quiz Mode
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content - extra bottom padding on mobile for bottom nav */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20 sm:pb-6 animate-page-enter">
        {/* Intro */}
        <div className="mb-4">
          <p className="text-brown-700 dark:text-gray-200 mb-2 font-medium">
            Test your Chamorro knowledge! 🎯
          </p>
        </div>

        {/* Quiz Mode Toggle */}
        <div className="mb-6">
          <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-xl border-2 border-coral-200/30 dark:border-ocean-500/30 shadow-sm w-fit">
            <button
              onClick={() => setQuizMode('curated')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                quizMode === 'curated'
                  ? 'bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white shadow-md scale-105'
                  : 'text-brown-600 dark:text-gray-300 hover:bg-coral-50 dark:hover:bg-ocean-900/20'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Curated</span>
              {quizMode === 'curated' && <span className="text-xs opacity-90">(Handpicked)</span>}
            </button>
            
            <button
              onClick={() => setQuizMode('dictionary')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                quizMode === 'dictionary'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-105'
                  : 'text-brown-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Dictionary</span>
              {quizMode === 'dictionary' && <span className="text-xs opacity-90">(10,350 words)</span>}
            </button>
          </div>
          <p className="text-xs text-brown-500 dark:text-gray-400 mt-2">
            {quizMode === 'curated' 
              ? 'Handpicked questions with explanations'
              : 'Random questions from our full dictionary'}
          </p>
        </div>

        {/* Quiz Features */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">📝</div>
            <p className="text-xs font-medium text-brown-700 dark:text-gray-300">Multiple Choice</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">⌨️</div>
            <p className="text-xs font-medium text-brown-700 dark:text-gray-300">Type Answer</p>
          </div>
        </div>

        {/* Category Grid - Curated */}
        {quizMode === 'curated' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {QUIZ_CATEGORIES.map((category) => (
              <Link
                key={category.id}
                to={`/quiz/${category.id}`}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 hover:shadow-xl transition-all duration-200 group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl group-hover:scale-110 transition-transform">
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-brown-800 dark:text-white mb-1 text-lg">
                      {category.title}
                    </h3>
                    <p className="text-sm text-brown-600 dark:text-gray-300 mb-3">
                      {category.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs font-medium text-brown-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        {category.questions.length} questions
                      </span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        category.difficulty === 'Beginner' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : category.difficulty === 'Intermediate'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {category.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Category Grid - Dictionary */}
        {quizMode === 'dictionary' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dictionaryCategories.map((category) => (
              <Link
                key={category.id}
                to={`/quiz/dict-${category.id}?count=10`}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 hover:shadow-xl transition-all duration-200 group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl group-hover:scale-110 transition-transform">
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-brown-800 dark:text-white mb-1 text-lg">
                      {category.title}
                    </h3>
                    <p className="text-sm text-brown-600 dark:text-gray-300 mb-3">
                      {category.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs font-medium text-brown-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {category.word_count} words
                      </span>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                        Random
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Coming Soon */}
        <div className="mt-8 p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <h3 className="font-semibold text-purple-800 dark:text-purple-300">
                Score Tracking Coming Soon!
              </h3>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                Track your progress, earn badges, and compete on leaderboards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

