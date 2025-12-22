import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, RotateCcw, Calendar, Shuffle, Share2, HelpCircle, X, Sparkles, BookOpen } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';
import { Sun, Moon } from 'lucide-react';
import { WordleKeyboard } from './games/WordleKeyboard';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';
import { useDictionaryFlashcards } from '../hooks/useFlashcardsQuery';

// Curated words organized by length
const CURATED_WORDS = {
  // 4-letter words (Easy)
  4: [
    { word: 'TÅNO', meaning: 'land/earth' },
    { word: 'GUÅFI', meaning: 'fire' },
    { word: 'NANÅ', meaning: 'mother' },
    { word: 'TÅTA', meaning: 'father' },
    { word: 'HÅFA', meaning: 'what/hello' },
    { word: 'ADAI', meaning: 'greeting word' },
    { word: 'EGGA', meaning: 'watch/see' },
    { word: 'GUMA', meaning: 'house' },
    { word: 'NENI', meaning: 'baby' },
    { word: 'LAHI', meaning: 'male' },
    { word: 'HÅGA', meaning: 'daughter' },
    { word: 'LAGU', meaning: 'north' },
  ],
  // 5-letter words (Medium)
  5: [
    { word: 'HÅNOM', meaning: 'water' },
    { word: 'MANGÅ', meaning: 'mango' },
    { word: 'GALÅI', meaning: 'vegetables' },
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
    { word: 'PATGON', meaning: 'child' },
    { word: 'LALÅHI', meaning: 'man/male' },
    { word: 'BUNITA', meaning: 'beautiful' },
    { word: 'DIKIKE', meaning: 'small' },
    { word: 'CHOCHO', meaning: 'food/eat' },
    { word: 'MAPÅGA', meaning: 'awake' },
    { word: 'NÅLANG', meaning: 'hungry' },
    { word: 'FAMAGU', meaning: 'children' },
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
  const { theme, toggleTheme } = useTheme();
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const hasSavedRef = useRef(false);
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
  const [showHelp, setShowHelp] = useState(false);
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch categories for challenge mode
  const { data: categories } = useVocabularyCategories();
  const { data: dictionaryWords } = useDictionaryFlashcards(
    wordMode === 'challenge' ? category : ''
  );

  // Get word length based on difficulty
  const wordLength = targetWord?.word.length || DIFFICULTY_CONFIG[difficulty].length;

  // Check if daily challenge was already played today
  const dailyKey = `wordle-daily-${new Date().toDateString()}`;
  const dailyPlayed = typeof window !== 'undefined' && localStorage.getItem(dailyKey);

  // Get available words based on mode and difficulty
  const getAvailableWords = useCallback((): WordEntry[] => {
    const targetLength = DIFFICULTY_CONFIG[difficulty].length;
    
    if (wordMode === 'beginner') {
      return CURATED_WORDS[targetLength as keyof typeof CURATED_WORDS] || [];
    } else {
      // Challenge mode - filter dictionary words by length
      if (!dictionaryWords) return [];
      return dictionaryWords
        .filter(card => card.front.length === targetLength && !card.front.includes(' '))
        .map(card => ({ word: card.front.toUpperCase(), meaning: card.back }));
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
    setGameState('playing');
  }, [getAvailableWords, isSignedIn, canUse, tryUse]);

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
      setTimeout(() => {
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
        localStorage.setItem(dailyKey, 'true');
      }
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameState('lost');
      if (gameMode === 'daily') {
        localStorage.setItem(dailyKey, 'true');
      }
    } else {
      setCurrentRow(prev => prev + 1);
    }

    setCurrentGuess('');
  }, [gameState, currentGuess, wordLength, targetWord, guesses, letterStates, checkGuess, gameMode, dailyKey]);

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
        setTimeout(() => setMessage(''), 2000);
      }
    } else {
      navigator.clipboard.writeText(text);
      setMessage('Copied to clipboard!');
      setTimeout(() => setMessage(''), 2000);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between safe-area-top">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/games"
              className="p-1.5 sm:p-2 -ml-1 rounded-xl hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-brown-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-brown-800 dark:text-white">
                Chamorro Wordle
              </h1>
              <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-400">
                {gameMode === 'daily' 
                  ? '📅 Daily Challenge' 
                  : `${wordMode === 'beginner' ? '🌟' : '📚'} ${DIFFICULTY_CONFIG[difficulty].label} • ${DIFFICULTY_CONFIG[difficulty].description}`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="p-1.5 sm:p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-brown-600 dark:text-gray-300" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-brown-600" />
              ) : (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-1 sm:px-4 py-4 sm:py-6">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="space-y-4 sm:space-y-6 px-2">
            {/* Title */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-ocean-900/50 dark:to-ocean-800/50 mb-3 shadow-xl">
                <span className="text-4xl sm:text-5xl">📝</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-2">
                Chamorro Wordle
              </h2>
              <p className="text-brown-600 dark:text-gray-400 text-sm">
                Guess the Chamorro word in 6 tries!
              </p>
            </div>

            {/* Daily Challenge */}
            <button
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
                <div className="w-12 h-12 rounded-xl bg-coral-100 dark:bg-ocean-900/50 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-coral-600 dark:text-ocean-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-brown-800 dark:text-white">Daily Challenge</h3>
                  <p className="text-sm text-brown-500 dark:text-gray-400">
                    {dailyPlayed ? 'Already played today!' : '5-letter word • Same for everyone'}
                  </p>
                </div>
                {!dailyPlayed && <Play className="w-5 h-5 text-coral-500 dark:text-ocean-400" />}
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
                    onClick={() => setWordMode('beginner')}
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
                    onClick={() => setWordMode('challenge')}
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
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`p-2 rounded-xl text-center transition-all ${
                        difficulty === d
                          ? 'bg-teal-500 dark:bg-ocean-500 text-white shadow-lg'
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
                  <div className="flex flex-wrap gap-2">
                    {categories.slice(0, 8).map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          category === cat.id
                            ? 'bg-coral-500 dark:bg-ocean-500 text-white'
                            : 'bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-400 hover:bg-cream-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Practice Button */}
              <button
                onClick={() => startGame('practice')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 text-white font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Practice
              </button>
            </div>

            {/* Quick How to Play */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md border border-cream-200 dark:border-slate-700">
              <h3 className="font-bold text-brown-800 dark:text-white mb-3 text-center">How to Play</h3>
              
              {/* Step by step */}
              <ol className="space-y-2 text-sm text-brown-600 dark:text-gray-400 mb-4">
                <li className="flex items-start gap-2">
                  <span className="bg-coral-100 dark:bg-ocean-900/50 text-coral-600 dark:text-ocean-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Type any Chamorro word (same length as the answer)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-coral-100 dark:bg-ocean-900/50 text-coral-600 dark:text-ocean-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Press <strong>Enter ↵</strong> to submit your guess</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-coral-100 dark:bg-ocean-900/50 text-coral-600 dark:text-ocean-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span>
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
              <ul className="space-y-1 text-xs text-brown-500 dark:text-gray-500 text-center">
                <li>🟩 <strong>Green</strong> = Right letter, right spot</li>
                <li>🟨 <strong>Yellow</strong> = Right letter, wrong spot</li>
                <li>⬜ <strong>Gray</strong> = Not in word</li>
              </ul>
              
              <p className="text-xs text-center text-brown-400 dark:text-gray-500 mt-3">
                You have <strong>6 tries</strong> to guess the word!
              </p>
            </div>
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
              <div className="text-center text-coral-500 dark:text-ocean-400 text-sm font-medium animate-pulse">
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
              <div className={`
                w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full flex items-center justify-center shadow-xl mb-4
                ${gameState === 'won' 
                  ? 'bg-gradient-to-br from-green-400 to-green-600' 
                  : 'bg-gradient-to-br from-coral-400 to-coral-600 dark:from-ocean-400 dark:to-ocean-600'
                }
              `}>
                <span className="text-4xl sm:text-5xl">
                  {gameState === 'won' ? '🎉' : '😔'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-2">
                {gameState === 'won' ? 'Håfa Adai! You got it!' : 'Better luck next time!'}
              </h2>
              <p className="text-brown-600 dark:text-gray-400">
                The word was: <strong className="text-coral-600 dark:text-ocean-400">{targetWord.word}</strong>
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
                    <span
                      key={i}
                      className={`text-3xl sm:text-4xl ${i < stars ? 'animate-bounce' : 'opacity-30'}`}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      ⭐
                    </span>
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
                onClick={handleShare}
                className="px-6 py-3 rounded-xl bg-coral-500 dark:bg-ocean-500 text-white font-bold hover:bg-coral-600 dark:hover:bg-ocean-600 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Share Result
              </button>
              {gameMode === 'practice' && (
                <button
                  onClick={() => startGame('practice')}
                  className="px-6 py-3 rounded-xl bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 font-bold hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Play Again
                </button>
              )}
            </div>

            <Link
              to="/games"
              className="inline-block text-coral-500 dark:text-ocean-400 hover:text-coral-600 dark:hover:text-ocean-300 hover:underline font-medium text-sm"
            >
              ← Back to Games
            </Link>
          </div>
        )}
      </main>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brown-800 dark:text-white">How to Play</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 rounded-lg hover:bg-cream-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5 text-brown-600 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-brown-600 dark:text-gray-400">
              <p>Guess the Chamorro word in 6 tries.</p>
              
              <div>
                <p className="font-medium text-brown-800 dark:text-white mb-2">Examples:</p>
                <div className="flex gap-1 mb-2">
                  <div className="w-8 h-8 bg-green-500 text-white rounded flex items-center justify-center font-bold text-sm">H</div>
                  <div className="w-8 h-8 bg-cream-200 dark:bg-slate-700 rounded flex items-center justify-center font-bold text-sm">Å</div>
                  <div className="w-8 h-8 bg-cream-200 dark:bg-slate-700 rounded flex items-center justify-center font-bold text-sm">F</div>
                  <div className="w-8 h-8 bg-cream-200 dark:bg-slate-700 rounded flex items-center justify-center font-bold text-sm">A</div>
                </div>
                <p><strong>H</strong> is in the word and in the correct spot.</p>
              </div>

              <div>
                <div className="flex gap-1 mb-2">
                  <div className="w-8 h-8 bg-cream-200 dark:bg-slate-700 rounded flex items-center justify-center font-bold text-sm">M</div>
                  <div className="w-8 h-8 bg-yellow-500 text-white rounded flex items-center justify-center font-bold text-sm">A</div>
                  <div className="w-8 h-8 bg-cream-200 dark:bg-slate-700 rounded flex items-center justify-center font-bold text-sm">N</div>
                  <div className="w-8 h-8 bg-cream-200 dark:bg-slate-700 rounded flex items-center justify-center font-bold text-sm">G</div>
                </div>
                <p><strong>A</strong> is in the word but in the wrong spot.</p>
              </div>

              <div>
                <div className="flex gap-1 mb-2">
                  <div className="w-8 h-8 bg-cream-200 dark:bg-slate-700 rounded flex items-center justify-center font-bold text-sm">T</div>
                  <div className="w-8 h-8 bg-cream-200 dark:bg-slate-700 rounded flex items-center justify-center font-bold text-sm">A</div>
                  <div className="w-8 h-8 bg-gray-400 text-white rounded flex items-center justify-center font-bold text-sm">N</div>
                  <div className="w-8 h-8 bg-cream-200 dark:bg-slate-700 rounded flex items-center justify-center font-bold text-sm">O</div>
                </div>
                <p><strong>N</strong> is not in the word.</p>
              </div>

              <p className="text-xs text-brown-500 dark:text-gray-500">
                Special characters: Å and Ñ are used in Chamorro. The keyboard includes them!
              </p>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-4 py-3 rounded-xl bg-coral-500 dark:bg-ocean-500 text-white font-bold hover:bg-coral-600 dark:hover:bg-ocean-600 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
}

