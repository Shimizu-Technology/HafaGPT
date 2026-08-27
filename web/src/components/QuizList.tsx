import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, History, Keyboard, ListChecks, Sparkles, Zap } from 'lucide-react';
import { QUIZ_CATEGORIES } from '../data/quizData';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { useRestorableViewParam } from '../hooks/useRestorableViewParam';

const QUIZ_SOURCES = ['curated', 'dictionary'] as const;
const QUIZ_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

export function QuizList() {
  const [quizMode, setQuizMode] = useRestorableViewParam(
    'source',
    QUIZ_SOURCES,
    'curated',
  );
  const [quizLevel, setQuizLevel] = useRestorableViewParam(
    'level',
    QUIZ_LEVELS,
    'Beginner',
  );
  const { data: vocabCategories } = useVocabularyCategories();
  const dictionaryCategories = vocabCategories?.categories?.filter(c => c.word_count >= 10) || [];
  const dictionaryWordCount = vocabCategories?.total_words?.toLocaleString() || '10,000+';
  const curatedCategories = QUIZ_CATEGORIES.filter((category) => category.difficulty === quizLevel);
  const categoryCount = quizMode === 'curated' ? curatedCategories.length : dictionaryCategories.length;

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title="Quizzes"
        subtitle="Check what you know and learn from every answer"
        icon={Brain}
        trailing={(
          <Link to="/dashboard/quiz-history" aria-label="Open quiz history" className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-coral-700 hover:bg-coral-100 dark:text-ocean-300 dark:hover:bg-ocean-950">
            <History className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">History</span>
          </Link>
        )}
      />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <div className="mb-6 max-w-2xl">
          <p className="mb-1 text-sm font-bold text-coral-700 dark:text-coral-300">Practice</p>
          <h2 className="text-2xl font-bold tracking-tight text-brown-950 dark:text-white sm:text-3xl">Find out what is sticking</h2>
          <p className="mt-2 text-brown-600 dark:text-gray-300">Choose a focused quiz. You will see gentle feedback and an explanation after each answer.</p>
        </div>

        <div className="mb-7">
          <div className="grid max-w-xl grid-cols-2 gap-1 rounded-2xl border border-cream-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" aria-label="Quiz source">
            <button
              type="button"
              onClick={() => setQuizMode('curated')}
              aria-pressed={quizMode === 'curated'}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${
                quizMode === 'curated'
                  ? 'bg-coral-600 text-white'
                  : 'text-brown-600 hover:bg-cream-100 dark:text-gray-300 dark:hover:bg-slate-700'
              }`}
            >
              <Zap className="h-4 w-4" aria-hidden="true" />
              Guided quizzes
            </button>
            <button
              type="button"
              onClick={() => setQuizMode('dictionary')}
              aria-pressed={quizMode === 'dictionary'}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${
                quizMode === 'dictionary'
                  ? 'bg-coral-600 text-white'
                  : 'text-brown-600 hover:bg-cream-100 dark:text-gray-300 dark:hover:bg-slate-700'
              }`}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Dictionary
            </button>
          </div>
          <p className="mt-2 text-sm text-brown-500 dark:text-gray-400">
            {quizMode === 'curated'
              ? 'Handpicked questions with useful explanations.'
              : `Fresh questions drawn from ${dictionaryWordCount} dictionary words.`}
          </p>
        </div>

        {quizMode === 'curated' && (
          <div className="mb-7">
            <p className="mb-2 text-sm font-bold text-brown-800 dark:text-white">Choose your level</p>
            <div className="grid max-w-xl grid-cols-3 gap-2" aria-label="Quiz difficulty">
              {QUIZ_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setQuizLevel(level)}
                  aria-pressed={quizLevel === level}
                  className={`min-h-11 rounded-xl border px-2 text-sm font-semibold transition-colors ${quizLevel === level
                    ? 'border-coral-600 bg-coral-50 text-coral-800 dark:border-ocean-500 dark:bg-ocean-950 dark:text-ocean-200'
                    : 'border-cream-200 bg-white text-brown-600 hover:border-coral-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-7 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-coral-100 text-coral-700 dark:bg-ocean-950 dark:text-ocean-300"><ListChecks className="h-5 w-5" aria-hidden="true" /></span>
            <span className="text-sm font-semibold text-brown-800 dark:text-white">Choose an answer</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-coral-100 text-coral-700 dark:bg-ocean-950 dark:text-ocean-300"><Keyboard className="h-5 w-5" aria-hidden="true" /></span>
            <span className="text-sm font-semibold text-brown-800 dark:text-white">Type what you know</span>
          </div>
        </div>

        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-brown-950 dark:text-white">{quizMode === 'curated' ? `Choose ${quizLevel.toLowerCase()} quizzes` : 'Choose a dictionary topic'}</h3>
            <p className="text-sm text-brown-500 dark:text-gray-400">Ten or fewer questions make it easy to finish a session.</p>
          </div>
          <span className="hidden rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-brown-600 dark:bg-slate-800 dark:text-gray-300 sm:inline">{categoryCount} topics</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {quizMode === 'curated'
            ? curatedCategories.map((category) => (
              <Link key={category.id} to={`/quiz/${category.id}`} className="group flex min-h-32 items-start gap-4 rounded-2xl border border-cream-200 bg-white p-5 transition-colors hover:border-coral-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-ocean-600">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-coral-100 text-2xl dark:bg-ocean-950" aria-hidden="true">{category.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-brown-950 dark:text-white">{category.title}</span>
                  <span className="mt-1 block text-sm text-brown-600 dark:text-gray-300">{category.description}</span>
                  <span className="mt-3 block text-xs font-semibold text-brown-500 dark:text-gray-400">{category.questions.length} questions • {category.difficulty}</span>
                </span>
                <ArrowRight className="mt-1 h-5 w-5 flex-none text-brown-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))
            : dictionaryCategories.map((category) => (
              <Link key={category.id} to={`/quiz/dict-${category.id}?count=10`} className="group flex min-h-32 items-start gap-4 rounded-2xl border border-cream-200 bg-white p-5 transition-colors hover:border-coral-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-ocean-600">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-ocean-100 text-2xl dark:bg-ocean-950" aria-hidden="true">{category.icon || <BookOpen className="h-6 w-6" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-brown-950 dark:text-white">{category.title}</span>
                  <span className="mt-1 block text-sm text-brown-600 dark:text-gray-300">{category.description}</span>
                  <span className="mt-3 block text-xs font-semibold text-brown-500 dark:text-gray-400">10 random questions • {category.word_count} words</span>
                </span>
                <ArrowRight className="mt-1 h-5 w-5 flex-none text-brown-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
        </div>
      </main>
    </LearnerPageShell>
  );
}
