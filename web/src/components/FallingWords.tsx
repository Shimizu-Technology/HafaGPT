import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, Heart, Settings2, Play, Sparkles, BookOpen, Pause, RotateCcw } from 'lucide-react';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';
import { useDictionaryFlashcards } from '../hooks/useFlashcardsQuery';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';
import { GamePage, GamePageHeader } from './games/GamePage';

interface GameSettings {
  category: string;
  mode: 'beginner' | 'challenge';
}

interface FallingWordData {
  id: number;
  chamorro: string;
  english: string;
  y: number; // 0-100 percentage from top
  speed: number; // pixels per frame
}

const categoryIcons: Record<string, string> = {
  greetings: '👋',
  family: '👨‍👩‍👧‍👦',
  numbers: '🔢',
  colors: '🎨',
  food: '🍽️',
  animals: '🐕',
  body: '💪',
  nature: '🌺',
  places: '🏝️',
  time: '⏰',
  verbs: '🏃',
  phrases: '💬',
  'common-phrases': '📚',
};

const categoryDisplayNames: Record<string, string> = {
  greetings: 'Greetings',
  family: 'Family',
  numbers: 'Numbers',
  colors: 'Colors',
  food: 'Food',
  animals: 'Animals',
  body: 'Body',
  nature: 'Nature',
  places: 'Places',
  time: 'Time',
  verbs: 'Verbs',
  phrases: 'Phrases',
  'common-phrases': 'Common',
};

const CURATED_CATEGORIES = Object.keys(DEFAULT_FLASHCARD_DECKS);

// Game constants
const INITIAL_SPEED = 0.15; // Starting fall speed (slower for better playability)
const SPEED_INCREMENT = 0.03; // Speed increase per level (gentler progression)
const WORDS_PER_LEVEL = 5; // Words to clear for speed increase
const MAX_LIVES = 3;
const ANSWER_OPTIONS = 4;
const WIN_WORDS = 30; // Complete 30 words to win!

export function FallingWords() {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const hasSavedRef = useRef(false);
  const { data: categoriesData, isLoading: categoriesLoading } = useVocabularyCategories();
  const { canUse, tryUse, getCount, getLimit } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'paused' | 'complete'>('setup');
  const [settings, setSettings] = useState<GameSettings>({
    category: 'greetings',
    mode: 'beginner',
  });

  // Active game data
  const [currentWord, setCurrentWord] = useState<FallingWordData | null>(null);
  const [answerOptions, setAnswerOptions] = useState<string[]>([]);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(INITIAL_SPEED);
  const [level, setLevel] = useState(1);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [usedWordIndices, setUsedWordIndices] = useState<Set<number>>(new Set());

  // Animation refs
  const animationRef = useRef<number | null>(null);
  const wordIdRef = useRef(0);

  // Fetch flashcards data
  const { data: flashcardsData, isLoading: flashcardsLoading } = useDictionaryFlashcards(
    settings.category,
    50,
    true,
    settings.mode === 'challenge'
  );

  // Get curated flashcards for beginner mode
  const curatedFlashcards = useMemo(() => {
    if (settings.mode !== 'beginner') return null;
    const deck = DEFAULT_FLASHCARD_DECKS[settings.category];
    if (!deck) return null;
    return deck.cards.map(card => ({
      front: card.front,
      back: card.back,
    }));
  }, [settings.category, settings.mode]);

  // Available categories based on mode
  const availableCategories = useMemo(() => {
    if (settings.mode === 'beginner') {
      return CURATED_CATEGORIES;
    }
    return categoriesData?.categories.map(c => c.id) || [];
  }, [settings.mode, categoriesData]);

  // Word pool for the game
  const wordPool = useMemo(() => {
    const sourceCards = settings.mode === 'beginner'
      ? curatedFlashcards
      : flashcardsData?.cards;

    if (!sourceCards || sourceCards.length < ANSWER_OPTIONS) {
      return [];
    }

    return sourceCards.map(card => ({
      chamorro: card.front,
      english: card.back,
    }));
  }, [settings.mode, curatedFlashcards, flashcardsData]);

  // Generate a new falling word with answer options
  const generateNewWord = useCallback(() => {
    if (wordPool.length < ANSWER_OPTIONS) return;

    // Get available words (exclude already used words)
    const availableIndices = wordPool
      .map((_, index) => index)
      .filter(index => !usedWordIndices.has(index));

    // If we've used all words, reset and start fresh
    if (availableIndices.length === 0) {
      setUsedWordIndices(new Set());
      // Pick from full pool
      const randomIndex = Math.floor(Math.random() * wordPool.length);
      const word = wordPool[randomIndex];
      setUsedWordIndices(new Set([randomIndex]));
      
      // Generate wrong answers
      const wrongAnswers: string[] = [];
      const usedForAnswers = new Set([randomIndex]);
      while (wrongAnswers.length < ANSWER_OPTIONS - 1 && usedForAnswers.size < wordPool.length) {
        const wrongIndex = Math.floor(Math.random() * wordPool.length);
        if (!usedForAnswers.has(wrongIndex)) {
          usedForAnswers.add(wrongIndex);
          wrongAnswers.push(wordPool[wrongIndex].english);
        }
      }
      
      const options = [word.english, ...wrongAnswers].sort(() => Math.random() - 0.5);
      wordIdRef.current += 1;
      setCurrentWord({
        id: wordIdRef.current,
        chamorro: word.chamorro,
        english: word.english,
        y: 0,
        speed: currentSpeed,
      });
      setAnswerOptions(options);
      setFeedback(null);
      return;
    }

    // Pick a random word from available (unused) words
    const randomAvailableIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    const word = wordPool[randomAvailableIndex];

    // Mark this word as used
    setUsedWordIndices(prev => new Set([...prev, randomAvailableIndex]));

    // Generate wrong answers (can use any word from pool)
    const wrongAnswers: string[] = [];
    const usedForAnswers = new Set([randomAvailableIndex]);
    while (wrongAnswers.length < ANSWER_OPTIONS - 1 && usedForAnswers.size < wordPool.length) {
      const wrongIndex = Math.floor(Math.random() * wordPool.length);
      if (!usedForAnswers.has(wrongIndex)) {
        usedForAnswers.add(wrongIndex);
        wrongAnswers.push(wordPool[wrongIndex].english);
      }
    }

    // Shuffle answer options
    const options = [word.english, ...wrongAnswers].sort(() => Math.random() - 0.5);

    wordIdRef.current += 1;
    setCurrentWord({
      id: wordIdRef.current,
      chamorro: word.chamorro,
      english: word.english,
      y: 0,
      speed: currentSpeed,
    });
    setAnswerOptions(options);
    setFeedback(null);
  }, [wordPool, currentSpeed, usedWordIndices]);

  // Handle answer selection
  const handleAnswer = useCallback((answer: string) => {
    if (!currentWord || feedback) return;

    const isCorrect = answer === currentWord.english;

    if (isCorrect) {
      setFeedback('correct');
      const streakBonus = streak * 25;
      setScore(prev => prev + 100 + streakBonus);
      setStreak(prev => prev + 1);
      setWordsCompleted(prev => {
        const newCount = prev + 1;
        
        // WIN CONDITION: Complete 30 words to win!
        if (newCount >= WIN_WORDS) {
          setTimeout(() => setGameState('complete'), 300);
          return newCount;
        }
        
        // Level up every WORDS_PER_LEVEL words
        if (newCount % WORDS_PER_LEVEL === 0) {
          setLevel(l => l + 1);
          setCurrentSpeed(s => s + SPEED_INCREMENT);
        }
        return newCount;
      });

      // Quick transition to next word (only if not won)
      setTimeout(() => {
        if (wordsCompleted + 1 < WIN_WORDS) {
          generateNewWord();
        }
      }, 300);
    } else {
      setFeedback('wrong');
      setStreak(0);
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState('complete');
        }
        return newLives;
      });

      // Longer delay for wrong answer
      setTimeout(() => {
        if (lives > 1) {
          generateNewWord();
        }
      }, 500);
    }
  }, [currentWord, feedback, streak, lives, generateNewWord]);

  // Animation loop
  useEffect(() => {
    if (gameState !== 'playing' || !currentWord) return;

    const animate = () => {
      setCurrentWord(prev => {
        if (!prev) return null;

        const newY = prev.y + prev.speed;

        // Word hit bottom - lose a life
        if (newY >= 85) {
          setFeedback('wrong');
          setStreak(0);
          setLives(l => {
            const newLives = l - 1;
            if (newLives <= 0) {
              setGameState('complete');
            }
            return newLives;
          });

          setTimeout(() => {
            if (lives > 1) {
              generateNewWord();
            }
          }, 500);

          return null;
        }

        return { ...prev, y: newY };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, currentWord?.id, lives, generateNewWord]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing' && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, startTime]);

  // Save game result when complete
  useEffect(() => {
    if (gameState === 'complete' && isSignedIn && !hasSavedRef.current && wordsCompleted > 0) {
      hasSavedRef.current = true;
      const stars = wordsCompleted >= 10 ? 3 : wordsCompleted >= 5 ? 2 : 1;
      saveGameResultMutation.mutate({
        game_type: 'falling_words',
        mode: settings.mode,
        category_id: settings.category,
        score,
        moves: wordsCompleted,
        pairs: level,
        time_seconds: elapsedTime,
        stars,
      });
    }
  }, [gameState, isSignedIn, wordsCompleted, score, level, elapsedTime, settings, saveGameResultMutation]);

  // Start game
  const startGame = useCallback(async () => {
    // Check usage limits before starting (only for signed-in users)
    if (isSignedIn) {
      if (!canUse('game')) {
        setShowUpgradePrompt(true);
        return;
      }
      const allowed = await tryUse('game');
      if (!allowed) {
        setShowUpgradePrompt(true);
        return;
      }
    }
    
    if (wordPool.length < ANSWER_OPTIONS) {
      alert('Not enough words in this category. Please try another category.');
      return;
    }
    hasSavedRef.current = false;
    setLives(MAX_LIVES);
    setScore(0);
    setStreak(0);
    setWordsCompleted(0);
    setCurrentSpeed(INITIAL_SPEED);
    setLevel(1);
    setStartTime(Date.now());
    setElapsedTime(0);
    setFeedback(null);
    setUsedWordIndices(new Set()); // Reset used words for new game
    setGameState('playing');
    generateNewWord();
  }, [wordPool, generateNewWord, isSignedIn, canUse, tryUse]);

  // Reset to setup
  const resetGame = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setGameState('setup');
    setCurrentWord(null);
    setAnswerOptions([]);
  };

  // Play again
  const playAgain = () => {
    startGame();
  };

  // Pause/Resume
  const togglePause = () => {
    if (gameState === 'playing') {
      setGameState('paused');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  };

  const handleBack = () => {
    if ((gameState === 'playing' || gameState === 'paused') && !window.confirm('Leave game? Your progress will be lost.')) {
      return;
    }
    navigate('/games');
  };

  const isLoading = settings.mode === 'challenge' ? flashcardsLoading : false;
  const hasEnoughWords = wordPool.length >= ANSWER_OPTIONS;

  // Calculate stars for display
  // Star rating based on words caught (more reasonable thresholds)
  const getStars = () => {
    if (wordsCompleted >= WIN_WORDS) return 3; // Won the game!
    if (wordsCompleted >= 15) return 3; // Great performance
    if (wordsCompleted >= 8) return 2;  // Good performance
    return 1; // Keep trying!
  };

  if (categoriesLoading) {
    return (
      <GamePage>
        <GamePageHeader title="Falling Words" subtitle="Choose the translation before the word reaches the bottom." icon={ArrowDown} />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-coral-600 border-t-transparent dark:border-teal-500 dark:border-t-transparent" />
          <p className="text-brown-600 dark:text-gray-400">Loading games...</p>
        </div>
      </GamePage>
    );
  }

  return (
    <GamePage>
      <GamePageHeader
        title="Falling Words"
        subtitle={gameState === 'setup' ? 'Choose the translation before the word reaches the bottom.' : `Level ${level} · ${score} points`}
        icon={ArrowDown}
        onBack={handleBack}
        trailing={(gameState === 'playing' || gameState === 'paused') ? (
          <>
            <button type="button" onClick={togglePause} className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-600 hover:bg-cream-100 dark:text-gray-300 dark:hover:bg-slate-700" aria-label={gameState === 'paused' ? 'Resume game' : 'Pause game'}>
              {gameState === 'paused' ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
            </button>
            <button type="button" onClick={() => { if (window.confirm('Change settings? Your progress will be lost.')) resetGame(); }} className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-600 hover:bg-cream-100 dark:text-gray-300 dark:hover:bg-slate-700" aria-label="Change game settings">
              <Settings2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : undefined}
      />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="max-w-md mx-auto space-y-3 sm:space-y-4">
            {/* Mode Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg border border-cream-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-brown-800 dark:text-white mb-2">Choose Mode</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSettings((s) => ({
                    ...s,
                    mode: 'beginner',
                    category: CURATED_CATEGORIES.includes(s.category) ? s.category : 'greetings'
                  }))}
                  aria-pressed={settings.mode === 'beginner'}
                  className={`
                    p-2 sm:p-3 rounded-xl text-center transition-all duration-200
                    ${settings.mode === 'beginner'
                      ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg scale-[1.02]'
                      : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                    }
                  `}
                >
                  <Sparkles className={`w-5 h-5 mx-auto mb-1 ${settings.mode === 'beginner' ? 'text-white' : 'text-amber-500'}`} />
                  <span className="text-xs sm:text-sm font-bold block">Beginner</span>
                  <span className={`text-[9px] sm:text-[10px] ${settings.mode === 'beginner' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>Common phrases</span>
                </button>
                <button
                  onClick={() => setSettings((s) => ({ ...s, mode: 'challenge' }))}
                  aria-pressed={settings.mode === 'challenge'}
                  className={`
                    p-2 sm:p-3 rounded-xl text-center transition-all duration-200
                    ${settings.mode === 'challenge'
                      ? 'bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white shadow-lg scale-[1.02]'
                      : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                    }
                  `}
                >
                  <BookOpen className={`w-5 h-5 mx-auto mb-1 ${settings.mode === 'challenge' ? 'text-white' : 'text-coral-500 dark:text-teal-400'}`} />
                  <span className="text-xs sm:text-sm font-bold block">Challenge</span>
                  <span className={`text-[9px] sm:text-[10px] ${settings.mode === 'challenge' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>Full dictionary</span>
                </button>
              </div>
            </div>

            {/* Category Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg border border-cream-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-brown-800 dark:text-white mb-2">Choose Topic</h3>
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Choose a topic">
                {availableCategories.map((catId) => (
                  <button
                    key={catId}
                    onClick={() => setSettings((s) => ({ ...s, category: catId }))}
                    aria-pressed={settings.category === catId}
                    className={`
                      min-w-20 flex-none p-2 rounded-xl text-center transition-all duration-200
                      ${settings.category === catId
                        ? 'bg-coral-500 dark:bg-ocean-500 text-white shadow-lg scale-105'
                        : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                      }
                    `}
                  >
                    <span className="text-base sm:text-lg block">{categoryIcons[catId] || '📚'}</span>
                    <span className="text-[8px] sm:text-[10px] font-medium capitalize leading-tight block mt-0.5">
                      {categoryDisplayNames[catId] || catId}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* How to Play */}
            <details className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <summary className="cursor-pointer text-sm font-bold text-brown-800 dark:text-white">How to play</summary>
              <ul className="mt-3 space-y-1.5 text-xs text-brown-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-coral-500 dark:text-teal-400">⬇️</span> Words fall from the top
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Tap the correct English translation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">❤️</span> You have 3 lives - don't miss!
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-500">⚡</span> Speed increases every 5 words
                </li>
              </ul>
            </details>

            {/* Start Button */}
            <button
              onClick={startGame}
              disabled={isLoading || !hasEnoughWords}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral-600 px-4 font-bold text-white transition-colors hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </>
              ) : !hasEnoughWords ? (
                'Not enough words'
              ) : (
                <>
                  <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                  Start Game
                </>
              )}
            </button>
          </div>
        )}

        {/* Playing Screen */}
        {(gameState === 'playing' || gameState === 'paused') && (
          <div className="relative">
            {/* Stats Bar */}
            <div className="flex items-center justify-between mb-3 sm:mb-4 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg border border-cream-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                {/* Lives */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: MAX_LIVES }).map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-5 h-5 sm:w-6 sm:h-6 ${
                        i < lives ? 'text-red-500 fill-red-500' : 'text-brown-200 dark:text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-coral-500 dark:text-teal-400">{score}</p>
                  <p className="text-[10px] text-brown-500 dark:text-gray-400">Score</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white">{streak}🔥</p>
                  <p className="text-[10px] text-brown-500 dark:text-gray-400">Streak</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white">{wordsCompleted}/{WIN_WORDS}</p>
                  <p className="text-[10px] text-brown-500 dark:text-gray-400">Words</p>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-3 sm:mb-4">
              <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-coral-400 to-coral-500 dark:from-teal-400 dark:to-teal-500 transition-all duration-300"
                  style={{ width: `${(wordsCompleted / WIN_WORDS) * 100}%` }}
                />
              </div>
              <p className="text-center text-[10px] text-brown-500 dark:text-gray-400 mt-1">
                Catch {WIN_WORDS} words to win!
              </p>
            </div>

            {/* Game Area */}
            <div className="relative bg-gradient-to-b from-cream-100 to-cream-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-cream-300 dark:border-slate-600 h-[50vh] sm:h-[55vh] overflow-hidden shadow-inner">
              {/* Falling Word */}
              {currentWord && (
                <div
                  className={`
                    absolute left-1/2 -translate-x-1/2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl
                    text-lg sm:text-2xl font-bold text-white shadow-xl
                    transition-colors duration-200
                    ${feedback === 'correct' ? 'bg-green-500' : feedback === 'wrong' ? 'bg-red-500' : 'bg-coral-500 dark:bg-ocean-500'}
                  `}
                  style={{
                    top: `${currentWord.y}%`,
                    transition: 'background-color 0.2s',
                  }}
                >
                  {currentWord.chamorro}
                </div>
              )}

              {/* Danger Zone */}
              <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-gradient-to-t from-red-500/30 to-transparent border-t-2 border-red-500/50 border-dashed" />

              {/* Paused Overlay */}
              {gameState === 'paused' && (
                <div className="absolute inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center z-10">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white mb-4">Paused</p>
                    <button
                      onClick={togglePause}
                      className="px-6 py-3 rounded-xl bg-coral-500 dark:bg-ocean-500 text-white font-bold hover:bg-coral-600 dark:hover:bg-ocean-600 transition-colors"
                    >
                      Resume
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Answer Buttons */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3 sm:mt-4">
              {answerOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  disabled={!!feedback || gameState === 'paused'}
                  className={`
                    py-3 sm:py-4 px-3 rounded-xl font-bold text-sm sm:text-base
                    transition-all duration-200 active:scale-95 shadow-md
                    ${feedback && option === currentWord?.english
                      ? 'bg-green-500 text-white'
                      : feedback === 'wrong' && option !== currentWord?.english
                        ? 'bg-cream-200 dark:bg-slate-700 text-brown-400 dark:text-gray-500'
                        : 'bg-white dark:bg-slate-700 text-brown-800 dark:text-white hover:bg-cream-100 dark:hover:bg-slate-600 border border-cream-200 dark:border-slate-600'
                    }
                    disabled:cursor-not-allowed
                  `}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Complete Screen */}
        {gameState === 'complete' && (
          <div className="max-w-sm mx-auto text-center space-y-4 sm:space-y-6">
            {/* Game Over */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-gradient-to-br from-coral-100 to-coral-200 dark:from-teal-950/50 dark:to-teal-800/50 flex items-center justify-center shadow-xl">
                <span className="text-4xl sm:text-5xl">
                  {wordsCompleted >= WIN_WORDS ? '🎉' : wordsCompleted >= 10 ? '🏆' : wordsCompleted >= 5 ? '⭐' : '👍'}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-1">
                {wordsCompleted >= WIN_WORDS ? 'You Won! 🎊' : wordsCompleted >= 10 ? 'Amazing!' : wordsCompleted >= 5 ? 'Great Job!' : 'Nice Try!'}
              </h2>
              <p className="text-brown-600 dark:text-gray-400">
                {wordsCompleted >= WIN_WORDS 
                  ? `Perfect! You caught all ${WIN_WORDS} words!` 
                  : `You caught ${wordsCompleted} words!`}
              </p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-3xl sm:text-4xl ${i < getStars() ? 'animate-bounce' : 'opacity-30'}`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  ⭐
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-cream-200 dark:border-slate-700">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-coral-500 dark:text-teal-400">{score}</p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Score</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white">{wordsCompleted}</p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Words</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white">Lv.{level}</p>
                  <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">Level</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={playAgain}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                Play Again
              </button>
              <button
                onClick={resetGame}
                className="flex-1 py-3 px-4 rounded-xl bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 font-bold hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
                Settings
              </button>
            </div>

            <Link
              to="/games"
              className="inline-block text-coral-500 dark:text-teal-400 hover:text-coral-600 dark:hover:text-teal-300 hover:underline font-medium text-sm"
            >
              ← Back to Games
            </Link>
          </div>
        )}
      </main>

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <UpgradePrompt
          feature="game"
          onClose={() => setShowUpgradePrompt(false)}
          usageCount={getCount('game')}
          usageLimit={getLimit('game')}
        />
      )}
    </GamePage>
  );
}
