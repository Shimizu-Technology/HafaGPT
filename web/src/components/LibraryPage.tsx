import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Book, BookMarked, Brain, Gamepad2, Layers, Library, MessagesSquare, Volume2 } from 'lucide-react';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

const tools = [
  { to: '/vocabulary', title: 'Dictionary', description: 'Look up a word, meaning, or example.', icon: Book },
  { to: '/stories', title: 'Stories', description: 'Read a short story and check your understanding.', icon: BookMarked },
  { to: '/flashcards', title: 'Flashcards & review', description: 'Learn words and revisit the ones you need.', icon: Layers },
  { to: '/quiz', title: 'Quizzes', description: 'Check what you remember at your own pace.', icon: Brain },
  { to: '/games', title: 'Games', description: 'Practice with pictures, listening, and word games.', icon: Gamepad2 },
  { to: '/practice', title: 'Conversation practice', description: 'Try a guided, typed conversation with useful phrases.', icon: MessagesSquare },
];

export function LibraryPage() {
  const navigate = useNavigate();
  const { preferences } = useUserPreferences();
  const together = preferences.learner_mode === 'with_child';
  const audioFirst = preferences.reading_support === 'audio_pictures';
  return (
    <LearnerPageShell>
      <LearnerPageHeader title="Library" subtitle="All your learning tools" icon={Library} backLabel="Back to Today" onBack={() => navigate('/')} />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <p className="mb-6 max-w-xl text-brown-600 dark:text-gray-300">Choose a tool for what you need now. Your guided learning session is on Today.</p>
        {(together || audioFirst) && (
          <section aria-labelledby="listening-heading" className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 p-5 dark:border-ocean-800 dark:bg-ocean-950">
            <h2 id="listening-heading" className="flex items-center gap-2 text-lg font-bold"><Volume2 aria-hidden="true" className="h-5 w-5" />{together ? 'Learn together' : 'Listen and look first'}</h2>
            <p className="mt-2 text-sm text-brown-600 dark:text-gray-300">{together ? 'Take turns listening and choosing a picture. An adult can replay audio and help with instructions.' : 'Start with a picture or sound activity. Replay audio whenever you need.'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/games/sound-match" className="inline-flex min-h-11 items-center rounded-xl bg-teal-700 px-4 font-semibold text-white hover:bg-teal-800">Sound Match</Link>
              <Link to="/games/picture-pairs" className="inline-flex min-h-11 items-center rounded-xl border border-teal-300 px-4 font-semibold dark:border-ocean-700">Picture Pairs</Link>
            </div>
          </section>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {tools.map(({ to, title, description, icon: Icon }) => (
            <Link key={to} to={to} className="flex min-h-28 items-center gap-4 rounded-2xl border border-cream-200 bg-white p-5 hover:border-coral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-ocean-600">
              <Icon className="h-6 w-6 flex-none text-teal-700 dark:text-ocean-300" aria-hidden="true" />
              <span className="flex-1"><span className="block font-bold">{title}</span><span className="mt-1 block text-sm text-brown-600 dark:text-gray-300">{description}</span></span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 flex-none text-brown-500 dark:text-gray-400" />
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-teal-700 dark:text-ocean-300">
          <Link to="/flashcards/my-decks" className="inline-flex min-h-11 items-center">Saved decks</Link>
          <Link to="/dashboard/quiz-history" className="inline-flex min-h-11 items-center">Quiz history</Link>
          <Link to="/dashboard/game-history" className="inline-flex min-h-11 items-center">Game history</Link>
          <Link to="/settings" className="inline-flex min-h-11 items-center">Learning settings</Link>
        </div>
      </main>
    </LearnerPageShell>
  );
}
