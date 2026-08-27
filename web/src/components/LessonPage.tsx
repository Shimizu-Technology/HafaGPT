import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, Layers, Brain, CheckCircle } from 'lucide-react';
import { useUpdateProgress } from '../hooks/useLearningPath';
import { useAwardXP } from '../hooks/useXP';
import { getTopic, getTopicIndex, getNextTopic, getPath } from '../data/learningPath';
import { LessonIntro } from './LessonIntro';
import { LessonFlashcards } from './LessonFlashcards';
import { LessonQuiz } from './LessonQuiz';
import { LessonComplete } from './LessonComplete';
import { XPToast } from './XPDisplay';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { ContentTrustNote } from './ContentTrustNote';
import { getLessonTrust } from '../data/contentTrust';

type LessonStep = 'intro' | 'flashcards' | 'quiz' | 'complete';

const STEPS: LessonStep[] = ['intro', 'flashcards', 'quiz', 'complete'];

const STEP_INFO = {
  intro: { icon: BookOpen, label: 'Intro' },
  flashcards: { icon: Layers, label: 'Cards' },
  quiz: { icon: Brain, label: 'Quiz' },
  complete: { icon: CheckCircle, label: 'Done' },
};

/** Orchestrate lesson instruction, practice, quiz, and completion stages. */
export function LessonPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const updateProgress = useUpdateProgress();
  const awardXP = useAwardXP();

  const [currentStep, setCurrentStep] = useState<LessonStep>('intro');
  const [, setFlashcardsCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [xpToast, setXpToast] = useState<{ xp: number; levelUp?: boolean; newLevel?: number } | null>(null);

  const topic = topicId ? getTopic(topicId) : undefined;
  const topicIndex = topicId ? getTopicIndex(topicId) : 0;

  // Mark topic as started when entering
  useEffect(() => {
    if (topicId) {
      updateProgress.mutate({ topicId, action: 'start' });
    }
  }, [topicId]);

  if (!topic) {
    return (
      <LearnerPageShell className="flex items-center justify-center p-4">
        <div className="rounded-2xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-2xl font-bold text-brown-800 dark:text-white mb-4">
            Topic not found
          </h1>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-xl bg-coral-500 px-5 py-2.5 font-semibold text-white hover:bg-coral-600"
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

  const handleIntroComplete = () => {
    goToStep('flashcards');
  };

  const handleFlashcardsComplete = (cardsCount: number) => {
    setFlashcardsCompleted(true);
    // Always proceed to quiz, even if API calls fail
    goToStep('quiz');
    
    // Track flashcard completion with actual card count (non-blocking)
    if (topicId) {
      setTimeout(() => {
        updateProgress.mutate(
          { topicId, action: 'flashcard_viewed', flashcardsCount: cardsCount },
          {
            onError: (error) => {
              console.warn('Failed to update flashcard progress:', error);
            }
          }
        );
        
        // Award XP for flashcard completion
        awardXP.mutate(
          { 
            activity_type: 'flashcard_complete', 
            activity_id: topicId,
            minutes_spent: 2 // Estimate 2 min for flashcards
          },
          {
            onSuccess: (data) => {
              setXpToast({ 
                xp: data.xp_earned, 
                levelUp: data.level_up, 
                newLevel: data.new_level || undefined 
              });
              setTimeout(() => setXpToast(null), 3000);
            },
            onError: (error) => {
              console.warn('Failed to award flashcard XP:', error);
            }
          }
        );
      }, 100);
    }
  };

  const handleQuizComplete = (score: number) => {
    setQuizScore(score);
    
    // Always proceed to complete step, even if API calls fail
    // This ensures the UI doesn't get stuck on loading
    goToStep('complete');
    
    // Track quiz completion (non-blocking)
    if (topicId) {
      // Use setTimeout to ensure UI updates first
      setTimeout(() => {
        updateProgress.mutate(
          { topicId, action: 'quiz_completed', quizScore: score },
          {
            onError: (error) => {
              console.warn('Failed to update progress:', error);
              // Don't block UI - user can still see results
            }
          }
        );
        
        // Award XP for quiz completion (with bonus for 90%+)
        awardXP.mutate(
          { 
            activity_type: 'quiz_complete', 
            activity_id: topicId,
            quiz_score: score,
            minutes_spent: 3 // Estimate 3 min for quiz
          },
          {
            onSuccess: (data) => {
              // Also award topic completion XP since quiz is the final step
              awardXP.mutate(
                { 
                  activity_type: 'topic_complete', 
                  activity_id: topicId,
                  minutes_spent: 0 // Already counted
                },
                {
                  onSuccess: (topicData) => {
                    // Show combined XP
                    setXpToast({ 
                      xp: data.xp_earned + topicData.xp_earned, 
                      levelUp: data.level_up || topicData.level_up, 
                      newLevel: topicData.new_level || data.new_level || undefined 
                    });
                    setTimeout(() => setXpToast(null), 4000);
                  },
                  onError: (error) => {
                    console.warn('Failed to award topic completion XP:', error);
                    // Still show quiz XP if available
                    if (data) {
                      setXpToast({ 
                        xp: data.xp_earned, 
                        levelUp: data.level_up, 
                        newLevel: data.new_level || undefined 
                      });
                      setTimeout(() => setXpToast(null), 4000);
                    }
                  }
                }
              );
            },
            onError: (error) => {
              console.warn('Failed to award quiz XP:', error);
              // UI already progressed, user can see results
            }
          }
        );
      }, 100);
    }
  };

  const handleNextTopic = () => {
    const nextTopic = topicId ? getNextTopic(topicId) : undefined;
    if (nextTopic) {
      navigate(`/learn/${nextTopic.id}`);
      // Reset state for new topic
      setCurrentStep('intro');
      setFlashcardsCompleted(false);
      setQuizScore(null);
    } else {
      // All topics complete
      navigate('/');
    }
  };

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title={topic.title}
        subtitle={`Step ${currentStepIndex + 1} of ${STEPS.length} · ${STEP_INFO[currentStep].label}`}
        icon={BookOpen}
        backTo="/learning"
        backLabel="Back to learning path"
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
        {currentStep === 'intro' && (
          <LessonIntro topic={topic} onComplete={handleIntroComplete} />
        )}
        
        {currentStep === 'flashcards' && (
          <LessonFlashcards
            topic={topic}
            onComplete={handleFlashcardsComplete}
            onSkip={() => goToStep('quiz')}
          />
        )}
        
        {currentStep === 'quiz' && (
          <LessonQuiz topic={topic} onComplete={handleQuizComplete} />
        )}
        
        {currentStep === 'complete' && (
          <LessonComplete
            topic={topic}
            topicIndex={topicIndex}
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
