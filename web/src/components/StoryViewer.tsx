import { useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, ChevronLeft, ChevronRight, BookOpen, HelpCircle, CheckCircle, XCircle, RotateCcw, Info } from 'lucide-react';
import { getStoryById, StoryWord, ComprehensionQuestion } from '../data/storyData';

type ViewMode = 'reading' | 'quiz' | 'results';

export function StoryViewer() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const story = getStoryById(storyId || '');

  // Reading state
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [selectedWord, setSelectedWord] = useState<StoryWord | null>(null);
  const [showCulturalNote, setShowCulturalNote] = useState(false);

  // Quiz state
  const [viewMode, setViewMode] = useState<ViewMode>('reading');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; correct: boolean }[]>([]);

  // TTS function
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES'; // Spanish for better Chamorro pronunciation
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }, []);

  if (!story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-brown-600 dark:text-gray-400 mb-4">Story not found</p>
          <Link to="/stories" className="text-coral-600 dark:text-ocean-400 hover:underline">
            Back to Stories
          </Link>
        </div>
      </div>
    );
  }

  const paragraph = story.paragraphs[currentParagraph];
  const progress = ((currentParagraph + 1) / story.paragraphs.length) * 100;
  const question = story.questions[currentQuestion];

  // Handle word tap
  const handleWordTap = (word: StoryWord) => {
    setSelectedWord(word);
  };

  // Handle paragraph navigation
  const goToPrevParagraph = () => {
    if (currentParagraph > 0) {
      setCurrentParagraph(currentParagraph - 1);
      setSelectedWord(null);
    }
  };

  const goToNextParagraph = () => {
    if (currentParagraph < story.paragraphs.length - 1) {
      setCurrentParagraph(currentParagraph + 1);
      setSelectedWord(null);
    } else {
      // Finished reading, start quiz
      setViewMode('quiz');
    }
  };

  // Handle quiz answer
  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer !== null) return; // Already answered
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    
    const isCorrect = answerIndex === question.correctAnswer;
    setAnswers([...answers, { questionId: question.id, correct: isCorrect }]);
  };

  // Handle next question
  const handleNextQuestion = () => {
    if (currentQuestion < story.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Finished quiz
      setViewMode('results');
    }
  };

  // Restart story
  const restartStory = () => {
    setCurrentParagraph(0);
    setSelectedWord(null);
    setViewMode('reading');
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAnswers([]);
  };

  // Calculate score
  const correctAnswers = answers.filter(a => a.correct).length;
  const totalQuestions = story.questions.length;
  const scorePercentage = Math.round((correctAnswers / totalQuestions) * 100);

  // Render reading mode
  const renderReading = () => (
    <>
      {/* Story Header */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-5 border border-amber-200/50 dark:border-amber-700/30 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{story.icon}</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-brown-800 dark:text-white">
              {story.title}
            </h2>
            <p className="text-sm text-brown-600 dark:text-gray-300 italic">
              {story.titleEnglish}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-brown-500 dark:text-gray-400">
              <span className={`px-2 py-0.5 rounded-full font-medium ${
                story.difficulty === 'beginner'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : story.difficulty === 'intermediate'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {story.difficulty}
              </span>
              <span>{story.readingTime} min read</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cultural Note Toggle */}
      {story.culturalNote && (
        <button
          onClick={() => setShowCulturalNote(!showCulturalNote)}
          className="w-full mb-4 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <Info className="w-4 h-4" />
          <span className="text-sm font-medium">Cultural Note</span>
          <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${showCulturalNote ? 'rotate-90' : ''}`} />
        </button>
      )}
      
      {showCulturalNote && story.culturalNote && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {story.culturalNote}
          </p>
        </div>
      )}

      {/* Reading Area */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-cream-200 dark:border-slate-700 mb-4">
        {/* Chamorro Text - Tappable Words */}
        <div className="mb-6">
          <p className="text-xs text-brown-500 dark:text-gray-400 uppercase tracking-wide mb-2 font-medium">
            Tap any word to translate
          </p>
          <div className="flex flex-wrap gap-1.5 text-lg leading-relaxed">
            {paragraph.words.map((word, idx) => (
              <button
                key={idx}
                onClick={() => handleWordTap(word)}
                className={`px-2 py-1 rounded-lg transition-all ${
                  selectedWord?.chamorro === word.chamorro
                    ? 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100 font-semibold'
                    : 'hover:bg-amber-100 dark:hover:bg-amber-900/30 text-brown-800 dark:text-white'
                }`}
              >
                {word.chamorro}
              </button>
            ))}
          </div>
        </div>

        {/* English Translation */}
        <div className="pt-4 border-t border-cream-200 dark:border-slate-700">
          <p className="text-xs text-brown-500 dark:text-gray-400 uppercase tracking-wide mb-2 font-medium">
            English Translation
          </p>
          <p className="text-brown-700 dark:text-gray-300 italic">
            {paragraph.english}
          </p>
        </div>
      </div>

      {/* Word Translation Popup */}
      {selectedWord && (
        <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-2xl p-5 mb-4 border border-amber-300 dark:border-amber-700 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {selectedWord.chamorro}
                </span>
                <button
                  onClick={() => speak(selectedWord.chamorro)}
                  className="p-1.5 rounded-lg bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors flex items-center justify-center"
                >
                  <Volume2 className="w-4 h-4 text-amber-800 dark:text-amber-200" />
                </button>
              </div>
              {selectedWord.pronunciation && (
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                  /{selectedWord.pronunciation}/
                </p>
              )}
              <p className="text-amber-900 dark:text-amber-100 font-medium">
                {selectedWord.english}
              </p>
            </div>
            <button
              onClick={() => setSelectedWord(null)}
              className="p-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-brown-500 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{currentParagraph + 1} / {story.paragraphs.length}</span>
        </div>
        <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={goToPrevParagraph}
          disabled={currentParagraph === 0}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-cream-200 dark:border-slate-700 text-brown-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cream-50 dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <button
          onClick={goToNextParagraph}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 text-white font-semibold hover:shadow-lg transition-all"
        >
          {currentParagraph < story.paragraphs.length - 1 ? (
            <>
              <span>Continue</span>
              <ChevronRight className="w-5 h-5" />
            </>
          ) : (
            <>
              <HelpCircle className="w-5 h-5" />
              <span>Take Quiz</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  // Render quiz mode
  const renderQuiz = () => (
    <>
      {/* Quiz Header */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-purple-200/50 dark:border-purple-700/30 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-brown-800 dark:text-white">
              Comprehension Check
            </h2>
            <p className="text-sm text-brown-600 dark:text-gray-300">
              Question {currentQuestion + 1} of {story.questions.length}
            </p>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-cream-200 dark:border-slate-700 mb-4">
        <h3 className="text-lg font-semibold text-brown-800 dark:text-white mb-4">
          {question.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === question.correctAnswer;
            const showResult = selectedAnswer !== null;

            return (
              <button
                key={idx}
                onClick={() => handleAnswerSelect(idx)}
                disabled={selectedAnswer !== null}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  showResult
                    ? isCorrect
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 dark:border-green-600'
                      : isSelected
                      ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-600'
                      : 'bg-cream-50 dark:bg-slate-700 border border-cream-200 dark:border-slate-600 opacity-50'
                    : 'bg-cream-50 dark:bg-slate-700 border border-cream-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    showResult
                      ? isCorrect
                        ? 'bg-green-500 text-white'
                        : isSelected
                        ? 'bg-red-500 text-white'
                        : 'bg-cream-200 dark:bg-slate-600 text-brown-600 dark:text-gray-400'
                      : 'bg-cream-200 dark:bg-slate-600 text-brown-600 dark:text-gray-400'
                  }`}>
                    {showResult && isCorrect ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : showResult && isSelected ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      String.fromCharCode(65 + idx)
                    )}
                  </span>
                  <span className={`${
                    showResult && isCorrect
                      ? 'text-green-800 dark:text-green-300 font-semibold'
                      : showResult && isSelected
                      ? 'text-red-800 dark:text-red-300'
                      : 'text-brown-700 dark:text-gray-300'
                  }`}>
                    {option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-semibold">Explanation:</span> {question.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / story.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Next Button */}
      {selectedAnswer !== null && (
        <button
          onClick={handleNextQuestion}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 dark:from-purple-600 dark:to-indigo-600 text-white font-semibold hover:shadow-lg transition-all"
        >
          {currentQuestion < story.questions.length - 1 ? (
            <>
              <span>Next Question</span>
              <ChevronRight className="w-5 h-5" />
            </>
          ) : (
            <>
              <span>See Results</span>
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      )}
    </>
  );

  // Render results
  const renderResults = () => (
    <>
      {/* Results Card */}
      <div className={`rounded-2xl p-6 mb-6 ${
        scorePercentage >= 80
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-700/30'
          : scorePercentage >= 60
          ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200/50 dark:border-amber-700/30'
          : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200/50 dark:border-red-700/30'
      }`}>
        <div className="text-center">
          <div className="text-6xl mb-4">
            {scorePercentage >= 80 ? '🎉' : scorePercentage >= 60 ? '👍' : '📚'}
          </div>
          <h2 className="text-2xl font-bold text-brown-800 dark:text-white mb-2">
            {scorePercentage >= 80 
              ? 'Excellent!' 
              : scorePercentage >= 60 
              ? 'Good Job!' 
              : 'Keep Practicing!'}
          </h2>
          <p className="text-brown-600 dark:text-gray-300 mb-4">
            You got {correctAnswers} out of {totalQuestions} questions correct
          </p>
          
          {/* Score Circle */}
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-cream-200 dark:text-slate-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${scorePercentage * 3.52} 352`}
                className={`${
                  scorePercentage >= 80
                    ? 'text-green-500'
                    : scorePercentage >= 60
                    ? 'text-amber-500'
                    : 'text-red-500'
                }`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-brown-800 dark:text-white">
                {scorePercentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={restartStory}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 text-white font-semibold hover:shadow-lg transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Read Again</span>
        </button>

        <button
          onClick={() => navigate('/stories')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-cream-200 dark:border-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-50 dark:hover:bg-slate-700 transition-colors"
        >
          <BookOpen className="w-5 h-5" />
          <span>More Stories</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between safe-area-top">
          <div className="flex items-center gap-3">
            <Link
              to="/stories"
              className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" />
              <span className="font-semibold text-brown-800 dark:text-white">
                {viewMode === 'reading' ? 'Reading' : viewMode === 'quiz' ? 'Quiz' : 'Results'}
              </span>
            </div>
          </div>

          {/* Listen to paragraph button */}
          {viewMode === 'reading' && (
            <button
              onClick={() => speak(paragraph.chamorro)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
            >
              <Volume2 className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Listen</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {viewMode === 'reading' && renderReading()}
        {viewMode === 'quiz' && renderQuiz()}
        {viewMode === 'results' && renderResults()}
      </div>
    </div>
  );
}

