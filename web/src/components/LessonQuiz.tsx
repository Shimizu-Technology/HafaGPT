import { useState, useMemo, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, ArrowRight, HelpCircle } from 'lucide-react';
import { LearningTopic } from '../data/learningPath';
import { QUIZ_CATEGORIES, QuizQuestion } from '../data/quizData';

interface LessonQuizProps {
  topic: LearningTopic;
  onComplete: (score: number) => void;
}

const QUESTIONS_PER_QUIZ = 5;
const STORAGE_KEY_PREFIX = 'hafagpt_quiz_';

interface SavedQuizState {
  topicId: string;
  questionIds: string[];  // Preserve the randomized order
  currentIndex: number;
  correctCount: number;
  answeredQuestions: Record<string, { userAnswer: string; isCorrect: boolean }>;
  timestamp: number;
}

function getStorageKey(topicId: string) {
  return `${STORAGE_KEY_PREFIX}${topicId}`;
}

function saveQuizState(state: SavedQuizState) {
  try {
    localStorage.setItem(getStorageKey(state.topicId), JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save quiz state:', e);
  }
}

function loadQuizState(topicId: string): SavedQuizState | null {
  try {
    const saved = localStorage.getItem(getStorageKey(topicId));
    if (!saved) return null;
    
    const state: SavedQuizState = JSON.parse(saved);
    
    // Check if state is older than 1 hour (stale)
    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - state.timestamp > ONE_HOUR) {
      clearQuizState(topicId);
      return null;
    }
    
    return state;
  } catch (e) {
    console.warn('Failed to load quiz state:', e);
    return null;
  }
}

function clearQuizState(topicId: string) {
  try {
    localStorage.removeItem(getStorageKey(topicId));
  } catch (e) {
    console.warn('Failed to clear quiz state:', e);
  }
}

export function LessonQuiz({ topic, onComplete }: LessonQuizProps) {
  // Try to restore saved state first
  const savedState = useMemo(() => loadQuizState(topic.id), [topic.id]);
  
  // Get questions for this topic - preserve order if we have saved state
  const allQuestions = useMemo(() => {
    const category = QUIZ_CATEGORIES.find(c => c.id === topic.quizCategory);
    if (!category) return [];
    
    // If we have saved state with question IDs, use that order
    if (savedState?.questionIds) {
      const questionMap = new Map(category.questions.map(q => [q.id, q]));
      const restoredQuestions = savedState.questionIds
        .map(id => questionMap.get(id))
        .filter((q): q is QuizQuestion => q !== undefined);
      
      if (restoredQuestions.length === savedState.questionIds.length) {
        return restoredQuestions;
      }
    }
    
    // Otherwise, shuffle and take first N questions
    const shuffled = [...category.questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, QUESTIONS_PER_QUIZ);
  }, [topic.quizCategory, savedState]);

  // Initialize state from saved or fresh
  const [currentIndex, setCurrentIndex] = useState(savedState?.currentIndex ?? 0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(savedState?.correctCount ?? 0);
  const [showHint, setShowHint] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, { userAnswer: string; isCorrect: boolean }>>(
    savedState?.answeredQuestions ?? {}
  );
  const [showResumePrompt, setShowResumePrompt] = useState(
    savedState !== null && savedState.currentIndex > 0
  );

  // Save state whenever it changes
  const persistState = useCallback(() => {
    if (allQuestions.length === 0) return;
    
    const state: SavedQuizState = {
      topicId: topic.id,
      questionIds: allQuestions.map(q => q.id),
      currentIndex,
      correctCount,
      answeredQuestions,
      timestamp: Date.now(),
    };
    saveQuizState(state);
  }, [topic.id, allQuestions, currentIndex, correctCount, answeredQuestions]);

  // Persist on state changes
  useEffect(() => {
    if (allQuestions.length > 0 && currentIndex < allQuestions.length) {
      persistState();
    }
  }, [currentIndex, correctCount, answeredQuestions, persistState, allQuestions.length]);

  // Warn user before leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if quiz is in progress (not on first or last question after answering)
      if (currentIndex > 0 || isAnswered) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentIndex, isAnswered]);

  const currentQuestion = allQuestions[currentIndex];
  const progress = ((currentIndex + 1) / allQuestions.length) * 100;
  const isLastQuestion = currentIndex === allQuestions.length - 1;

  // Calculate if answer is correct (must be before early returns to satisfy Rules of Hooks)
  const isCorrect = useMemo(() => {
    if (!isAnswered || !currentQuestion) return false;
    
    if (currentQuestion.type === 'multiple_choice') {
      return selectedAnswer === currentQuestion.correctAnswer;
    } else {
      const answer = typedAnswer.trim().toLowerCase();
      const acceptable = currentQuestion.acceptableAnswers?.map(a => a.toLowerCase()) || [];
      const correct = currentQuestion.correctAnswer.toLowerCase();
      return answer === correct || acceptable.includes(answer);
    }
  }, [isAnswered, selectedAnswer, typedAnswer, currentQuestion]);

  const handleStartFresh = () => {
    clearQuizState(topic.id);
    setCurrentIndex(0);
    setCorrectCount(0);
    setAnsweredQuestions({});
    setSelectedAnswer(null);
    setTypedAnswer('');
    setIsAnswered(false);
    setShowHint(false);
    setShowResumePrompt(false);
    // Note: questions will stay the same since we don't re-shuffle on fresh start
    // This is intentional - full page refresh would give new questions
  };

  if (allQuestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-brown-600 dark:text-gray-400">
          No quiz questions available for this topic.
        </p>
        <button
          onClick={() => onComplete(100)}
          className="mt-4 px-6 py-2 bg-coral-500 text-white rounded-xl"
        >
          Continue anyway
        </button>
      </div>
    );
  }

  // Show resume prompt if there's saved progress
  if (showResumePrompt && savedState) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-cream-200/50 dark:border-slate-700/50 text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowRight className="w-8 h-8 text-purple-500 dark:text-purple-400" />
          </div>
          
          <h3 className="text-xl font-bold text-brown-800 dark:text-white mb-2">
            Continue Quiz?
          </h3>
          
          <p className="text-brown-600 dark:text-gray-400 mb-6">
            You were on question {savedState.currentIndex + 1} of {allQuestions.length} with {savedState.correctCount} correct answer{savedState.correctCount !== 1 ? 's' : ''}.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => setShowResumePrompt(false)}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700
                       text-white font-semibold rounded-2xl shadow-lg
                       hover:from-purple-600 hover:to-purple-700 dark:hover:from-purple-700 dark:hover:to-purple-800
                       transition-all"
            >
              Continue Where I Left Off
            </button>
            
            <button
              onClick={handleStartFresh}
              className="w-full py-3 bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-400
                       font-medium rounded-xl hover:bg-cream-200 dark:hover:bg-slate-600 
                       transition-colors"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  const checkAnswer = () => {
    if (!currentQuestion) return;

    let correct = false;
    let userAnswer = '';
    
    if (currentQuestion.type === 'multiple_choice') {
      userAnswer = selectedAnswer || '';
      correct = selectedAnswer === currentQuestion.correctAnswer;
    } else {
      // For fill_blank and type_answer
      userAnswer = typedAnswer.trim();
      const answer = userAnswer.toLowerCase();
      const acceptable = currentQuestion.acceptableAnswers?.map(a => a.toLowerCase()) || [];
      const correctAns = currentQuestion.correctAnswer.toLowerCase();
      correct = answer === correctAns || acceptable.includes(answer);
    }

    if (correct) {
      setCorrectCount(prev => prev + 1);
    }
    
    // Track this answer
    setAnsweredQuestions(prev => ({
      ...prev,
      [currentQuestion.id]: { userAnswer, isCorrect: correct }
    }));
    
    setIsAnswered(true);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Clear saved state on completion
      clearQuizState(topic.id);
      
      // Calculate final score
      const score = Math.round((correctCount / allQuestions.length) * 100);
      onComplete(score);
    } else {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setTypedAnswer('');
      setIsAnswered(false);
      setShowHint(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-brown-600 dark:text-gray-400">
        <span>Question {currentIndex + 1} of {allQuestions.length}</span>
        <span>{correctCount} correct</span>
      </div>
      
      <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-400 to-purple-500 dark:from-purple-500 dark:to-purple-600 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-cream-200/50 dark:border-slate-700/50">
        {/* Question type badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            currentQuestion.type === 'multiple_choice'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : currentQuestion.type === 'fill_blank'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
          }`}>
            {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' :
             currentQuestion.type === 'fill_blank' ? 'Fill in the Blank' : 'Type Answer'}
          </span>
          
          {currentQuestion.hint && !isAnswered && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="p-2 rounded-lg text-brown-500 hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Question */}
        <h3 className="text-xl font-semibold text-brown-800 dark:text-white mb-6">
          {currentQuestion.question}
        </h3>

        {/* Hint */}
        {showHint && currentQuestion.hint && !isAnswered && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-700 dark:text-amber-300 text-sm">
            💡 Hint: {currentQuestion.hint}
          </div>
        )}

        {/* Answer options */}
        {currentQuestion.type === 'multiple_choice' ? (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = option === currentQuestion.correctAnswer;
              
              let bgClass = 'bg-cream-50 dark:bg-slate-700/50 hover:bg-cream-100 dark:hover:bg-slate-700';
              let borderClass = 'border-cream-200 dark:border-slate-600';
              let textClass = 'text-brown-800 dark:text-white';
              
              if (isAnswered) {
                if (isCorrectAnswer) {
                  bgClass = 'bg-emerald-50 dark:bg-emerald-900/30';
                  borderClass = 'border-emerald-500 dark:border-emerald-400';
                  textClass = 'text-emerald-700 dark:text-emerald-300';
                } else if (isSelected && !isCorrectAnswer) {
                  bgClass = 'bg-red-50 dark:bg-red-900/30';
                  borderClass = 'border-red-500 dark:border-red-400';
                  textClass = 'text-red-700 dark:text-red-300';
                }
              } else if (isSelected) {
                bgClass = 'bg-coral-100 dark:bg-ocean-800/50';
                borderClass = 'border-coral-500 dark:border-ocean-400';
                textClass = 'text-coral-700 dark:text-ocean-200';
              }
              
              return (
                <button
                  key={idx}
                  onClick={() => !isAnswered && setSelectedAnswer(option)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${bgClass} ${borderClass} ${
                    isAnswered ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${textClass}`}>
                      {option}
                    </span>
                    
                    {isAnswered && isCorrectAnswer && (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    )}
                    {isAnswered && isSelected && !isCorrectAnswer && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Text input for fill_blank and type_answer */
          <div className="space-y-4">
            <input
              type="text"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isAnswered && typedAnswer && checkAnswer()}
              disabled={isAnswered}
              placeholder="Type your answer..."
              className={`w-full p-4 rounded-xl border-2 text-lg font-medium transition-all ${
                isAnswered
                  ? isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300'
                  : 'bg-cream-50 dark:bg-slate-700 border-cream-200 dark:border-slate-600 text-brown-800 dark:text-white placeholder:text-brown-400 dark:placeholder:text-gray-500'
              }`}
            />
            
            {/* I don't know button - only show when not answered */}
            {!isAnswered && (
              <button
                onClick={() => {
                  setTypedAnswer('');
                  checkAnswer();
                }}
                className="w-full py-3 px-4 bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-400
                         font-medium rounded-xl hover:bg-cream-200 dark:hover:bg-slate-600 
                         transition-colors text-sm"
              >
                I don't know — show me the answer
              </button>
            )}
            
            {isAnswered && !isCorrect && (
              <p className="text-sm text-brown-600 dark:text-gray-400">
                Correct answer: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{currentQuestion.correctAnswer}</span>
              </p>
            )}
          </div>
        )}

        {/* Explanation (after answering) */}
        {isAnswered && currentQuestion.explanation && (
          <div className={`mt-4 p-4 rounded-xl ${
            isCorrect 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
          }`}>
            <p className="text-sm">
              {isCorrect ? '✓ ' : '💡 '}{currentQuestion.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Action button */}
      {!isAnswered ? (
        <button
          onClick={checkAnswer}
          disabled={currentQuestion.type === 'multiple_choice' ? !selectedAnswer : !typedAnswer.trim()}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700
                   text-white font-semibold rounded-2xl shadow-lg
                   hover:from-purple-600 hover:to-purple-700 dark:hover:from-purple-700 dark:hover:to-purple-800
                   transition-all disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2"
        >
          Check Answer
        </button>
      ) : (
        <button
          onClick={handleNext}
          className={`w-full py-4 font-semibold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
            isCorrect
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'
              : 'bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white hover:from-coral-600 hover:to-coral-700'
          }`}
        >
          {isLastQuestion ? 'See Results' : 'Next Question'}
          <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

