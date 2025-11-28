import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, X, ChevronRight, RotateCcw, Trophy, Brain, Lightbulb } from 'lucide-react';
import { getQuizCategory, shuffleQuestions, checkAnswer, QuizQuestion } from '../data/quizData';

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

interface QuestionResult {
  question: QuizQuestion;
  userAnswer: string;
  isCorrect: boolean;
}

export function QuizViewer() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const category = categoryId ? getQuizCategory(categoryId) : undefined;

  // Initialize questions
  useEffect(() => {
    if (category) {
      setQuestions(shuffleQuestions(category.questions));
    }
  }, [category]);

  // Focus input for type_answer questions
  useEffect(() => {
    if (answerState === 'unanswered' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, answerState]);

  if (!category) {
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

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = (answer: string) => {
    if (answerState !== 'unanswered') return;
    
    const isCorrect = checkAnswer(currentQuestion, answer);
    setUserAnswer(answer);
    setAnswerState(isCorrect ? 'correct' : 'incorrect');
    setResults([...results, { question: currentQuestion, userAnswer: answer, isCorrect }]);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setAnswerState('unanswered');
      setShowHint(false);
    } else {
      setShowResults(true);
    }
  };

  const handleRestart = () => {
    setQuestions(shuffleQuestions(category.questions));
    setCurrentIndex(0);
    setUserAnswer('');
    setAnswerState('unanswered');
    setResults([]);
    setShowResults(false);
    setShowHint(false);
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
              Try Again
            </button>
            <Link
              to="/quiz"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 text-brown-800 dark:text-white rounded-xl font-semibold border-2 border-coral-200 dark:border-ocean-600 hover:bg-coral-50 dark:hover:bg-slate-600 transition-all"
            >
              Other Quizzes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link
                to="/quiz"
                className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{category.icon}</span>
                <h1 className="text-lg font-semibold text-brown-800 dark:text-white">
                  {category.title}
                </h1>
              </div>
            </div>
            <div className="text-sm font-medium text-brown-600 dark:text-gray-400">
              {currentIndex + 1} / {questions.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6">
        {currentQuestion && (
          <>
            {/* Question */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
                <span className="text-xs font-medium text-brown-500 dark:text-gray-400 uppercase tracking-wide">
                  {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' : 
                   currentQuestion.type === 'type_answer' ? 'Type Your Answer' : 'Fill in the Blank'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-brown-800 dark:text-white leading-relaxed">
                {currentQuestion.question}
              </h2>
              
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
            <div className="flex-1">
              {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                <div className="grid grid-cols-1 gap-3">
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
                        className={`p-4 rounded-xl text-left transition-all ${buttonClass} ${
                          answerState === 'unanswered' ? 'active:scale-98' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-coral-100 dark:bg-ocean-900/50 flex items-center justify-center text-sm font-bold text-coral-600 dark:text-ocean-400">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="font-medium text-brown-800 dark:text-white">
                            {option}
                          </span>
                          {answerState !== 'unanswered' && isCorrectOption && (
                            <Check className="w-5 h-5 text-green-600 dark:text-green-400 ml-auto" />
                          )}
                          {answerState !== 'unanswered' && isSelected && !isCorrectOption && (
                            <X className="w-5 h-5 text-red-600 dark:text-red-400 ml-auto" />
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
                    <button
                      onClick={() => handleAnswer(userAnswer)}
                      disabled={!userAnswer.trim()}
                      className="w-full py-3 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all active:scale-98"
                    >
                      Submit Answer
                    </button>
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
              <div className="mt-6 space-y-4">
                {currentQuestion.explanation && (
                  <div className={`p-4 rounded-xl ${
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
                  className="w-full py-4 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-98"
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
  );
}

