import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Layers, Brain, CheckCircle, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useUpdateProgress } from '../hooks/useLearningPath';
import { getTopic, getTopicIndex, BEGINNER_PATH } from '../data/learningPath';
import { LessonIntro } from './LessonIntro';
import { LessonFlashcards } from './LessonFlashcards';
import { LessonQuiz } from './LessonQuiz';
import { LessonComplete } from './LessonComplete';

type LessonStep = 'intro' | 'flashcards' | 'quiz' | 'complete';

const STEPS: LessonStep[] = ['intro', 'flashcards', 'quiz', 'complete'];

const STEP_INFO = {
  intro: { icon: BookOpen, label: 'Intro' },
  flashcards: { icon: Layers, label: 'Cards' },
  quiz: { icon: Brain, label: 'Quiz' },
  complete: { icon: CheckCircle, label: 'Done' },
};

export function LessonPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const updateProgress = useUpdateProgress();

  const [currentStep, setCurrentStep] = useState<LessonStep>('intro');
  const [flashcardsCompleted, setFlashcardsCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

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
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brown-800 dark:text-white mb-4">
            Topic not found
          </h1>
          <Link
            to="/"
            className="text-coral-600 dark:text-ocean-400 hover:underline"
          >
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const goToStep = (step: LessonStep) => {
    setCurrentStep(step);
  };

  const handleIntroComplete = () => {
    goToStep('flashcards');
  };

  const handleFlashcardsComplete = (cardsCount: number) => {
    setFlashcardsCompleted(true);
    // Track flashcard completion with actual card count
    if (topicId) {
      updateProgress.mutate({ topicId, action: 'flashcard_viewed', flashcardsCount: cardsCount });
    }
    goToStep('quiz');
  };

  const handleQuizComplete = (score: number) => {
    setQuizScore(score);
    // Track quiz completion
    if (topicId) {
      updateProgress.mutate({ topicId, action: 'quiz_completed', quizScore: score });
    }
    goToStep('complete');
  };

  const handleNextTopic = () => {
    const currentIndex = BEGINNER_PATH.findIndex(t => t.id === topicId);
    if (currentIndex >= 0 && currentIndex < BEGINNER_PATH.length - 1) {
      const nextTopic = BEGINNER_PATH[currentIndex + 1];
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
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-cream-200/50 dark:border-slate-700/50 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {/* Top row: Back, Title, Theme */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
            </button>
            
            <div className="flex items-center gap-2 flex-1 justify-center min-w-0 px-2">
              <span className="text-2xl flex-shrink-0">{topic.icon}</span>
              <h1 className="text-lg font-semibold text-brown-800 dark:text-white truncate">
                {topic.title}
              </h1>
            </div>

            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-brown-600" />
              )}
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-400 dark:to-ocean-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className="flex justify-between mt-3">
            {STEPS.map((step, index) => {
              const StepIcon = STEP_INFO[step].icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <div
                  key={step}
                  className={`flex flex-col items-center gap-1 ${
                    isCompleted
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : isCurrent
                      ? 'text-coral-600 dark:text-ocean-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : isCurrent
                        ? 'bg-coral-100 dark:bg-ocean-900/30 ring-2 ring-coral-500 dark:ring-ocean-400'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">
                    {STEP_INFO[step].label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
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
            totalTopics={BEGINNER_PATH.length}
            quizScore={quizScore || 0}
            onNextTopic={handleNextTopic}
          />
        )}
      </main>
    </div>
  );
}

