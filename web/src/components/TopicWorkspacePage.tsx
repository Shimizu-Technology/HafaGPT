import {
  BookOpen,
  Brain,
  CheckCircle2,
  Clock3,
  Gamepad2,
  Layers3,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getScenarioById } from '../data/conversationScenarios';
import { getTopic } from '../data/learningPath';
import { getStoryById } from '../data/storyData';
import { TOPIC_SCENARIO_IDS, TOPIC_STORY_IDS } from '../data/topicRelationships';
import { useTopicWorkspace } from '../hooks/useLearningPath';
import { useTopicConversations } from '../hooks/useConversationsQuery';
import { useTopicActivityResults } from '../hooks/useActivityResults';
import { withLearningContext } from '../lib/lessonPractice';
import { appRoutes } from '../lib/routes';
import { withTopicReturn } from '../lib/topicReturn';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

const GAME_DETAILS: Record<string, { title: string; description: string; path: string }> = {
  memory: {
    title: 'Memory Match',
    description: 'Pair Chamorro words with their meanings.',
    path: '/games/memory',
  },
  scramble: {
    title: 'Word Scramble',
    description: 'Put mixed-up letters back into Chamorro words.',
    path: '/games/scramble',
  },
  falling: {
    title: 'Falling Words',
    description: 'Choose the translation before the word reaches the bottom.',
    path: '/games/falling',
  },
  'sound-match': {
    title: 'Sound Match',
    description: 'Listen and choose the matching picture.',
    path: '/games/sound-match',
  },
  hangman: {
    title: 'Word Guess',
    description: 'Use the meaning as a clue and reveal the Chamorro word.',
    path: '/games/hangman',
  },
  wordle: {
    title: 'Chamorro Wordle',
    description: 'Find the Chamorro word in six tries.',
    path: '/games/wordle',
  },
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

/** Join a topic's lesson, practice, progress, and explicit related resources. */
export function TopicWorkspacePage() {
  const { topicId } = useParams<{ topicId: string }>();
  const localTopic = getTopic(topicId || '');
  const { data, isLoading, isError, refetch } = useTopicWorkspace(localTopic?.id);
  const { data: recentConversations = [] } = useTopicConversations(localTopic?.id, 3);
  const {
    data: recentResults = [],
    isError: areRecentResultsUnavailable,
    refetch: refetchRecentResults,
  } = useTopicActivityResults(localTopic?.id, 3);

  if (!localTopic) {
    return (
      <LearnerPageShell className="flex items-center justify-center p-4">
        <div className="rounded-2xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-xl font-bold text-brown-950 dark:text-white">Topic not found</h1>
          <Link className="mt-4 inline-flex min-h-11 items-center text-coral-700 dark:text-ocean-300" to={appRoutes.learning}>Back to learning path</Link>
        </div>
      </LearnerPageShell>
    );
  }

  if (isLoading) {
    return (
      <LearnerPageShell className="flex items-center justify-center">
        <div className="text-center text-brown-600 dark:text-gray-300">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-coral-600 dark:text-ocean-300" aria-hidden="true" />
          Loading topic workspace…
        </div>
      </LearnerPageShell>
    );
  }

  const workspaceMatchesTopic = data
    && data.topic.id === localTopic.id
    && data.lesson_id === localTopic.id
    && data.flashcard_category === localTopic.flashcardCategory
    && data.quiz_category === localTopic.quizCategory
    && JSON.stringify(data.suggested_game_ids) === JSON.stringify(localTopic.suggestedGames ?? [])
    && JSON.stringify(data.scenario_ids) === JSON.stringify(TOPIC_SCENARIO_IDS[localTopic.id] ?? [])
    && JSON.stringify(data.story_ids) === JSON.stringify(TOPIC_STORY_IDS[localTopic.id] ?? []);

  if (isError || !data || !workspaceMatchesTopic) {
    return (
      <LearnerPageShell className="flex items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-xl font-bold text-brown-950 dark:text-white">Topic workspace unavailable</h1>
          <p className="mt-2 text-sm text-brown-600 dark:text-gray-300">Your lesson and learning path are still available.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => void refetch()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coral-600 px-4 font-semibold text-white hover:bg-coral-700 dark:bg-ocean-600 dark:hover:bg-ocean-700"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>
            <Link to={withLearningContext(appRoutes.lesson(localTopic.id), localTopic, { source: 'topic' })} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cream-100 px-4 font-semibold text-brown-800 hover:bg-cream-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">Open lesson</Link>
          </div>
        </div>
      </LearnerPageShell>
    );
  }

  const topicHome = appRoutes.topic(localTopic.id);
  const lessonHref = withLearningContext(appRoutes.lesson(data.lesson_id), localTopic, {
    source: 'topic',
    returnTo: topicHome,
  });
  const scenarios = data.scenario_ids.map(getScenarioById).filter(Boolean);
  const stories = data.story_ids.map(getStoryById).filter(Boolean);
  const games = data.suggested_game_ids
    .map((id) => ({ id, ...GAME_DETAILS[id] }))
    .filter((game) => game.path);
  const lastActivity = formatDate(data.progress.last_activity_at);
  const lessonAction = data.progress.completed_at
    ? 'Review lesson'
    : data.progress.started_at
      ? 'Continue lesson'
      : 'Start lesson';

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title={data.topic.title}
        subtitle={`${data.topic.level.charAt(0).toUpperCase()}${data.topic.level.slice(1)} topic`}
        icon={Sparkles}
        backTo={appRoutes.learning}
        backLabel="Back to learning path"
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-coral-500 to-coral-700 p-6 text-white shadow-lg dark:from-ocean-700 dark:to-ocean-950 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-white/15 text-3xl" aria-hidden="true">{localTopic.icon}</span>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold sm:text-3xl">{data.topic.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">{data.topic.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-white/90">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />About {data.topic.estimated_minutes} minutes</span>
                {data.progress.completed_at && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Completed</span>}
              </div>
            </div>
          </div>
          <Link to={lessonHref} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 font-bold text-coral-700 shadow-sm hover:bg-cream-50 dark:text-ocean-800 sm:w-auto"><BookOpen className="h-5 w-5" aria-hidden="true" />{lessonAction}</Link>
        </section>

        <section aria-labelledby="progress-heading">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Your evidence</p>
              <h2 id="progress-heading" className="text-xl font-bold text-brown-950 dark:text-white">Topic progress</h2>
            </div>
            {lastActivity && <p className="text-xs text-brown-500 dark:text-gray-400">Last activity {lastActivity}</p>}
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><dt className="text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-gray-400">Lesson</dt><dd className="mt-1 font-bold text-brown-950 dark:text-white">{data.progress.completed_at ? 'Completed' : data.progress.started_at ? 'In progress' : 'Not started'}</dd></div>
            <div className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><dt className="text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-gray-400">Cards viewed</dt><dd className="mt-1 text-2xl font-bold text-brown-950 dark:text-white">{data.progress.flashcards_viewed}</dd></div>
            <div className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><dt className="text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-gray-400">Best lesson quiz</dt><dd className="mt-1 text-2xl font-bold text-brown-950 dark:text-white">{data.progress.best_quiz_score === null ? '—' : `${data.progress.best_quiz_score}%`}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="practice-heading">
          <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Keep working with this topic</p>
          <h2 id="practice-heading" className="text-xl font-bold text-brown-950 dark:text-white">Practice in another way</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <WorkspaceLink icon={Layers3} title="Flashcards" description="Study the guided topic deck." to={withTopicReturn(appRoutes.flashcards(data.flashcard_category), localTopic.id)} />
            <WorkspaceLink icon={Brain} title="Topic quiz" description="Check recall with the matching quiz." to={withTopicReturn(appRoutes.quiz(data.quiz_category), localTopic.id)} />
            <WorkspaceLink icon={MessageCircle} title="Ask the tutor" description="Start a saved chat connected to this topic." to={appRoutes.chat({ topicId: localTopic.id, returnTo: topicHome })} />
            {games.map((game) => (
              <WorkspaceLink key={game.id} icon={Gamepad2} title={game.title} description={game.description} to={withLearningContext(game.path, localTopic, { source: 'topic', returnTo: topicHome })} />
            ))}
          </div>
        </section>

        {recentConversations.length > 0 && (
          <section aria-labelledby="topic-conversations-heading">
            <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Continue where you left off</p>
            <h2 id="topic-conversations-heading" className="text-xl font-bold text-brown-950 dark:text-white">Recent topic chats</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentConversations.map((conversation) => (
                <WorkspaceLink
                  key={conversation.id}
                  icon={MessageCircle}
                  title={conversation.title}
                  description={`Updated ${formatDate(conversation.updated_at) || 'recently'}`}
                  to={appRoutes.conversation(conversation.id, {
                    topicId: localTopic.id,
                    returnTo: topicHome,
                  })}
                />
              ))}
            </div>
          </section>
        )}

        {areRecentResultsUnavailable ? (
          <section className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800" aria-labelledby="topic-results-unavailable-heading">
            <h2 id="topic-results-unavailable-heading" className="font-bold text-brown-950 dark:text-white">Recent topic results are unavailable</h2>
            <p className="mt-1 text-sm text-brown-600 dark:text-gray-300">The rest of this topic is still ready to use.</p>
            <button type="button" onClick={() => void refetchRecentResults()} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cream-300 px-4 text-sm font-semibold text-brown-800 hover:bg-cream-50 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"><RefreshCw className="h-4 w-4" aria-hidden="true" />Retry recent results</button>
          </section>
        ) : recentResults.length > 0 && (
          <section aria-labelledby="topic-results-heading">
            <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Review recent evidence</p>
            <h2 id="topic-results-heading" className="text-xl font-bold text-brown-950 dark:text-white">Recent topic results</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentResults.map((result) => (
                <WorkspaceLink
                  key={`${result.result_type}-${result.id}`}
                  icon={Trophy}
                  title={result.title}
                  description={result.result_type === 'quiz'
                    ? `${result.percentage === null
                      ? `${result.score}${result.total === null ? ' points' : ` of ${result.total}`}`
                      : `${Math.round(result.percentage)}%`} · ${formatDate(result.created_at) || 'recently'}`
                    : `${result.score} points · ${formatDate(result.created_at) || 'recently'}`}
                  to={result.result_type === 'quiz'
                    ? appRoutes.quizReview(result.id, { returnTo: topicHome })
                    : appRoutes.gameResult(result.id, { returnTo: topicHome })}
                />
              ))}
            </div>
          </section>
        )}

        {(scenarios.length > 0 || stories.length > 0) && (
          <section aria-labelledby="related-heading">
            <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Explicitly aligned resources</p>
            <h2 id="related-heading" className="text-xl font-bold text-brown-950 dark:text-white">Use the topic in context</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {scenarios.map((scenario) => scenario && (
                <WorkspaceLink key={scenario.id} icon={MessageCircle} title={scenario.title} description={scenario.description} to={withTopicReturn(appRoutes.scenario(scenario.id), localTopic.id)} />
              ))}
              {stories.map((story) => story && (
                <WorkspaceLink key={story.id} icon={BookOpen} title={story.titleEnglish} description={story.description} to={withTopicReturn(appRoutes.story(story.id), localTopic.id)} />
              ))}
            </div>
          </section>
        )}
      </main>
    </LearnerPageShell>
  );
}

interface WorkspaceLinkProps {
  icon: typeof BookOpen;
  title: string;
  description: string;
  to: string;
}

function WorkspaceLink({ icon: Icon, title, description, to }: WorkspaceLinkProps) {
  return (
    <Link to={to} className="group flex min-h-28 items-start gap-3 rounded-2xl border border-cream-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-coral-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-ocean-600">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-coral-100 text-coral-700 dark:bg-ocean-950 dark:text-ocean-300"><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <span><span className="block font-bold text-brown-950 group-hover:text-coral-700 dark:text-white dark:group-hover:text-ocean-300">{title}</span><span className="mt-1 block text-sm text-brown-600 dark:text-gray-300">{description}</span></span>
    </Link>
  );
}
