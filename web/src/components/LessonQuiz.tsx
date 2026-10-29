import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, ArrowRight, HelpCircle } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { LearningTopic } from '../data/learningPath';
import { QUIZ_CATEGORIES, QuizQuestion } from '../data/quizData';
import { getQuestionConceptId } from '../data/conceptEvidence';
import { checkFuzzyAnswer } from '../utils/fuzzyMatch';
import { browserStorage } from '../lib/browserStorage';
import { createClientAttemptId } from '../lib/clientAttemptId';
import { Button } from './Button';
import { LearnerProgress } from './LearnerProgress';
import { PronunciationButton } from './PronunciationButton';
import { TTSDisclaimer } from './TTSDisclaimer';
import { useSaveQuizResult } from '../hooks/useQuizQuery';

interface LessonQuizProps {
  topic: LearningTopic;
  onComplete: (score: number) => void;
}

const QUESTIONS_PER_QUIZ = 5;
const STORAGE_KEY_PREFIX = 'hafagpt_quiz_';

interface SavedQuizState {
  topicId: string;
  attemptId?: string;
  startedAt?: number;
  questionIds: string[];  // Preserve the randomized order
  currentIndex: number;
  correctCount: number;
  answeredQuestions: Record<string, { userAnswer: string; isCorrect: boolean }>;
  timestamp: number;
}

function getStorageKey(topicId: string, ownerId: string) {
  return `${STORAGE_KEY_PREFIX}${ownerId}_${topicId}`;
}

function saveQuizState(state: SavedQuizState, ownerId: string) {
  try {
    browserStorage.set(getStorageKey(state.topicId, ownerId), JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save quiz state:', e);
  }
}

function loadQuizState(topicId: string, ownerId: string): SavedQuizState | null {
  try {
    const saved = browserStorage.get(getStorageKey(topicId, ownerId));
    if (!saved) return null;
    
    const state: unknown = JSON.parse(saved);
    if (
      typeof state !== 'object'
      || state === null
      || !('topicId' in state)
      || state.topicId !== topicId
      || !('questionIds' in state)
      || !Array.isArray(state.questionIds)
      || state.questionIds.length === 0
      || state.questionIds.length > QUESTIONS_PER_QUIZ
      || !state.questionIds.every((questionId) => typeof questionId === 'string')
      || new Set(state.questionIds).size !== state.questionIds.length
      || !('currentIndex' in state)
      || typeof state.currentIndex !== 'number'
      || !Number.isInteger(state.currentIndex)
      || state.currentIndex < 0
      || state.currentIndex >= state.questionIds.length
      || !('correctCount' in state)
      || typeof state.correctCount !== 'number'
      || !Number.isInteger(state.correctCount)
      || state.correctCount < 0
      || state.correctCount > state.questionIds.length
      || !('answeredQuestions' in state)
      || typeof state.answeredQuestions !== 'object'
      || state.answeredQuestions === null
      || Array.isArray(state.answeredQuestions)
      || !Object.values(state.answeredQuestions).every((answer) => (
        typeof answer === 'object'
        && answer !== null
        && 'userAnswer' in answer
        && typeof answer.userAnswer === 'string'
        && 'isCorrect' in answer
        && typeof answer.isCorrect === 'boolean'
      ))
      || !((state.questionIds as string[]).slice(0, state.currentIndex)).every(
        (questionId) => questionId in (state.answeredQuestions as Record<string, unknown>),
      )
      || !Object.keys(state.answeredQuestions).every((questionId) =>
        (state.questionIds as string[])
          .slice(0, (state.currentIndex as number) + 1)
          .includes(questionId),
      )
      || ![
        state.currentIndex,
        state.currentIndex + 1,
      ].includes(Object.keys(state.answeredQuestions).length)
      || state.correctCount !== Object.values(state.answeredQuestions)
        .filter((answer) => (
          typeof answer === 'object'
          && answer !== null
          && 'isCorrect' in answer
          && answer.isCorrect === true
        )).length
      || !('timestamp' in state)
      || typeof state.timestamp !== 'number'
      || !Number.isFinite(state.timestamp)
      || ('attemptId' in state && state.attemptId !== undefined && typeof state.attemptId !== 'string')
      || ('startedAt' in state && state.startedAt !== undefined && (
        typeof state.startedAt !== 'number' || !Number.isFinite(state.startedAt)
      ))
    ) {
      clearQuizState(topicId, ownerId);
      return null;
    }
    
    // Keep meaningful work available across learning days.
    const RESUME_WINDOW = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - state.timestamp > RESUME_WINDOW) {
      clearQuizState(topicId, ownerId);
      return null;
    }
    
    return state as SavedQuizState;
  } catch (e) {
    console.warn('Failed to load quiz state:', e);
    clearQuizState(topicId, ownerId);
    return null;
  }
}

function clearQuizState(topicId: string, ownerId: string) {
  try {
    browserStorage.remove(getStorageKey(topicId, ownerId));
  } catch (e) {
    console.warn('Failed to clear quiz state:', e);
  }
}

export function LessonQuiz({ topic, onComplete }: LessonQuizProps) {
  const { isSignedIn, user } = useUser();
  const ownerId = user?.id ?? 'anonymous';
  return (
    <LessonQuizSession
      key={`${ownerId}:${topic.id}`}
      topic={topic}
      onComplete={onComplete}
      isSignedIn={Boolean(isSignedIn)}
      ownerId={ownerId}
    />
  );
}

interface LessonQuizSessionProps extends LessonQuizProps {
  isSignedIn: boolean;
  ownerId: string;
}

function LessonQuizSession({
  topic,
  onComplete,
  isSignedIn,
  ownerId,
}: LessonQuizSessionProps) {
  const saveQuizResult = useSaveQuizResult();
  const questionRef = useRef<HTMLHeadingElement>(null);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  // Try to restore saved state first
  const savedState = useMemo(() => {
    const state = loadQuizState(topic.id, ownerId);
    if (!state) return null;

    const category = QUIZ_CATEGORIES.find((candidate) => candidate.id === topic.quizCategory);
    const validQuestionIds = new Set(category?.questions.map((question) => question.id) ?? []);
    const expectedQuestionCount = Math.min(QUESTIONS_PER_QUIZ, validQuestionIds.size);
    if (
      state.questionIds.length !== expectedQuestionCount
      || !state.questionIds.every((questionId) => validQuestionIds.has(questionId))
    ) {
      clearQuizState(topic.id, ownerId);
      return null;
    }

    return state;
  }, [topic.id, topic.quizCategory, ownerId]);
  const attemptIdRef = useRef(savedState?.attemptId ?? createClientAttemptId());
  const startedAtRef = useRef(savedState?.startedAt ?? Date.now());
  const completionStartedRef = useRef(false);
  
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

  const restoredCurrentQuestion = savedState
    ? allQuestions[savedState.currentIndex]
    : undefined;
  const restoredCurrentAnswer = restoredCurrentQuestion
    ? savedState?.answeredQuestions[restoredCurrentQuestion.id]
    : undefined;

  // Initialize state from saved or fresh
  const [currentIndex, setCurrentIndex] = useState(savedState?.currentIndex ?? 0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(
    restoredCurrentQuestion?.type === 'multiple_choice'
      ? restoredCurrentAnswer?.userAnswer ?? null
      : null,
  );
  const [typedAnswer, setTypedAnswer] = useState(
    restoredCurrentQuestion?.type !== 'multiple_choice'
      ? restoredCurrentAnswer?.userAnswer ?? ''
      : '',
  );
  const [isAnswered, setIsAnswered] = useState(Boolean(restoredCurrentAnswer));
  const [restoredIsCorrect, setRestoredIsCorrect] = useState<boolean | null>(
    restoredCurrentAnswer?.isCorrect ?? null,
  );
  const [correctCount, setCorrectCount] = useState(savedState?.correctCount ?? 0);
  const [showHint, setShowHint] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, { userAnswer: string; isCorrect: boolean }>>(
    savedState?.answeredQuestions ?? {}
  );
  const [showResumePrompt, setShowResumePrompt] = useState(
    savedState !== null && savedState.currentIndex > 0
  );
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const previousQuestion = useRef({ index: currentIndex, prompt: showResumePrompt });
  useEffect(() => {
    const changed = previousQuestion.current.index !== currentIndex || previousQuestion.current.prompt !== showResumePrompt;
    previousQuestion.current = { index: currentIndex, prompt: showResumePrompt };
    if (changed && !showResumePrompt) questionRef.current?.focus();
  }, [currentIndex, showResumePrompt]);

  // Save state whenever it changes
  const persistState = useCallback(() => {
    if (allQuestions.length === 0) return;
    
    const state: SavedQuizState = {
      topicId: topic.id,
      attemptId: attemptIdRef.current,
      startedAt: startedAtRef.current,
      questionIds: allQuestions.map(q => q.id),
      currentIndex,
      correctCount,
      answeredQuestions,
      timestamp: Date.now(),
    };
    saveQuizState(state, ownerId);
  }, [topic.id, ownerId, allQuestions, currentIndex, correctCount, answeredQuestions]);

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
    if (restoredIsCorrect !== null) return restoredIsCorrect;
    
    if (currentQuestion.type === 'multiple_choice') {
      return selectedAnswer === currentQuestion.correctAnswer;
    } else {
      const answer = typedAnswer.trim().toLowerCase();
      const acceptable = currentQuestion.acceptableAnswers?.map(a => a.toLowerCase()) || [];
      const correct = currentQuestion.correctAnswer.toLowerCase();
      return answer === correct || acceptable.includes(answer);
    }
  }, [isAnswered, restoredIsCorrect, selectedAnswer, typedAnswer, currentQuestion]);

  const handleStartFresh = () => {
    clearQuizState(topic.id, ownerId);
    attemptIdRef.current = createClientAttemptId();
    startedAtRef.current = Date.now();
    completionStartedRef.current = false;
    setIsSavingResult(false);
    setSaveError(null);
    setCurrentIndex(0);
    setCorrectCount(0);
    setAnsweredQuestions({});
    setSelectedAnswer(null);
    setTypedAnswer('');
    setIsAnswered(false);
    setRestoredIsCorrect(null);
    setShowHint(false);
    setShowResumePrompt(false);
    // Note: questions will stay the same since we don't re-shuffle on fresh start
    // This is intentional - full page refresh would give new questions
  };

  if (allQuestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-brown-600 dark:text-gray-300">
          No quiz questions available for this topic.
        </p>
        <button
          onClick={() => onComplete(100)}
          className="mt-4 px-6 py-2 bg-coral-700 dark:bg-teal-700 text-white rounded-xl"
        >
          Continue anyway
        </button>
      </div>
    );
  }

  // Show resume prompt if there's saved progress
  if (showResumePrompt && savedState) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200/50 dark:border-slate-700/50 text-center">
          <div className="w-16 h-16 bg-coral-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowRight className="w-8 h-8 text-coral-700 dark:text-teal-300" />
          </div>
          
          <h3 id="lesson-quiz-question" ref={questionRef} tabIndex={-1} className="text-xl font-bold text-brown-800 dark:text-white mb-2">
            Continue Quiz?
          </h3>
          
          <p className="text-brown-600 dark:text-gray-300 mb-6">
            You were on question {savedState.currentIndex + 1} of {allQuestions.length} with {savedState.correctCount} correct answer{savedState.correctCount !== 1 ? 's' : ''}.
          </p>
          
          <div className="space-y-3">
            <Button size="large"
              onClick={() => setShowResumePrompt(false)}
              className="w-full"
            >
              Continue Where I Left Off
            </Button>
            
            <Button size="large" variant="secondary"
              onClick={handleStartFresh}
              className="w-full"
            >
              Start Fresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const checkAnswer = (skip = false) => {
    if (!currentQuestion) return;
    setRestoredIsCorrect(null);

    let correct = false;
    let userAnswer = '';
    
    if (currentQuestion.type === 'multiple_choice') {
      userAnswer = selectedAnswer || '';
      correct = selectedAnswer === currentQuestion.correctAnswer;
    } else {
      // For fill_blank and type_answer - use fuzzy matching
      userAnswer = skip ? '' : typedAnswer.trim();
      const result = checkFuzzyAnswer(
        userAnswer,
        currentQuestion.correctAnswer,
        currentQuestion.acceptableAnswers || [],
        0.75 // 75% similarity threshold - tolerant of minor typos
      );
      correct = result.isCorrect;
    }

    if (correct) {
      setCorrectCount(prev => prev + 1);
    }
    
    // Track this answer
    setAnsweredQuestions(prev => ({
      ...prev,
      [currentQuestion.id]: { userAnswer, isCorrect: correct }
    }));
    
    setRestoredIsCorrect(correct);
    setIsAnswered(true);
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      if (completionStartedRef.current) return;
      completionStartedRef.current = true;
      setSaveError(null);
      
      // Calculate final score
      const score = Math.round((correctCount / allQuestions.length) * 100);
      if (isSignedIn) {
        const answers = allQuestions.flatMap((question) => {
          const answer = answeredQuestions[question.id];
          if (!answer) return [];
          return [{
            question_id: question.id,
            question_text: question.question,
            question_type: question.type,
            user_answer: answer.userAnswer,
            correct_answer: question.correctAnswer,
            is_correct: answer.isCorrect,
            explanation: question.explanation,
            concept_id: getQuestionConceptId(question.id),
          }];
        });

        if (answers.length === allQuestions.length) {
          const categoryTitle = QUIZ_CATEGORIES.find(
            (category) => category.id === topic.quizCategory,
          )?.title ?? topic.title;
          setIsSavingResult(true);
          try {
            await saveQuizResult.mutateAsync({
              category_id: topic.quizCategory,
              category_title: categoryTitle,
              score: correctCount,
              total: allQuestions.length,
              time_spent_seconds: Math.max(
                0,
                Math.round((Date.now() - startedAtRef.current) / 1000),
              ),
              answers,
              client_attempt_id: attemptIdRef.current,
              learning_context: {
                topic_id: topic.id,
                source: 'lesson',
                assessment_id: `v1:lesson:${topic.id}:embedded-quiz`,
              },
            });
          } catch {
            if (!active.current) return;
            completionStartedRef.current = false;
            setIsSavingResult(false);
            setSaveError('We could not save your result. Keep this page open and try again.');
            return;
          }
        }
      }
      if (!active.current) return;
      clearQuizState(topic.id, ownerId);
      setIsSavingResult(false);
      onComplete(score);
    } else {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setTypedAnswer('');
      setIsAnswered(false);
      setRestoredIsCorrect(null);
      setShowHint(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-brown-600 dark:text-gray-300">
        <span>Question {currentIndex + 1} of {allQuestions.length}</span>
        <span>{correctCount} correct</span>
      </div>
      
      <LearnerProgress value={progress} label="Quiz progress" />
      <TTSDisclaimer variant="inline" className="!text-amber-800 dark:!text-amber-200" />
      <p className="text-base text-muted">Tap “Hear it” to listen. Ask a grown-up to read this with you if audio is unavailable.</p>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{isAnswered ? isCorrect ? 'Correct.' : `Incorrect. Correct answer: ${currentQuestion.correctAnswer}` : ''}</p>

      {/* Question card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200/50 dark:border-slate-700/50">
        {/* Question type badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            currentQuestion.type === 'multiple_choice'
              ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
              : currentQuestion.type === 'fill_blank'
              ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
          }`}>
            {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' :
             currentQuestion.type === 'fill_blank' ? 'Fill in the Blank' : 'Type Answer'}
          </span>
          
          {currentQuestion.hint && !isAnswered && (
            <button
              onClick={() => setShowHint(!showHint)}
              type="button"
              aria-label={showHint ? 'Hide hint' : 'Show hint'}
              aria-expanded={showHint}
              aria-controls="lesson-quiz-hint"
              className="min-h-11 min-w-11 p-2 rounded-lg text-brown-600 dark:text-gray-300 hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors"
            >
              <HelpCircle className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Question */}
        <h3 id="lesson-quiz-question" ref={questionRef} tabIndex={-1} className="text-xl font-semibold text-brown-800 dark:text-white mb-6">
          {currentQuestion.question}
        </h3>

        <PronunciationButton key={currentQuestion.id} text={currentQuestion.question} label="Hear it" showLabel />
        <p id="lesson-quiz-instructions" className="my-3 text-base text-muted">{currentQuestion.type === 'multiple_choice' ? 'Choose one answer, then check your answer.' : 'Type your answer, then check it. You can also choose “I don’t know”.'}</p>

        {/* Hint */}
        {showHint && currentQuestion.hint && !isAnswered && (
          <div id="lesson-quiz-hint" className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-700 dark:text-amber-300 text-sm">
            <p>Hint: {currentQuestion.hint}</p>
            <PronunciationButton text={currentQuestion.hint} label="Hear it" showLabel />
          </div>
        )}

        {/* Answer options */}
        {currentQuestion.type === 'multiple_choice' ? (
          <div role="group" aria-labelledby="lesson-quiz-question" aria-describedby="lesson-quiz-instructions" className="space-y-3">
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
                <div key={idx} className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => !isAnswered && setSelectedAnswer(option)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${bgClass} ${borderClass} ${
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
                <PronunciationButton key={`${currentQuestion.id}:${idx}`} text={option} label="Hear it" showLabel />
                </div>
              );
            })}
          </div>
        ) : (
          /* Text input for fill_blank and type_answer */
          <div className="space-y-4">
            <input
              type="text"
              aria-labelledby="lesson-quiz-question"
              aria-describedby="lesson-quiz-instructions"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isAnswered && typedAnswer && checkAnswer()}
              disabled={isAnswered}
              placeholder="Type your answer..."
              className={`w-full p-4 rounded-xl border-2 text-lg font-medium transition-colors ${
                isAnswered
                  ? isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300'
                  : 'bg-cream-50 dark:bg-slate-700 border-cream-200 dark:border-slate-600 text-brown-800 dark:text-white placeholder:text-brown-600 dark:placeholder:text-gray-300'
              }`}
            />
            
            {/* I don't know button - only show when not answered */}
            {!isAnswered && (
              <button
                onClick={() => {
                  setTypedAnswer('');
                  checkAnswer(true);
                }}
                className="w-full py-3 px-4 bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-300
                         font-medium rounded-xl hover:bg-cream-200 dark:hover:bg-slate-600 
                         transition-colors text-sm"
              >
                I don't know — show me the answer
              </button>
            )}
            
            {isAnswered && !isCorrect && (
              <p className="text-sm text-brown-600 dark:text-gray-300">
                Correct answer: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{currentQuestion.correctAnswer}</span>
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
            <PronunciationButton text={currentQuestion.explanation} label="Hear it" showLabel />
          </div>
        )}
      </div>

      {/* Action button */}
      {saveError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
        >
          {saveError}
        </div>
      )}

      {!isAnswered ? (
        <Button size="large"
          onClick={() => checkAnswer()}
          disabled={currentQuestion.type === 'multiple_choice' ? !selectedAnswer : !typedAnswer.trim()}
          className="w-full"
        >
          Check Answer
        </Button>
      ) : (
        <Button size="large"
          onClick={handleNext}
          disabled={isSavingResult}
          className="w-full"
        >
          {isSavingResult
            ? 'Saving Result…'
            : saveError
              ? 'Retry Saving Result'
              : isLastQuestion
                ? 'See Results'
                : 'Next Question'}
          <ArrowRight className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
