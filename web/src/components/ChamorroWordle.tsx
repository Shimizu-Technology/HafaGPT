import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, RotateCcw, Calendar, Shuffle, Share2, Sparkles, BookOpen, Grid3X3, Trophy, Star } from 'lucide-react';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';
import { WordleKeyboard } from './games/WordleKeyboard';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';
import { useDictionaryFlashcards } from '../hooks/useFlashcardsQuery';
import { browserStorage } from '../lib/browserStorage';
import { GamePage, GamePageHeader } from './games/GamePage';

// Curated words organized by length
const CURATED_WORDS = {
  // 4-letter words (Easy)
  4: [
    { word: 'TÅNO', meaning: 'land/earth' },
    { word: 'NÅNA', meaning: 'mother' },
    { word: 'TÅTA', meaning: 'father' },
    { word: 'HÅFA', meaning: 'what/hello' },
    { word: 'ADAI', meaning: 'greeting word' },
    { word: 'EGGA', meaning: 'watch/see' },
    { word: 'GUMA', meaning: 'house' },
    { word: 'NENI', meaning: 'baby' },
    { word: 'LÅHI', meaning: 'male/son' },
    { word: 'HÅGA', meaning: 'daughter' },
    { word: 'LAGU', meaning: 'north' },
    { word: 'TASI', meaning: 'sea/ocean' },
  ],
  // 5-letter words (Medium)
  5: [
    { word: 'HÅNOM', meaning: 'water' },
    { word: 'GUÅFI', meaning: 'fire' },  // Moved from 4-letter list (actually 5 letters)
    { word: 'NIYOK', meaning: 'coconut palm' },
    { word: 'KÅDDO', meaning: 'soup/broth' },
    { word: 'KÅTNE', meaning: 'meat' },
    { word: 'HUGUA', meaning: 'two' },
    { word: 'SAGAN', meaning: 'place' },
    { word: 'LEMÅI', meaning: 'breadfruit' },
    { word: 'PUGUA', meaning: 'betel nut' },
    { word: 'GIMEN', meaning: 'drink' },
    { word: 'MAIGO', meaning: 'sleep' },
    { word: 'HÅNAO', meaning: 'go' },
    { word: 'FATTO', meaning: 'come' },
    { word: 'TUNGO', meaning: 'know' },
    { word: 'PALÅO', meaning: 'woman' },
    { word: 'TÅTTE', meaning: 'back/behind' },
  ],
  // 6-letter words (Hard)
  6: [
    { word: 'PÅTGON', meaning: 'child' },
    { word: 'LALÅHI', meaning: 'man/male' },
    { word: 'BUNITA', meaning: 'beautiful' },
    { word: 'DIKIKE', meaning: 'small' },
    { word: 'MÅNGGA', meaning: 'mango' },
    { word: 'GOLLAI', meaning: 'vegetables' },
    { word: 'CHOCHO', meaning: 'eat' },
    { word: 'MAPÅGA', meaning: 'awake' },
    { word: 'NÅLANG', meaning: 'hungry' },
    { word: "CHE'LU", meaning: 'sibling' },
    { word: 'MAOLEK', meaning: 'good/well' },
    { word: 'ASAINA', meaning: 'owner/lord' },
    { word: 'GUÅHAN', meaning: 'Guam' },
    { word: 'TÅOTAO', meaning: 'person' },
  ],
};

// Daily words (5-letter only for consistency)
const DAILY_WORDS = CURATED_WORDS[5];

type Difficulty = 'easy' | 'medium' | 'hard';
type WordMode = 'beginner' | 'challenge';
type GameMode = 'daily' | 'practice';
type LetterState = 'correct' | 'present' | 'absent' | 'empty';

interface WordEntry {
  word: string;
  meaning: string;
}

interface GuessResult {
  letter: string;
  state: LetterState;
}

const DIFFICULTY_CONFIG = {
  easy: { length: 4, label: 'Easy', description: '4 letters' },
  medium: { length: 5, label: 'Medium', description: '5 letters' },
  hard: { length: 6, label: 'Hard', description: '6 letters' },
};

// Get word for a specific date (daily challenge - always 5 letters)
const getDailyWord = (): WordEntry => {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const diff = today.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_WORDS[dayOfYear % DAILY_WORDS.length];
};

const MAX_ATTEMPTS = 6;

export function ChamorroWordle() {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const hasSavedRef = useRef(false);
  const transitionTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const { canUse, tryUse, getCount, getLimit } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Settings state
  const [wordMode, setWordMode] = useState<WordMode>('beginner');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [category, setCategory] = useState<string>('greetings');

  // Game state
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'won' | 'lost'>('setup');
  const [gameMode, setGameMode] = useState<GameMode>('practice');
  const [targetWord, setTargetWord] = useState<WordEntry | null>(null);
  const [guesses, setGuesses] = useState<GuessResult[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [currentRow, setCurrentRow] = useState(0);
  const [letterStates, setLetterStates] = useState<Record<string, 'correct' | 'present' | 'absent' | 'unused'>>({});
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 120);
    return () => window.clearTimeout(timer);
  }, [gameState]);

  const clearTransitionTimers = useCallback(() => {
    transitionTimersRef.current.forEach(timer => clearTimeout(timer));
    transitionTimersRef.current.clear();
  }, []);

  const scheduleTransition = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      transitionTimersRef.current.delete(timer);
      callback();
    }, delay);
    transitionTimersRef.current.add(timer);
  }, []);

  useEffect(() => clearTransitionTimers, [clearTransitionTimers]);

  // Fetch categories for challenge mode
  const { data: categories } = useVocabularyCategories();
  const { data: dictionaryWords } = useDictionaryFlashcards(
    wordMode === 'challenge' ? category : ''
  );

  // Get word length based on difficulty
  const wordLength = targetWord?.word.length || DIFFICULTY_CONFIG[difficulty].length;

  // Check if daily challenge was already played today
  const dailyKey = `wordle-daily-${new Date().toDateString()}`;
  const dailyPlayed = typeof window !== 'undefined' && browserStorage.get(dailyKey);

  // Get available words based on mode and difficulty
  const getAvailableWords = useCallback((): WordEntry[] => {
    const targetLength = DIFFICULTY_CONFIG[difficulty].length;
    
    if (wordMode === 'beginner') {
      const curatedList = CURATED_WORDS[targetLength as keyof typeof CURATED_WORDS] || [];
      // Safety filter: ensure all words actually match the target length
      return curatedList.filter(entry => entry.word.length === targetLength);
    } else {
      // Challenge mode - filter dictionary words by length
      const cards = dictionaryWords?.cards ?? [];
      return cards
        .filter((card) => card.front.length === targetLength && !card.front.includes(' '))
        .map((card) => ({ word: card.front.toUpperCase(), meaning: card.back }));
    }
  }, [wordMode, difficulty, dictionaryWords]);

  // Start game
  const startGame = useCallback(async (selectedGameMode: GameMode) => {
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
    
    clearTransitionTimers();
    setGameMode(selectedGameMode);
    
    let word: WordEntry;
    if (selectedGameMode === 'daily') {
      word = getDailyWord();
    } else {
      const words = getAvailableWords();
      if (words.length === 0) {
        setMessage('No words available for this category/difficulty');
        return;
      }
      word = words[Math.floor(Math.random() * words.length)];
    }
    
    setTargetWord(word);
    setGuesses([]);
    setCurrentGuess('');
    setCurrentRow(0);
    setLetterStates({});
    setMessage('');
    hasSavedRef.current = false;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setGameState('playing');
  }, [getAvailableWords, isSignedIn, canUse, tryUse, clearTransitionTimers]);

  // Handle key press
  const handleKeyPress = useCallback((key: string) => {
    if (gameState !== 'playing' || !targetWord) return;
    if (currentGuess.length >= wordLength) return;
    
    setCurrentGuess(prev => prev + key.toUpperCase());
  }, [gameState, currentGuess, wordLength, targetWord]);

  // Handle backspace
  const handleBackspace = useCallback(() => {
    if (gameState !== 'playing') return;
    setCurrentGuess(prev => prev.slice(0, -1));
  }, [gameState]);

  // Check guess
  const checkGuess = useCallback((guess: string, target: string): GuessResult[] => {
    const result: GuessResult[] = [];
    const targetChars = target.split('');
    const guessChars = guess.split('');
    const targetCharCounts: Record<string, number> = {};

    // Count chars in target
    targetChars.forEach(char => {
      targetCharCounts[char] = (targetCharCounts[char] || 0) + 1;
    });

    // First pass: mark correct positions
    guessChars.forEach((char, i) => {
      if (char === targetChars[i]) {
        result[i] = { letter: char, state: 'correct' };
        targetCharCounts[char]--;
      }
    });

    // Second pass: mark present/absent
    guessChars.forEach((char, i) => {
      if (result[i]) return; // Already marked as correct
      
      if (targetCharCounts[char] && targetCharCounts[char] > 0) {
        result[i] = { letter: char, state: 'present' };
        targetCharCounts[char]--;
      } else {
        result[i] = { letter: char, state: 'absent' };
      }
    });

    return result;
  }, []);

  // Handle enter/submit
  const handleEnter = useCallback(() => {
    if (gameState !== 'playing' || !targetWord) return;
    
    if (currentGuess.length !== wordLength) {
      setShake(true);
      setMessage('Not enough letters');
      scheduleTransition(() => {
        setShake(false);
        setMessage('');
      }, 500);
      return;
    }

    const result = checkGuess(currentGuess, targetWord.word);
    const newGuesses = [...guesses, result];
    setGuesses(newGuesses);

    // Update keyboard letter states
    const newLetterStates = { ...letterStates };
    result.forEach(({ letter, state }) => {
      const currentState = newLetterStates[letter];
      // Only upgrade state (correct > present > absent > unused)
      if (state === 'correct') {
        newLetterStates[letter] = 'correct';
      } else if (state === 'present' && currentState !== 'correct') {
        newLetterStates[letter] = 'present';
      } else if (state === 'absent' && !currentState) {
        newLetterStates[letter] = 'absent';
      }
    });
    setLetterStates(newLetterStates);

    // Check win/lose
    if (currentGuess === targetWord.word) {
      setGameState('won');
      if (gameMode === 'daily') {
        browserStorage.set(dailyKey, 'true');
      }
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameState('lost');
      if (gameMode === 'daily') {
        browserStorage.set(dailyKey, 'true');
      }
    } else {
      setCurrentRow(prev => prev + 1);
    }

    setCurrentGuess('');
  }, [gameState, currentGuess, wordLength, targetWord, guesses, letterStates, checkGuess, gameMode, dailyKey, scheduleTransition]);

  // Physical keyboard support
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleEnter();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key.length === 1 && /[a-zA-ZåÅñÑ']/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleEnter, handleBackspace, handleKeyPress]);

  // Save game result
  useEffect(() => {
    if ((gameState === 'won' || gameState === 'lost') && isSignedIn && !hasSavedRef.current) {
      hasSavedRef.current = true;
      const attempts = guesses.length;
      const won = gameState === 'won';
      const stars = won ? (attempts <= 3 ? 3 : attempts <= 5 ? 2 : 1) : 0;
      
      saveGameResultMutation.mutate({
        game_type: 'chamorro_wordle',
        mode: gameMode === 'daily' ? 'daily' : wordMode,
        category_id: gameMode === 'daily' ? 'daily' : `${difficulty}-${category}`,
        score: won ? (MAX_ATTEMPTS - attempts + 1) * 100 : 0,
        moves: attempts,
        pairs: won ? 1 : 0,
        time_seconds: 0,
        stars,
      });
    }
  }, [gameState, isSignedIn, guesses, gameMode, wordMode, difficulty, category, saveGameResultMutation]);

  // Generate share text
  const generateShareText = () => {
    if (!targetWord) return '';
    
    const emojiGrid = guesses.map(row => 
      row.map(({ state }) => {
        if (state === 'correct') return '🟩';
        if (state === 'present') return '🟨';
        return '⬜';
      }).join('')
    ).join('\n');

    return `HåfaGPT Wordle ${gameMode === 'daily' ? '(Daily)' : ''}\n${guesses.length}/${MAX_ATTEMPTS}\n\n${emojiGrid}`;
  };

  const handleShare = async () => {
    const text = generateShareText();
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        navigator.clipboard.writeText(text);
        setMessage('Copied to clipboard!');
        scheduleTransition(() => setMessage(''), 2000);
      }
    } else {
      navigator.clipboard.writeText(text);
      setMessage('Copied to clipboard!');
      scheduleTransition(() => setMessage(''), 2000);
    }
  };

  const handleBack = () => {
    if (gameState === 'playing' && !window.confirm('Leave game? Your progress will be lost.')) {
      return;
    }
    clearTransitionTimers();
    navigate('/games');
  };

  const headerSubtitle = gameState === 'setup'
    ? 'Guess a Chamorro word in six tries.'
    : gameMode === 'daily'
      ? 'Daily challenge · 5 letters'
      : `${DIFFICULTY_CONFIG[difficulty].label} · ${DIFFICULTY_CONFIG[difficulty].description}`;

  // Render grid cell
  const renderCell = (rowIndex: number, cellIndex: number) => {
    const guess = guesses[rowIndex];
    const isCurrentRow = rowIndex === currentRow && gameState === 'playing';
    
    let content = '';
    let state: LetterState = 'empty';

    if (guess) {
      content = guess[cellIndex]?.letter || '';
      state = guess[cellIndex]?.state || 'empty';
    } else if (isCurrentRow) {
      content = currentGuess[cellIndex] || '';
    }

    const stateStyles = {
      correct: 'bg-green-500 text-white border-green-500',
      present: 'bg-yellow-500 text-white border-yellow-500',
      absent: 'bg-gray-400 dark:bg-gray-600 text-white border-gray-400 dark:border-gray-600',
      empty: 'bg-white dark:bg-slate-800 border-cream-300 dark:border-slate-600',
    };

    return (
      <div
        key={cellIndex}
        className={`
          w-12 h-12 sm:w-14 sm:h-14 
          border-2 rounded-lg
          flex items-center justify-center
          font-bold text-xl sm:text-2xl
          transition-all duration-300
          ${stateStyles[state]}
          ${content && state === 'empty' ? 'border-brown-400 dark:border-slate-400 scale-105' : ''}
          ${shake && isCurrentRow ? 'animate-shake' : ''}
        `}
      >
        {content}
      </div>
    );
  };

  return (
    <GamePage>
      <GamePageHeader
        title="Chamorro Wordle"
        subtitle={headerSubtitle}
        icon={Grid3X3}
        onBack={handleBack}
      />

      <main className="mx-auto max-w-xl px-3 py-4 sm:px-4 sm:py-6">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="space-y-4 sm:space-y-5">

            {/* Daily Challenge */}
            <button
              type="button"
              onClick={() => startGame('daily')}
              disabled={!!dailyPlayed}
              className={`
                w-full p-4 rounded-2xl text-left transition-all
                ${dailyPlayed 
                  ? 'bg-cream-100 dark:bg-slate-800 opacity-60 cursor-not-allowed'
                  : 'bg-white dark:bg-slate-800 hover:shadow-lg hover:scale-[1.02] shadow-md border border-cream-200 dark:border-slate-700'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral-100 dark:bg-teal-950/50">
                  <Calendar className="h-6 w-6 text-coral-600 dark:text-teal-300" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-brown-800 dark:text-white">Daily Challenge</h3>
                  <p className="text-sm text-brown-500 dark:text-gray-400">
                    {dailyPlayed ? 'Already played today!' : '5-letter word • Same for everyone'}
                  </p>
                </div>
                {!dailyPlayed && <Play className="h-5 w-5 text-coral-500 dark:text-teal-300" aria-hidden="true" />}
              </div>
            </button>

            {/* Practice Mode Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md border border-cream-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Shuffle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-brown-800 dark:text-white">Practice Mode</h3>
                  <p className="text-xs text-brown-500 dark:text-gray-400">Customize your practice</p>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-brown-700 dark:text-gray-300 mb-2">Choose Mode</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWordMode('beginner')}
                    aria-pressed={wordMode === 'beginner'}
                    className={`p-3 rounded-xl text-center transition-all ${
                      wordMode === 'beginner'
                        ? 'bg-amber-500 text-white shadow-lg'
                        : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <Sparkles className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Beginner</span>
                    <p className="text-xs opacity-80">Common words</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWordMode('challenge')}
                    aria-pressed={wordMode === 'challenge'}
                    className={`p-3 rounded-xl text-center transition-all ${
                      wordMode === 'challenge'
                        ? 'bg-amber-500 text-white shadow-lg'
                        : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <BookOpen className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Challenge</span>
                    <p className="text-xs opacity-80">Full dictionary</p>
                  </button>
                </div>
              </div>

              {/* Difficulty Selection */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-brown-700 dark:text-gray-300 mb-2">Difficulty</h4>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setDifficulty(d)}
                      aria-pressed={difficulty === d}
                      className={`p-2 rounded-xl text-center transition-all ${
                        difficulty === d
                          ? 'bg-teal-600 text-white shadow-lg'
                          : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <span className="text-sm font-medium">{DIFFICULTY_CONFIG[d].label}</span>
                      <p className="text-xs opacity-80">{DIFFICULTY_CONFIG[d].description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selection (Challenge mode only) */}
              {wordMode === 'challenge' && categories && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-brown-700 dark:text-gray-300 mb-2">Category</h4>
                  <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Choose a category">
                    {categories.categories.map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        aria-pressed={category === cat.id}
                        className={`min-h-11 flex-none rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                          category === cat.id
                            ? 'bg-coral-600 text-white dark:bg-teal-600'
                            : 'bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-400 hover:bg-cream-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {cat.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Practice Button */}
              <button
                type="button"
                onClick={() => startGame('practice')}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral-600 px-4 font-bold text-white transition-colors hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700"
              >
                <Play className="w-5 h-5" />
                Start Practice
              </button>
            </div>

            <details className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <summary className="cursor-pointer font-bold text-brown-800 dark:text-white">How to play</summary>
              <ol className="mb-4 mt-4 space-y-2 text-sm text-brown-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral-100 text-xs font-bold text-coral-700 dark:bg-teal-950/50 dark:text-teal-300">1</span>
                  <span>Type any Chamorro word (same length as the answer)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral-100 text-xs font-bold text-coral-700 dark:bg-teal-950/50 dark:text-teal-300">2</span>
                  <span>Press <strong>Enter ↵</strong> to submit your guess</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral-100 text-xs font-bold text-coral-700 dark:bg-teal-950/50 dark:text-teal-300">3</span>
                  <span>Colors show how close you are - use them to guess again!</span>
                </li>
              </ol>

              {/* Color legend */}
              <div className="flex justify-center gap-2 mb-3">
                <div className="w-10 h-10 bg-green-500 text-white rounded flex items-center justify-center font-bold">H</div>
                <div className="w-10 h-10 bg-yellow-500 text-white rounded flex items-center justify-center font-bold">Å</div>
                <div className="w-10 h-10 bg-gray-400 text-white rounded flex items-center justify-center font-bold">F</div>
                <div className="w-10 h-10 bg-gray-400 text-white rounded flex items-center justify-center font-bold">A</div>
              </div>
              <ul className="space-y-1 text-center text-xs text-brown-500 dark:text-gray-400">
                <li><strong>Green</strong> = Right letter, right spot</li>
                <li><strong>Yellow</strong> = Right letter, wrong spot</li>
                <li><strong>Gray</strong> = Not in word</li>
              </ul>
              
              <p className="text-xs text-center text-brown-400 dark:text-gray-500 mt-3">
                You have <strong>6 tries</strong> to guess the word!
              </p>
            </details>
          </div>
        )}

        {/* Playing Screen */}
        {gameState === 'playing' && targetWord && (
          <div className="flex flex-col items-center gap-4 sm:gap-6">
            {/* Message */}
            {message && (
              <div className="text-center text-brown-600 dark:text-gray-400 font-medium animate-pulse">
                {message}
              </div>
            )}

            {/* Grid */}
            <div className="flex flex-col gap-1.5 sm:gap-2">
              {Array.from({ length: MAX_ATTEMPTS }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-1.5 sm:gap-2">
                  {Array.from({ length: wordLength }).map((_, cellIndex) => 
                    renderCell(rowIndex, cellIndex)
                  )}
                </div>
              ))}
            </div>

            {/* Enter hint - shows when word is complete */}
            {currentGuess.length === wordLength && (
              <div className="animate-pulse text-center text-sm font-medium text-coral-600 dark:text-teal-300">
                Press Enter ↵ to submit
              </div>
            )}

            {/* Keyboard */}
            <WordleKeyboard
              onKeyPress={handleKeyPress}
              onEnter={handleEnter}
              onBackspace={handleBackspace}
              letterStates={letterStates}
            />
          </div>
        )}

        {/* Win/Lose Screen */}
        {(gameState === 'won' || gameState === 'lost') && targetWord && (
          <div className="text-center space-y-4 sm:space-y-6">
            {/* Result */}
            <div>
              <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl ${gameState === 'won' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-coral-100 text-coral-700 dark:bg-slate-800 dark:text-teal-300'}`}>
                <Trophy className="h-10 w-10" aria-hidden="true" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-2">
                {gameState === 'won' ? 'Håfa Adai! You got it!' : 'Better luck next time!'}
              </h2>
              <p className="text-brown-600 dark:text-gray-400">
                The word was: <strong className="text-coral-600 dark:text-teal-300">{targetWord.word}</strong>
              </p>
              <p className="text-sm text-brown-500 dark:text-gray-500">
                Meaning: {targetWord.meaning}
              </p>
            </div>

            {/* Stats */}
            {gameState === 'won' && (
              <div className="flex justify-center gap-2">
                {Array.from({ length: 3 }).map((_, i) => {
                  const stars = guesses.length <= 3 ? 3 : guesses.length <= 5 ? 2 : 1;
                  return (
                    <Star
                      key={i}
                      className={`h-9 w-9 ${i < stars ? 'fill-amber-400 text-amber-400' : 'text-cream-300 dark:text-slate-600'}`}
                      aria-hidden="true"
                    />
                  );
                })}
              </div>
            )}

            {/* Grid Recap */}
            <div className="flex flex-col items-center gap-1">
              {guesses.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                  {row.map(({ state }, cellIndex) => (
                    <div
                      key={cellIndex}
                      className={`
                        w-8 h-8 rounded
                        ${state === 'correct' ? 'bg-green-500' : state === 'present' ? 'bg-yellow-500' : 'bg-gray-400'}
                      `}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={handleShare}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-600 px-6 font-bold text-white transition-colors hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700"
              >
                <Share2 className="w-5 h-5" />
                Share Result
              </button>
              {gameMode === 'practice' && (
                <button
                  type="button"
                  onClick={() => startGame('practice')}
                  className="px-6 py-3 rounded-xl bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 font-bold hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Play Again
                </button>
              )}
            </div>

            <button type="button" onClick={() => navigate('/games')} className="text-sm font-medium text-coral-600 hover:underline dark:text-teal-300">
              Back to games
            </button>
          </div>
        )}
      </main>

      {/* Add shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>

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
