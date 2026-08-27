import { useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Gamepad2,
  Grid3X3,
  Hand,
  Headphones,
  Image,
  Landmark,
  ListOrdered,
  Palette,
  Puzzle,
  Shuffle,
  Sparkles,
  Swords,
  Target,
  Zap,
} from 'lucide-react';
import { GameCard } from './games/GameCard';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { ContentTrustNote } from './ContentTrustNote';
import { GAME_CONTENT_TRUST } from '../data/contentTrust';

type GameGroup = 'listen' | 'words' | 'quick' | 'challenge';

interface GameDefinition {
  to: string;
  title: string;
  description: string;
  difficulty: string;
  group: GameGroup;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

const gameGroups: Array<{ id: 'all' | GameGroup; label: string }> = [
  { id: 'all', label: 'All games' },
  { id: 'listen', label: 'Listen & tap' },
  { id: 'words', label: 'Build words' },
  { id: 'quick', label: 'Quick play' },
  { id: 'challenge', label: 'Challenges' },
];

const games: GameDefinition[] = [
  { to: '/games/sound-match', title: 'Sound Match', description: 'Hear a Chamorro word and tap the matching picture.', difficulty: 'No reading', group: 'listen', icon: Headphones },
  { to: '/games/picture-pairs', title: 'Picture Pairs', description: 'Match pictures while hearing and learning each word.', difficulty: 'No reading', group: 'listen', icon: Image },
  { to: '/games/color-touch', title: 'Color Touch', description: 'Listen for a color, then tap the matching square.', difficulty: 'No reading', group: 'listen', icon: Palette },
  { to: '/games/number-tap', title: 'Number Tap', description: 'Count the items and choose the number you hear.', difficulty: 'No reading', group: 'listen', icon: ListOrdered },
  { to: '/games/simon-says', title: 'Simon Says', description: 'Learn body words by listening and following along.', difficulty: 'No reading', group: 'listen', icon: Hand },
  { to: '/games/memory', title: 'Memory Match', description: 'Pair Chamorro words with their English meanings.', difficulty: 'All ages', group: 'words', icon: Puzzle },
  { to: '/games/scramble', title: 'Word Scramble', description: 'Put mixed-up letters back into Chamorro words.', difficulty: 'Some reading', group: 'words', icon: Shuffle },
  { to: '/games/hangman', title: 'Word Guess', description: 'Use the meaning as a clue and reveal the Chamorro word.', difficulty: 'Some reading', group: 'words', icon: Target },
  { to: '/games/falling', title: 'Falling Words', description: 'Choose the right translation before the word reaches the bottom.', difficulty: 'Fast paced', group: 'quick', icon: Zap },
  { to: '/games/catch', title: 'Word Catch', description: 'Catch matching word pairs and build a combo.', difficulty: 'Fast paced', group: 'quick', icon: Swords },
  { to: '/games/wordle', title: 'Chamorro Wordle', description: 'Find the Chamorro word in six tries.', difficulty: 'Challenge', group: 'challenge', icon: Grid3X3 },
  { to: '/games/trivia', title: 'Cultural Trivia', description: 'Explore Guam history, traditions, language, and culture.', difficulty: 'All levels', group: 'challenge', icon: Landmark },
];

/** Present vocabulary games with the trust level inherited from their content. */
export function Games() {
  const [selectedGroup, setSelectedGroup] = useState<'all' | GameGroup>('all');
  const visibleGames = selectedGroup === 'all' ? games : games.filter((game) => game.group === selectedGroup);
  const selectedLabel = gameGroups.find((group) => group.id === selectedGroup)?.label || 'All games';

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title="Games"
        subtitle="Short activities for every kind of learner"
        icon={Gamepad2}
        backTo="/"
        backLabel="Back home"
        maxWidthClassName="max-w-5xl"
      />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <ContentTrustNote trust={GAME_CONTENT_TRUST} className="mb-6" />
        <section className="mb-8 overflow-hidden rounded-3xl border border-coral-200 bg-coral-50 p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-coral-700 dark:text-teal-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> A gentle place to start
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-brown-950 dark:text-white sm:text-3xl">Listen, choose, and learn</h2>
              <p className="mt-2 text-brown-600 dark:text-gray-300">
                Sound Match works without reading, gives every word an audio cue, and takes only a few minutes.
              </p>
            </div>
            <Link
              to="/games/sound-match"
              className="flex min-h-12 flex-none items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 py-3 font-semibold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              Play Sound Match <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="game-library-title">
          <div className="mb-5">
            <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">Choose what feels right</p>
            <h2 id="game-library-title" className="mt-1 text-2xl font-bold tracking-tight text-brown-950 dark:text-white">Find a game</h2>
          </div>

          <div className="-mx-4 mb-6 overflow-x-auto px-4 pb-1" aria-label="Filter games by learning style">
            <div className="flex min-w-max gap-2">
              {gameGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroup(group.id)}
                  aria-pressed={selectedGroup === group.id}
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
                    selectedGroup === group.id
                      ? 'border-coral-600 bg-coral-600 text-white dark:border-teal-500 dark:bg-teal-600'
                      : 'border-cream-300 bg-white text-brown-700 hover:border-coral-300 hover:bg-coral-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:border-teal-600 dark:hover:bg-slate-700'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-brown-950 dark:text-white">{selectedLabel}</h3>
              <p className="text-sm text-brown-500 dark:text-gray-400">{visibleGames.length} {visibleGames.length === 1 ? 'game' : 'games'}</p>
            </div>
            {selectedGroup === 'all' && (
              <p className="hidden items-center gap-2 text-sm text-brown-500 dark:text-gray-400 sm:flex">
                <BookOpen className="h-4 w-4" aria-hidden="true" /> Pick by skill, not age
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleGames.map((game) => {
              const Icon = game.icon;
              return (
                <GameCard
                  key={game.to}
                  to={game.to}
                  title={game.title}
                  description={game.description}
                  icon={<Icon className="h-7 w-7" aria-hidden="true" />}
                  difficulty={game.difficulty}
                />
              );
            })}
          </div>
        </section>
      </main>
    </LearnerPageShell>
  );
}
