import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, ChevronRight, RotateCcw, Trophy, Brain, Lightbulb, Loader2, HelpCircle, BookOpen, Volume2 } from 'lucide-react';
import { getQuizCategory, shuffleQuestions, checkAnswer, QuizQuestion } from '../data/quizData';
import { saveQuizAttempt } from './Dashboard';
import { useSaveQuizResult } from '../hooks/useQuizQuery';
import { useDictionaryQuiz, DictionaryQuizQuestion } from '../hooks/useVocabularyQuery';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';
import { useSpeech } from '../hooks/useSpeech';

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

interface QuestionResult {
  question: QuizQuestion;
  userAnswer: string;
  isCorrect: boolean;
}

// Convert dictionary quiz question to standard format
function convertDictionaryQuestion(dq: DictionaryQuizQuestion): QuizQuestion {
  if (dq.type === 'multiple_choice') {
    return {
      id: dq.id,
      type: 'multiple_choice',
      question: dq.question,
      options: dq.options || [],
      correctAnswer: dq.options?.[dq.correct_answer as number] || '',
      explanation: dq.explanation,
    };
  } else {
    return {
      id: dq.id,
      type: 'type_answer',
      question: dq.question,
      correctAnswer: dq.correct_answer as string,
      acceptableAnswers: dq.acceptable_answers,
      hint: dq.hint,
      explanation: dq.explanation,
    };
  }
}

export function QuizViewer() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { isSignedIn } = useUser();
  const saveQuizResultMutation = useSaveQuizResult();
  const startTimeRef = useRef<number>(Date.now());
  const { canUse, tryUse, getCount, getLimit, isLoading: subscriptionLoading } = useSubscription();
  const { speak, isSpeaking, stop } = useSpeech();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [usageChecked, setUsageChecked] = useState(false);
  const usageCheckRef = useRef(false); // Prevent double-checking
  
  // Check if this is a dictionary quiz (category starts with "dict-")
  const isDictionaryQuiz = categoryId?.startsWith('dict-');
  const actualCategoryId = isDictionaryQuiz ? categoryId?.replace('dict-', '') : categoryId;
  const questionCount = parseInt(searchParams.get('count') || '10');
  
  // Fetch dictionary quiz if needed
  const { data: dictQuizData, isLoading: isDictLoading, refetch: refetchDictQuiz } = useDictionaryQuiz(
    actualCategoryId,
    questionCount,
    'multiple_choice,type_answer',
    isDictionaryQuiz
  );
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const category = !isDictionaryQuiz && categoryId ? getQuizCategory(categoryId) : undefined;

  // Format question for TTS based on question type
  const formatQuestionForSpeech = (question: QuizQuestion): string => {
    const questionType = question.type;
    const questionText = question.question;
    const hint = question.hint;
    
    if (questionType === 'fill_blank') {
      // For fill-in-the-blank, make it more natural
      // Replace underscores/blanks with "blank"
      const spokenQuestion = questionText.replace(/_{2,}|_+/g, '... blank ...');
      let speech = spokenQuestion;
      if (hint) {
        speech += `. Hint: ${hint}`;
      }
      return speech;
    } else if (questionType === 'type_answer') {
      // For type-answer, include the hint if available
      let speech = questionText;
      if (hint) {
        speech += `. Hint: ${hint}`;
      }
      return speech;
    } else {
      // Multiple choice - just read the question
      return questionText;
    }
  };

  // Browser warning when leaving mid-quiz
  const isQuizInProgress = questions.length > 0 && results.length > 0 && !showResults;
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isQuizInProgress) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isQuizInProgress]);
  const categoryTitle = isDictionaryQuiz ? dictQuizData?.category : category?.title;

  // Check usage limits on mount (wait for data to load first)
  useEffect(() => {
    const checkUsage = async () => {
      // Wait for subscription data to load before checking
      if (subscriptionLoading) return;
      if (!isSignedIn || usageCheckRef.current) {
        // Not signed in or already checked - just mark as checked
        if (!isSignedIn) setUsageChecked(true);
        return;
      }
      usageCheckRef.current = true;
      
      if (!canUse('quiz')) {
        setShowUpgradePrompt(true);
        setUsageChecked(true);
        return;
      }
      
      const allowed = await tryUse('quiz');
      if (!allowed) {
        setShowUpgradePrompt(true);
      }
      setUsageChecked(true);
    };
    
    checkUsage();
  }, [isSignedIn, canUse, tryUse, subscriptionLoading]);

  // Initialize questions for curated quiz
  useEffect(() => {
    if (category && !isDictionaryQuiz && usageChecked && !showUpgradePrompt) {
      setQuestions(shuffleQuestions(category.questions));
    }
  }, [category, isDictionaryQuiz, usageChecked, showUpgradePrompt]);

  // Initialize questions for dictionary quiz
  useEffect(() => {
    if (isDictionaryQuiz && dictQuizData?.questions && usageChecked && !showUpgradePrompt) {
      const converted = dictQuizData.questions.map(convertDictionaryQuestion);
      setQuestions(converted);
    }
  }, [isDictionaryQuiz, dictQuizData, usageChecked, showUpgradePrompt]);

  // Focus input for type_answer questions
  useEffect(() => {
    if (answerState === 'unanswered' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, answerState]);

  // Show upgrade prompt FIRST (before any early returns)
  if (showUpgradePrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <UpgradePrompt
          feature="quiz"
          onClose={() => {
            setShowUpgradePrompt(false);
            navigate('/quiz');
          }}
          usageCount={getCount('quiz')}
          usageLimit={getLimit('quiz')}
        />
      </div>
    );
  }

  // Loading state for dictionary quiz
  if (isDictionaryQuiz && isDictLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400 mx-auto mb-4" />
          <p className="text-brown-600 dark:text-gray-400">Generating quiz questions...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!isDictionaryQuiz && !category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-brown-600 dark:text-gray-400 mb-4">Quiz not found</p>
          <Link to="/quiz" className="text-coral-600 dark:text-ocean-400 hover:underline">
            Back to Quiz List
          </Link>
        </div>
      </div>
    );
  }

  // No questions yet (but not at limit - show loading)
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400 mx-auto mb-4" />
          <p className="text-brown-600 dark:text-gray-400">Loading questions...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = (answer: string) => {
    if (answerState !== 'unanswered') return;
    
    const isCorrect = checkAnswer(currentQuestion, answer);
    setUserAnswer(answer);
    setAnswerState(isCorrect ? 'correct' : 'incorrect');
    setResults([...results, { question: currentQuestion, userAnswer: answer, isCorrect }]);
  };

  // "I don't know" - marks as incorrect and shows the answer
  const handleDontKnow = () => {
    if (answerState !== 'unanswered') return;
    
    setUserAnswer("I don't know");
    setAnswerState('incorrect');
    setResults([...results, { question: currentQuestion, userAnswer: "I don't know", isCorrect: false }]);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setAnswerState('unanswered');
      setShowHint(false);
    } else {
      // Quiz finished - save results
      if (categoryId && categoryTitle) {
        const finalScore = results.filter(r => r.isCorrect).length;
        const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
        
        // Always save to localStorage (works offline)
        saveQuizAttempt(categoryId, finalScore, questions.length);
        
        // If signed in, also save to database with individual answers
        if (isSignedIn) {
          // Convert results to answer format for API
          const answers = results.map(r => ({
            question_id: r.question.id,
            question_text: r.question.question,
            question_type: r.question.type,
            user_answer: r.userAnswer,
            correct_answer: r.question.correctAnswer,
            is_correct: r.isCorrect,
            explanation: r.question.explanation,
          }));
          
          saveQuizResultMutation.mutate({
            category_id: categoryId,
            category_title: categoryTitle,
            score: finalScore,
            total: questions.length,
            time_spent_seconds: timeSpent,
            answers,
          });
        }
      }
      setShowResults(true);
    }
  };

  const handleRestart = async () => {
    // Check usage limits before restarting
    if (isSignedIn) {
      if (!canUse('quiz')) {
        setShowUpgradePrompt(true);
        return;
      }
      const allowed = await tryUse('quiz');
      if (!allowed) {
        setShowUpgradePrompt(true);
        return;
      }
    }
    
    if (isDictionaryQuiz) {
      // Refetch new random questions for dictionary quiz
      refetchDictQuiz();
    } else if (category) {
      setQuestions(shuffleQuestions(category.questions));
    }
    setCurrentIndex(0);
    setUserAnswer('');
    setAnswerState('unanswered');
    setResults([]);
    setShowResults(false);
    setShowHint(false);
    startTimeRef.current = Date.now(); // Reset timer
  };

  // Handle back navigation with confirmation if quiz is in progress
  const handleBack = () => {
    if (results.length > 0) {
      const confirmed = window.confirm(
        'Are you sure you want to leave? Your quiz progress will be lost.'
      );
      if (confirmed) {
        navigate('/quiz');
      }
    } else {
      navigate('/quiz');
    }
  };

  const correctCount = results.filter(r => r.isCorrect).length;
  const scorePercent = Math.round((correctCount / questions.length) * 100);

  // Results Screen
  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link
              to="/quiz"
              className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
            </Link>
            <h1 className="text-xl font-semibold text-brown-800 dark:text-white">
              Quiz Complete!
            </h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Score Card */}
          <div className={`rounded-2xl p-6 mb-6 text-center ${
            scorePercent >= 80 
              ? 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30'
              : scorePercent >= 60
              ? 'bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30'
              : 'bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30'
          }`}>
            <Trophy className={`w-16 h-16 mx-auto mb-4 ${
              scorePercent >= 80 
                ? 'text-green-600 dark:text-green-400'
                : scorePercent >= 60
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
            }`} />
            <h2 className="text-3xl font-bold text-brown-800 dark:text-white mb-2">
              {scorePercent}%
            </h2>
            <p className="text-lg text-brown-700 dark:text-gray-300">
              {correctCount} out of {questions.length} correct
            </p>
            <p className="text-sm text-brown-600 dark:text-gray-400 mt-2">
              {scorePercent >= 80 
                ? '🎉 Excellent work! You\'re mastering Chamorro!'
                : scorePercent >= 60
                ? '👍 Good job! Keep practicing!'
                : '💪 Keep learning! You\'ll get better!'}
            </p>
          </div>

          {/* Review Answers */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-brown-800 dark:text-white mb-4">
              Review Your Answers
            </h3>
            <div className="space-y-3">
              {results.map((result, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-xl ${
                    result.isCorrect 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {result.isCorrect ? (
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brown-800 dark:text-white">
                        {result.question.question}
                      </p>
                      {!result.isCorrect && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Your answer: {result.userAnswer}
                        </p>
                      )}
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Correct: {result.question.correctAnswer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRestart}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all active:scale-95"
            >
              <RotateCcw className="w-5 h-5" />
              {isDictionaryQuiz ? 'New Questions' : 'Try Again'}
            </button>
            <Link
              to="/quiz"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 text-brown-800 dark:text-white rounded-xl font-semibold border-2 border-coral-200 dark:border-ocean-600 hover:bg-coral-50 dark:hover:bg-slate-600 transition-all"
            >
              Other Quizzes
            </Link>
          </div>
          
          {/* Dictionary mode hint OR Try Dictionary Mode button */}
          {isDictionaryQuiz ? (
            <p className="text-center text-sm text-brown-600 dark:text-gray-400 mt-4">
              💡 Dictionary quizzes generate new random questions each time!
            </p>
          ) : (
            <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm font-medium">Want more practice?</span>
                </div>
                <Link
                  to={`/quiz/dict-${actualCategoryId}`}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Try Dictionary Mode
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 text-center sm:text-left">
                10,350+ words • Unlimited new questions • More variety
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Quiz Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm flex-shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleBack}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl">{category?.icon || '📚'}</span>
                <h1 className="text-base sm:text-lg font-semibold text-brown-800 dark:text-white">
                  {categoryTitle || 'Quiz'}
                </h1>
                {isDictionaryQuiz && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                    Dictionary
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm font-medium text-brown-600 dark:text-gray-400">
              {currentIndex + 1} / {questions.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-1.5 sm:h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Content - scrollable area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4 py-4 sm:py-6 pb-safe">
        {currentQuestion && (
          <>
            {/* Question */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg">
              <div className="flex items-center gap-2 mb-2 sm:mb-4">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-coral-500 dark:text-ocean-400" />
                <span className="text-xs font-medium text-brown-500 dark:text-gray-400 uppercase tracking-wide">
                  {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' : 
                   currentQuestion.type === 'type_answer' ? 'Type Your Answer' : 'Fill in the Blank'}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <h2 className="text-lg sm:text-2xl font-bold text-brown-800 dark:text-white leading-snug sm:leading-relaxed flex-1">
                  {currentQuestion.question}
                </h2>
                <button
                  onClick={() => isSpeaking ? stop() : speak(formatQuestionForSpeech(currentQuestion))}
                  className={`p-2 rounded-full transition-all flex-shrink-0 ${
                    isSpeaking 
                      ? 'bg-coral-500 dark:bg-ocean-500 text-white animate-pulse' 
                      : 'bg-coral-100 dark:bg-ocean-900/50 text-coral-600 dark:text-ocean-400 hover:bg-coral-200 dark:hover:bg-ocean-800'
                  }`}
                  title={isSpeaking ? 'Stop' : 'Read question aloud'}
                >
                  <div className="flex items-center justify-center">
                    <Volume2 className="w-5 h-5" />
                  </div>
                </button>
              </div>
              
              {/* Hint - Show automatically for type_answer and fill_blank, toggle for multiple_choice */}
              {currentQuestion.hint && answerState === 'unanswered' && (
                currentQuestion.type === 'multiple_choice' ? (
                  // For multiple choice: show toggle button
                  <>
                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      <Lightbulb className="w-4 h-4" />
                      {showHint ? 'Hide hint' : 'Need a hint?'}
                    </button>
                    {showHint && (
                      <p className="mt-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                        💡 {currentQuestion.hint}
                      </p>
                    )}
                  </>
                ) : (
                  // For type_answer and fill_blank: show hint automatically
                  <div className="mt-4 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800">
                    <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Hint:</span> {currentQuestion.hint}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Answer Options */}
            <div>
              {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = userAnswer === option;
                    const isCorrectOption = option === currentQuestion.correctAnswer;
                    
                    let buttonClass = 'bg-white dark:bg-slate-800 border-2 border-cream-200 dark:border-slate-700 hover:border-coral-400 dark:hover:border-ocean-500';
                    
                    if (answerState !== 'unanswered') {
                      if (isCorrectOption) {
                        buttonClass = 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500';
                      } else if (isSelected && !isCorrectOption) {
                        buttonClass = 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500';
                      } else {
                        buttonClass = 'bg-white dark:bg-slate-800 border-2 border-cream-200 dark:border-slate-700 opacity-50';
                      }
                    }
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(option)}
                        disabled={answerState !== 'unanswered'}
                        className={`p-3 sm:p-4 rounded-xl text-left transition-all ${buttonClass} ${
                          answerState === 'unanswered' ? 'active:scale-98' : ''
                        }`}
                      >
<div className="flex items-center gap-2 sm:gap-3">
                                          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-coral-100 dark:bg-ocean-900/50 flex items-center justify-center text-sm font-bold text-coral-600 dark:text-ocean-400 flex-shrink-0">
                                            {String.fromCharCode(65 + idx)}
                                          </span>
                                          <span className="font-medium text-brown-800 dark:text-white text-sm sm:text-base flex-1">
                                            {option}
                                          </span>
                                          {/* Speaker icon for option - use span to avoid button-in-button */}
                                          {answerState === 'unanswered' && (
                                            <span
                                              role="button"
                                              tabIndex={0}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                speak(option);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                  e.stopPropagation();
                                                  e.preventDefault();
                                                  speak(option);
                                                }
                                              }}
                                              className="w-8 h-8 rounded-full bg-cream-100 dark:bg-slate-700 text-brown-500 dark:text-gray-400 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex-shrink-0 flex items-center justify-center cursor-pointer"
                                              title="Read option aloud"
                                            >
                                              <Volume2 className="w-4 h-4" />
                                            </span>
                                          )}
                                          {answerState !== 'unanswered' && isCorrectOption && (
                                            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                          )}
                                          {answerState !== 'unanswered' && isSelected && !isCorrectOption && (
                                            <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                          )}
                                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {(currentQuestion.type === 'type_answer' || currentQuestion.type === 'fill_blank') && (
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && userAnswer.trim() && answerState === 'unanswered') {
                          handleAnswer(userAnswer);
                        }
                      }}
                      disabled={answerState !== 'unanswered'}
                      placeholder="Type your answer..."
                      className={`w-full px-4 py-4 text-lg rounded-xl border-2 transition-all ${
                        answerState === 'unanswered'
                          ? 'border-cream-200 dark:border-slate-700 focus:border-coral-400 dark:focus:border-ocean-500 bg-white dark:bg-slate-800'
                          : answerState === 'correct'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      } text-brown-800 dark:text-white placeholder-brown-400 dark:placeholder-gray-500 outline-none`}
                    />
                    {answerState !== 'unanswered' && (
                      <div className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                        answerState === 'correct' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {answerState === 'correct' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
                      </div>
                    )}
                  </div>
                  
                  {answerState === 'unanswered' && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => handleAnswer(userAnswer)}
                        disabled={!userAnswer.trim()}
                        className="flex-1 py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all active:scale-98"
                      >
                        Submit Answer
                      </button>
                      <button
                        onClick={handleDontKnow}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-brown-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-all active:scale-98"
                      >
                        <HelpCircle className="w-5 h-5" />
                        I don't know
                      </button>
                    </div>
                  )}

                  {answerState === 'incorrect' && (
                    <p className="text-sm text-center text-green-600 dark:text-green-400">
                      Correct answer: <strong>{currentQuestion.correctAnswer}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Explanation & Next Button */}
            {answerState !== 'unanswered' && (
              <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                {currentQuestion.explanation && (
                  <div className={`p-3 sm:p-4 rounded-xl ${
                    answerState === 'correct'
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                  }`}>
                    <p className="text-sm text-brown-700 dark:text-gray-300">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}
                
                <button
                  onClick={handleNext}
                  className="w-full py-3 sm:py-4 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-98"
                >
                  {currentIndex < questions.length - 1 ? (
                    <>
                      Next Question
                      <ChevronRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      See Results
                      <Trophy className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

