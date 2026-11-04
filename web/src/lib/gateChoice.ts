import { getTopic } from '../data/learningPath';
import { games } from '../data/gameCatalog';

/** What a visitor picked on a signed-out gate: a topic or a game from the static catalogue. */
export interface GateChoice {
  title: string;
  description: string;
  meta: string;
  /** The list this choice came from, so a visitor can keep browsing. */
  backTo: string;
  backLabel: string;
  /** Visible text for the in-page link back to that list. */
  listLabel: string;
}

/** The topic or game a visitor picked, taken from the route and the static catalogue. */
export function gateChoiceFor(pathname: string): GateChoice | null {
  const topicId = /^\/learn(?:ing)?\/([^/]+)\/?$/.exec(pathname)?.[1];
  if (topicId) {
    let id: string;
    try {
      id = decodeURIComponent(topicId);
    } catch {
      return null;
    }
    const topic = getTopic(id);
    if (!topic) return null;
    return {
      title: topic.title,
      description: topic.description,
      meta: `${topic.estimatedMinutes} min`,
      backTo: '/learning',
      backLabel: 'Back to all topics',
      listLabel: 'See all topics',
    };
  }
  const game = games.find(candidate => candidate.to === pathname.replace(/\/$/, ''));
  if (!game) return null;
  return {
    title: game.title,
    description: game.description,
    meta: game.difficulty,
    backTo: '/games',
    backLabel: 'Back to all games',
    listLabel: 'See all games',
  };
}
