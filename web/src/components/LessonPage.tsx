import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { AlertCircle, BookOpen, Layers, Brain, CheckCircle, RefreshCw } from 'lucide-react';
import { useUpdateProgress, useAllProgress } from '../hooks/useLearningPath';
import { useAwardXP } from '../hooks/useXP';
import { getTopic, getNextTopic, getPath } from '../data/learningPath';
import { LessonIntro } from './LessonIntro';
import { LessonFlashcards } from './LessonFlashcards';
import { LessonQuiz } from './LessonQuiz';
import { useRecordLessonExposure } from '../hooks/useConceptEvidence';
import { LessonComplete } from './LessonComplete';
import { XPToast } from './XPDisplay';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { ContentTrustNote } from './ContentTrustNote';
import { getLessonTrust } from '../data/contentTrust';
import { getLearningGameReturn, readLearningGameContext } from '../lib/lessonPractice';
import { browserStorage } from '../lib/browserStorage';

import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { loadLessonResume, saveLessonResume, emptyLessonResume, type LessonStep } from '../lib/lessonResume';
import { useTodaySessionProgress } from '../hooks/useTodaySession';

const STEPS: LessonStep[] = ['intro', 'flashcards', 'quiz', 'complete'];

const STEP_INFO = {
  intro: { icon: BookOpen, label: 'Intro' },
  flashcards: { icon: Layers, label: 'Cards' },
  quiz: { icon: Brain, label: 'Quiz' },
  complete: { icon: CheckCircle, label: 'Done' },
};

interface PendingLessonExposure {
  topicId: string;
  conceptIds: string[];
}

const LESSON_EXPOSURE_QUEUE_PREFIX = 'hafagpt_lesson_exposure_v1_';

function getLessonExposureQueueKey(ownerId: string, topicId: string) {
  return `${LESSON_EXPOSURE_QUEUE_PREFIX}${ownerId}_${topicId}`;
}

function loadQueuedLessonExposure(
  ownerId: string,
  topicId: string,
): PendingLessonExposure | null {
  const rawValue = browserStorage.get(getLessonExposureQueueKey(ownerId, topicId));
  if (!rawValue) return null;
  try {
    const value: unknown = JSON.parse(rawValue);
    if (
      typeof value === 'object'
      && value !== null
      && 'topicId' in value
      && value.topicId === topicId
      && 'conceptIds' in value
      && Array.isArray(value.conceptIds)
      && value.conceptIds.every((conceptId) => typeof conceptId === 'string')
    ) {
      return { topicId, conceptIds: [...value.conceptIds] };
    }
  } catch {
    // Invalid optional browser state is discarded below.
  }
  browserStorage.remove(getLessonExposureQueueKey(ownerId, topicId));
  return null;
}

/** Orchestrate lesson instruction, practice, quiz, and completion stages. */
export function LessonPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const { user } = useUser();
  return <LessonPageSession key={`${user?.id ?? 'guest'}:${topicId}`} />;
}

function LessonPageSession() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const updateProgress = useUpdateProgress();
  const startProgress = updateProgress.mutate;
  const recordLessonExposure = useRecordLessonExposure();
  const awardXP = useAwardXP();

  const cardCount = DEFAULT_FLASHCARD_DECKS[getTopic(topicId ?? '')?.flashcardCategory ?? '']?.cards.length ?? 0;
  const [resume, setResume] = useState(() => loadLessonResume(user?.id ?? 'guest', topicId ?? '', cardCount));
  const [currentStep, setCurrentStep] = useState<LessonStep>(resume.step);
  const [quizScore, setQuizScore] = useState<number | null>(resume.score);
  const [completionSaved, setCompletionSaved] = useState(resume.saved);
  const [resumeStorageAvailable, setResumeStorageAvailable] = useState(true);
  const [xpPending, setXpPending] = useState(resume.xpPending ?? false);
  const [isSavingCompletion, setIsSavingCompletion] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(resume.step === 'complete' && (!resume.saved || resume.xpPending) ? resume.saved ? 'Your lesson progress is saved, but XP has not synced yet. Retry saving to finish.' : 'Your lesson result has not synced yet. Retry saving to update course progress.' : null);
  const { completeStep } = useTodaySessionProgress();
  const { data: allProgress } = useAllProgress();
  const [xpToast, setXpToast] = useState<{ xp: number; levelUp?: boolean; newLevel?: number } | null>(null);
  const [pendingLessonExposure, setPendingLessonExposure] = useState<PendingLessonExposure | null>(null);
  const [lessonExposureSaveFailed, setLessonExposureSaveFailed] = useState(false);
  const lessonExposureRequestRef = useRef(0);
  const lessonExposureScopeRef = useRef<string | null>(null);

  const topic = topicId ? getTopic(topicId) : undefined;

  const parsedLaunchContext = readLearningGameContext(location.search);
  const launchContext = parsedLaunchContext?.topicId === topicId ? parsedLaunchContext : null;
  const lessonReturn = getLearningGameReturn(launchContext);
  const ownerId = user?.id ?? null;

  useEffect(() => {
    const scope = ownerId && topicId ? `${ownerId}:${topicId}` : null;
    lessonExposureScopeRef.current = scope;
    lessonExposureRequestRef.current += 1;
    setPendingLessonExposure(null);
    setLessonExposureSaveFailed(false);
    if (ownerId && topicId) {
      const queuedExposure = loadQueuedLessonExposure(ownerId, topicId);
      if (queuedExposure) {
        setPendingLessonExposure(queuedExposure);
        setLessonExposureSaveFailed(true);
      }
    }

    return () => {
      if (lessonExposureScopeRef.current === scope) {
        lessonExposureScopeRef.current = null;
        lessonExposureRequestRef.current += 1;
      }
    };
  }, [ownerId, topicId]);

  useEffect(() => {
    if (topicId && ownerId) setResumeStorageAvailable(saveLessonResume(ownerId, topicId, {
      ...resume, step: currentStep, score: quizScore, saved: completionSaved, xpPending,
    }));
  }, [topicId, ownerId, resume, currentStep, quizScore, completionSaved, xpPending]);

  const handleCardProgress = useCallback((index: number, viewed: number[]) => {
    setResume(previous => previous.cardIndex === index && JSON.stringify(previous.viewed) === JSON.stringify(viewed)
      ? previous : { ...previous, cardIndex: index, viewed });
  }, []);

  // Start is a recoverable orientation event, not lesson completion.
  useEffect(() => {
    if (topicId && ownerId) startProgress({ topicId, action: 'start' });
  }, [topicId, ownerId, startProgress]);

  if (!topic) {
    return (
      <LearnerPageShell className="flex items-center justify-center p-4">
        <div className="rounded-2xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-2xl font-bold text-brown-800 dark:text-white mb-4">
            Topic not found
          </h1>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-xl bg-coral-700 px-5 py-2.5 font-semibold text-white hover:bg-coral-800"
          >
            Return to home
          </Link>
        </div>
      </LearnerPageShell>
    );
  }

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;
  const contentTrust = getLessonTrust(topic.flashcardCategory);

  const goToStep = (step: LessonStep) => {
    setCurrentStep(step);
  };

  const saveLessonExposure = async (payload: PendingLessonExposure) => {
    if (!ownerId) return;
    const requestScope = `${ownerId}:${payload.topicId}`;
    const requestId = ++lessonExposureRequestRef.current;
    lessonExposureScopeRef.current = requestScope;
    setPendingLessonExposure(payload);
    setLessonExposureSaveFailed(false);
    browserStorage.set(getLessonExposureQueueKey(ownerId, payload.topicId), JSON.stringify(payload));
    try {
      await recordLessonExposure.mutateAsync(payload);
      if (lessonExposureScopeRef.current !== requestScope || lessonExposureRequestRef.current !== requestId) return;
      await updateProgress.mutateAsync({ topicId: payload.topicId, action: 'flashcard_viewed', flashcardsCount: payload.conceptIds.length });
      if (lessonExposureScopeRef.current !== requestScope || lessonExposureRequestRef.current !== requestId) return;
      await awardXP.mutateAsync({ activity_type: 'flashcard_complete', activity_id: payload.topicId, minutes_spent: 0, deduplicate: true });
      if (lessonExposureScopeRef.current !== requestScope || lessonExposureRequestRef.current !== requestId) return;
      browserStorage.remove(getLessonExposureQueueKey(ownerId, payload.topicId));
      setPendingLessonExposure(null);
    } catch {
      if (lessonExposureScopeRef.current === requestScope && lessonExposureRequestRef.current === requestId) setLessonExposureSaveFailed(true);
    }
  };

  const handleIntroComplete = () => goToStep('flashcards');
  const handleFlashcardsComplete = (_cardsCount: number, conceptIds: string[]) => {
    goToStep('quiz');
    if (topicId) void saveLessonExposure({ topicId, conceptIds: [...conceptIds] });
  };

  const saveCompletion = async (score: number) => {
    if (!topicId || !ownerId || isSavingCompletion || lessonExposureScopeRef.current !== `${ownerId}:${topicId}`) return;
    setIsSavingCompletion(true);
    setXpPending(true);
    setProgressError(null);
    try {
      const requestScope = ownerId ? `${ownerId}:${topicId}` : null;
      await updateProgress.mutateAsync({ topicId, action: 'quiz_completed', quizScore: score });
      if (!requestScope || lessonExposureScopeRef.current !== requestScope) return;
      setCompletionSaved(true);
      if (score >= 70) completeStep('learn');
      const data = await awardXP.mutateAsync({ activity_type: 'quiz_complete', activity_id: topicId, quiz_score: score, minutes_spent: 0, deduplicate: true });
      if (data.xp_earned > 0) setXpToast({ xp: data.xp_earned, levelUp: data.level_up, newLevel: data.new_level || undefined });
      if (lessonExposureScopeRef.current !== requestScope) return;
      if (score >= 70) await awardXP.mutateAsync({ activity_type: 'topic_complete', activity_id: topicId, minutes_spent: 0, deduplicate: true });
      if (lessonExposureScopeRef.current === requestScope) setXpPending(false);
    } catch {
      setProgressError('Some activity has not saved. Retry to sync your lesson progress and XP. Keep this page open until the save succeeds.');
    } finally { setIsSavingCompletion(false); }
  };
  const handleQuizComplete = (score: number) => {
    setQuizScore(score);
    setCompletionSaved(false);
    goToStep('complete');
    void saveCompletion(score);
  };
  const restartLesson = () => {
    setResume(emptyLessonResume()); setCurrentStep('intro'); setQuizScore(null);
    setCompletionSaved(false); setXpPending(false); setProgressError(null);
  };

  const handleNextTopic = () => {
    const nextTopic = topicId ? getNextTopic(topicId) : undefined;
    if (nextTopic) {
      navigate(`/learn/${nextTopic.id}`);
      // Reset state for new topic
      setCurrentStep('intro');

      setQuizScore(null);
    } else {
      // All topics complete
      navigate('/');
    }
  };

  return (
    <LearnerPageShell>
      {!resumeStorageAvailable && <p role="status" className="mx-auto max-w-3xl px-4 py-3 text-sm text-amber-900 dark:text-amber-200">Browser storage is unavailable. Keep this page open until your lesson saves; reload cannot restore this attempt.</p>}
      <LearnerPageHeader
        title={topic.title}
        subtitle={`Step ${currentStepIndex + 1} of ${STEPS.length} · ${STEP_INFO[currentStep].label}`}
        icon={BookOpen}
        backTo={launchContext ? lessonReturn.to : '/learning'}
        backLabel={launchContext ? lessonReturn.label : 'Back to learning path'}
        onBack={launchContext ? () => navigate(lessonReturn.to) : undefined}
        maxWidthClassName="max-w-3xl"
        below={(
          <div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-cream-200 dark:bg-slate-700"
              role="progressbar"
              aria-label="Lesson progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="h-full rounded-full bg-coral-500 transition-all duration-500 dark:bg-ocean-400" style={{ width: `${progress}%` }} />
            </div>
            <ol className="mt-2 grid grid-cols-4 gap-2">
              {STEPS.map((step, index) => {
                const StepIcon = STEP_INFO[step].icon;
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <li
                    key={step}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`flex min-w-0 items-center justify-center gap-1.5 text-xs font-semibold ${
                      isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isCurrent
                          ? 'text-coral-700 dark:text-ocean-300'
                          : 'text-brown-400 dark:text-gray-500'
                    }`}
                  >
                    <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg ${
                      isCompleted
                        ? 'bg-emerald-100 dark:bg-emerald-950'
                        : isCurrent
                          ? 'bg-coral-100 dark:bg-ocean-950'
                          : 'bg-cream-100 dark:bg-slate-800'
                    }`}>
                      {isCompleted ? <CheckCircle className="h-4 w-4" aria-hidden="true" /> : <StepIcon className="h-4 w-4" aria-hidden="true" />}
                    </span>
                    <span className="hidden truncate sm:inline">{STEP_INFO[step].label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      />

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <ContentTrustNote trust={contentTrust} className="mb-6" />
        {lessonExposureSaveFailed && pendingLessonExposure && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
              <div>
                <p className="font-semibold">Card activity has not saved yet</p>
                <p className="mt-0.5 text-sm">You can keep taking the quiz and retry this save here.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => saveLessonExposure(pendingLessonExposure)}
              disabled={recordLessonExposure.isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {recordLessonExposure.isPending
                ? 'Saving card activity…'
                : 'Retry saving card activity'}
            </button>
          </div>
        )}
        {currentStep === 'intro' && (
          <LessonIntro topic={topic} onComplete={handleIntroComplete} />
        )}
        
        {currentStep === 'flashcards' && (
          <LessonFlashcards
            topic={topic}
            initialIndex={resume.cardIndex}
            initialViewed={resume.viewed}
            onProgress={handleCardProgress}
            onComplete={handleFlashcardsComplete}
            onSkip={() => goToStep('quiz')}
          />
        )}
        
        {currentStep === 'quiz' && (
          <LessonQuiz topic={topic} onComplete={handleQuizComplete} />
        )}
        
        {progressError && <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <p>{progressError}</p><button type="button" disabled={isSavingCompletion} onClick={() => quizScore !== null && void saveCompletion(quizScore)} className="mt-2 min-h-11 rounded-lg bg-amber-800 px-4 font-semibold text-white disabled:opacity-50">Retry saving lesson</button>
        </div>}
        {currentStep === 'complete' && (
          <LessonComplete
            topic={topic}
            topicIndex={0}
            completedTopics={allProgress ? getPath(topic.level).filter(candidate => allProgress.topics.some(item => item.topic.id === candidate.id && item.progress.completed_at) || (candidate.id === topic.id && completionSaved && (quizScore ?? 0) >= 70)).length : undefined}
            completionSaved={completionSaved}
            isSaving={isSavingCompletion}
            onRestart={restartLesson}
            totalTopics={getPath(topic.level).length}
            quizScore={quizScore || 0}
            onNextTopic={handleNextTopic}
          />
        )}
      </main>

      {/* XP Toast Notification */}
      {xpToast && (
        <XPToast 
          xpEarned={xpToast.xp} 
          levelUp={xpToast.levelUp} 
          newLevel={xpToast.newLevel}
          onClose={() => setXpToast(null)} 
        />
      )}
    </LearnerPageShell>
  );
}
