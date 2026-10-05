import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle, RotateCcw } from 'lucide-react';
import { LearningTopic, getNextTopic } from '../data/learningPath';
import { getLessonPractice, readLearningGameContext } from '../lib/lessonPractice';
import { withTodayStep } from '../lib/todaySession';

interface LessonCompleteProps {
  topic: LearningTopic;
  topicIndex: number;
  totalTopics: number;
  completedTopics?: number;
  quizScore: number;
  completionSaved?: boolean;
  isSaving?: boolean;
  onRestart?: () => void;
  onNextTopic: () => void;
}

export function LessonComplete({ topic, totalTopics, completedTopics, quizScore, completionSaved = false, isSaving = false, onRestart, onNextTopic }: LessonCompleteProps) {
  const location = useLocation();
  const isPassing = quizScore >= 70;
  const nextTopic = getNextTopic(topic.id);
  const context = readLearningGameContext(location.search);
  const practice = getLessonPractice(topic, context ? { source: context.source, returnTo: context.returnTo } : undefined);
  const today = context?.source === 'today';
  const practiceHref = practice ? today ? withTodayStep(practice.href, 'use') : practice.href : '/games';
  const levelLabel = `${topic.level[0].toUpperCase()}${topic.level.slice(1)}`;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start gap-3">
          {isPassing ? <CheckCircle className="mt-1 h-6 w-6 text-teal-700 dark:text-teal-300" aria-hidden="true" /> : <RotateCcw className="mt-1 h-6 w-6 text-coral-700 dark:text-coral-300" aria-hidden="true" />}
          <div className="flex-1"><h2 className="text-2xl font-bold text-brown-900 dark:text-white">{isPassing ? completionSaved ? 'Lesson complete' : 'Quiz finished' : 'Keep practicing'}</h2>
            <p className="mt-1 text-sm text-brown-600 dark:text-gray-300">{topic.title} · {quizScore}% quiz score</p>
            <p className="mt-3 text-sm text-brown-700 dark:text-gray-200" role="status">{isSaving ? 'Saving your lesson…' : completionSaved ? isPassing ? 'Course progress saved. Recall improves with practice over time.' : 'Result saved. Score 70% to complete this topic.' : 'Course progress has not saved yet.'}</p>
          </div>
        </div>
        {completedTopics !== undefined && <p className="mt-4 text-sm text-brown-600 dark:text-gray-300">{levelLabel} Path Progress: {completedTopics}/{totalTopics} topics completed</p>}
        {completedTopics === totalTopics && <p className="mt-2 text-sm font-semibold text-teal-700 dark:text-teal-300">You've completed all {topic.level} topics!</p>}
      </section>
      {today && <Link to="/" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-700 px-4 font-semibold text-white hover:bg-coral-800 focus-visible:ring-2 focus-visible:ring-coral-500">Continue Today<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
      {isPassing && practice && <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5 dark:border-teal-800 dark:bg-teal-950/30">
        <h3 className="font-semibold text-brown-900 dark:text-white">Practice what you learned</h3>
        <p className="mt-1 text-sm text-brown-600 dark:text-gray-300">{practice.description}</p>
        <Link to={practiceHref} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-teal-700 px-4 font-semibold text-teal-800 dark:border-teal-500 dark:text-teal-200">Practice {topic.title}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </section>}
      {!isPassing && <button type="button" onClick={onRestart} disabled={isSaving} className="min-h-12 w-full rounded-xl bg-coral-700 px-4 font-semibold text-white disabled:opacity-50">Try again</button>}
      {!today && isPassing && nextTopic && <button type="button" onClick={onNextTopic} disabled={isSaving} className="min-h-12 w-full rounded-xl bg-coral-700 px-4 font-semibold text-white disabled:opacity-50">Continue to {nextTopic.title}</button>}
      {isPassing && onRestart && <button type="button" onClick={onRestart} disabled={isSaving} className="min-h-11 w-full rounded-xl border border-cream-300 font-medium text-brown-800 disabled:opacity-50 dark:border-slate-600 dark:text-gray-200">Review this lesson again</button>}
      <Link to={context?.returnTo ?? '/learning'} className="flex min-h-11 items-center justify-center rounded-xl border border-cream-300 font-medium text-brown-800 dark:border-slate-600 dark:text-gray-200">{today ? 'Back to Today' : 'Back to learning path'}</Link>
    </div>
  );
}
