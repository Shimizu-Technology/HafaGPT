import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Gamepad2,
} from 'lucide-react';
import { GameCard } from './games/GameCard';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { ContentTrustNote } from './ContentTrustNote';
import { GAME_CONTENT_TRUST } from '../data/contentTrust';
import { GAME_GROUP_IDS, gameGroups, games } from '../data/gameCatalog';
import { useRestorableViewParam } from '../hooks/useRestorableViewParam';

/** Present vocabulary games with the trust level inherited from their content. */
export function Games() {
  const [selectedGroup, setSelectedGroup] = useRestorableViewParam(
    'group',
    GAME_GROUP_IDS,
    'all',
  );
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
        <section className="mb-8 overflow-hidden rounded-3xl border border-coral-200 bg-coral-50 p-5 dark:border-brown-700 dark:bg-brown-900 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold tracking-tight text-brown-950 dark:text-cream-100 sm:text-3xl">Listen, choose, and learn</h2>
              <p className="mt-2 text-brown-600 dark:text-brown-100">
                Sound Match works without reading, gives every word an audio cue, and takes only a few minutes.
              </p>
            </div>
            <Link
              to="/games/sound-match"
              className="pressable flex min-h-12 flex-none items-center justify-center gap-2 rounded-xl bg-action px-5 py-3 font-semibold text-white hover:bg-action-hover"
            >
              Play Sound Match <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="game-library-title">
          <div className="mb-5">
            <h2 id="game-library-title" className="mt-1 text-2xl font-bold tracking-tight text-brown-950 dark:text-cream-100">Find a game</h2>
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
                      ? 'bg-action text-white'
                      : 'border-cream-300 bg-white text-brown-700 hover:border-coral-300 hover:bg-cream-50 dark:border-brown-700 dark:bg-brown-900 dark:text-cream-200 dark:hover:bg-brown-700'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-brown-950 dark:text-cream-100">{selectedLabel}</h3>
              <p className="text-sm text-brown-500 dark:text-brown-300">{visibleGames.length} {visibleGames.length === 1 ? 'game' : 'games'}</p>
            </div>
            {selectedGroup === 'all' && (
              <p className="hidden items-center gap-2 text-sm text-brown-500 dark:text-brown-300 sm:flex">
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
