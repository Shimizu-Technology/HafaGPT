import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ADVANCED_PATH, BEGINNER_PATH, INTERMEDIATE_PATH } from '../data/learningPath';
import { gameGroups, games } from '../data/gameCatalog';
import { appRoutes } from '../lib/routes';

/**
 * What a signed-out visitor may see behind a sign-in gate. Everything here is
 * static catalogue data bundled with the app: no request is made, and nothing
 * about an account, progress, or history is shown.
 */

const rowLink = 'flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-inset dark:hover:bg-brown-700';
const list = 'divide-y divide-cream-200 overflow-hidden rounded-2xl border border-cream-200 bg-white dark:divide-brown-700 dark:border-brown-700 dark:bg-brown-900';

const levels = [
  { id: 'beginner', title: 'Beginner', topics: BEGINNER_PATH },
  { id: 'intermediate', title: 'Intermediate', topics: INTERMEDIATE_PATH },
  { id: 'advanced', title: 'Advanced', topics: ADVANCED_PATH },
] as const;

function countLabel(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Every topic title and summary, in path order, as links to that topic's own gate. */
export function LearningPathPreview() {
  let position = 0;
  return (
    <div className="space-y-8">
      {levels.map(level => (
        <section key={level.id} aria-labelledby={`preview-${level.id}`}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id={`preview-${level.id}`} className="text-lg font-bold text-brown-950 dark:text-cream-100">{level.title}</h2>
            <p className="text-sm text-brown-600 dark:text-brown-100">{countLabel(level.topics.length, 'topic')}</p>
          </div>
          <ol className={list}>
            {level.topics.map(topic => {
              position += 1;
              return (
                <li key={topic.id}>
                  <Link to={appRoutes.topic(topic.id)} className={rowLink}>
                    <span className="w-6 flex-none text-center text-sm font-semibold tabular-nums text-brown-600 dark:text-brown-100" aria-hidden="true">{position}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug text-brown-950 dark:text-cream-100">{topic.title}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-brown-600 dark:text-brown-100">{topic.description}</span>
                    </span>
                    <span className="hidden flex-none text-sm text-brown-600 dark:text-brown-100 sm:block">{topic.estimatedMinutes} min</span>
                    <ChevronRight className="h-5 w-5 flex-none text-brown-600 dark:text-brown-100" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** The whole game list, grouped as the signed-in page groups it. */
export function GamesPreview() {
  return (
    <div className="space-y-8">
      {gameGroups.filter(group => group.id !== 'all').map(group => {
        const groupGames = games.filter(game => game.group === group.id);
        return (
          <section key={group.id} aria-labelledby={`preview-${group.id}`}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id={`preview-${group.id}`} className="text-lg font-bold text-brown-950 dark:text-cream-100">{group.label}</h2>
              <p className="text-sm text-brown-600 dark:text-brown-100">{countLabel(groupGames.length, 'game')}</p>
            </div>
            <ul className={list}>
              {groupGames.map(game => (
                <li key={game.to}>
                  <Link to={game.to} className={rowLink}>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug text-brown-950 dark:text-cream-100">{game.title}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-brown-600 dark:text-brown-100">{game.description}</span>
                    </span>
                    <span className="hidden flex-none text-sm text-brown-600 dark:text-brown-100 sm:block">{game.difficulty}</span>
                    <ChevronRight className="h-5 w-5 flex-none text-brown-600 dark:text-brown-100" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
