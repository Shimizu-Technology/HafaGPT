import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Star, Sun, Moon, Play, Timer } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { useSpeech } from '../hooks/useSpeech';
import { UpgradePrompt } from './UpgradePrompt';
import { TTSDisclaimer } from './TTSDisclaimer';

// Game data: Chamorro words with emoji representations
interface WordItem {
  chamorro: string;
  english: string;
  emoji: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  words: WordItem[];
}

// Reuse same categories from Sound Match
const GAME_CATEGORIES: Category[] = [
  {
    id: 'animals',
    name: 'Animals',
    icon: '🐕',
    words: [
      { chamorro: "Ga'lågu", english: 'Dog', emoji: '🐕' },
      { chamorro: 'Katu', english: 'Cat', emoji: '🐱' },
      { chamorro: 'Mannok', english: 'Chicken', emoji: '🐓' },
      { chamorro: 'Babui', english: 'Pig', emoji: '🐖' },
      { chamorro: 'Guihan', english: 'Fish', emoji: '🐟' },
      { chamorro: 'Haggan', english: 'Turtle', emoji: '🐢' },
      { chamorro: 'Paluma', english: 'Bird', emoji: '🐦' },
      { chamorro: 'Karabao', english: 'Carabao', emoji: '🐃' },
    ],
  },
  {
    id: 'colors',
    name: 'Colors',
    icon: '🎨',
    words: [
      { chamorro: "Agaga'", english: 'Red', emoji: '🔴' },
      { chamorro: 'Asut', english: 'Blue', emoji: '🔵' },
      { chamorro: 'Betde', english: 'Green', emoji: '🟢' },
      { chamorro: "Amariyu", english: 'Yellow', emoji: '🟡' },
      { chamorro: "Kulot kahel", english: 'Orange', emoji: '🟠' },
      { chamorro: 'Lila', english: 'Purple', emoji: '🟣' },
      { chamorro: "Å'paka'", english: 'White', emoji: '⚪' },
      { chamorro: "Åttelong", english: 'Black', emoji: '⚫' },
    ],
  },
  {
    id: 'food',
    name: 'Food',
    icon: '🍽️',
    words: [
      { chamorro: 'Niyok', english: 'Coconut', emoji: '🥥' },
      { chamorro: 'Chotda', english: 'Banana', emoji: '🍌' },
      { chamorro: 'Mangga', english: 'Mango', emoji: '🥭' },
      { chamorro: 'Hineksa', english: 'Rice', emoji: '🍚' },
      { chamorro: 'Kåtne', english: 'Meat', emoji: '🍖' },
      { chamorro: 'Chåda', english: 'Egg', emoji: '🥚' },
      { chamorro: 'Hånom', english: 'Water', emoji: '💧' },
      { chamorro: 'Kelaguen', english: 'Kelaguen', emoji: '🥗' },
    ],
  },
  {
    id: 'nature',
    name: 'Nature',
    icon: '🌺',
    words: [
      { chamorro: 'Flores', english: 'Flower', emoji: '🌺' },
      { chamorro: 'Trongkon niyok', english: 'Palm tree', emoji: '🌴' },
      { chamorro: 'Tåsi', english: 'Ocean', emoji: '🌊' },
      { chamorro: 'Atdao', english: 'Sun', emoji: '☀️' },
      { chamorro: 'Pilan', english: 'Moon', emoji: '🌙' },
      { chamorro: "Puti'on", english: 'Star', emoji: '⭐' },
      { chamorro: 'Uchan', english: 'Rain', emoji: '🌧️' },
      { chamorro: "Manglo'", english: 'Wind', emoji: '💨' },
    ],
  },
];

interface Card {
  id: number;
  pairId: number;
  word: WordItem;
  isFlipped: boolean;
  isMatched: boolean;
}

type GameState = 'setup' | 'playing' | 'complete';
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG = {
  easy: { pairs: 4, cols: 4, label: '4 pairs' },
  medium: { pairs: 6, cols: 4, label: '6 pairs' },
  hard: { pairs: 8, cols: 4, label: '8 pairs' },
};

export function PicturePairs() {
  const { theme, toggleTheme } = useTheme();
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const hasSavedRef = useRef(false);
  const { canUse, tryUse, getCount, getLimit } = useSubscription();
  const { speak, preload, isSpeaking } = useSpeech();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const [selectedCategory, setSelectedCategory] = useState<Category>(GAME_CATEGORIES[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

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

  // Check for game completion
  useEffect(() => {
    const pairsCount = DIFFICULTY_CONFIG[difficulty].pairs;
    if (gameState === 'playing' && matchedPairs.length === pairsCount) {
      setGameState('complete');
      
      // Save result
      if (isSignedIn && !hasSavedRef.current) {
        hasSavedRef.current = true;
        const stars = getStars(moves, pairsCount);
        saveGameResultMutation.mutate({
          game_type: 'picture_pairs',
          score: calculateScore(moves, elapsedTime, pairsCount),
          stars,
          difficulty,
          category: selectedCategory.id,
          moves,
          time_seconds: elapsedTime,
        });
      }
    }
  }, [matchedPairs.length, gameState, difficulty, isSignedIn, moves, elapsedTime, selectedCategory, saveGameResultMutation]);

  // Preload audio for all words in category when game starts
  const preloadCategoryAudio = useCallback((category: Category) => {
    category.words.forEach(word => {
      preload(word.chamorro);
    });
  }, [preload]);

  // Generate cards
  const generateCards = useCallback(() => {
    const pairsCount = DIFFICULTY_CONFIG[difficulty].pairs;
    const words = [...selectedCategory.words]
      .sort(() => Math.random() - 0.5)
      .slice(0, pairsCount);

    const cardPairs: Card[] = [];
    words.forEach((word, index) => {
      // Create two cards for each word (a pair)
      cardPairs.push({
        id: index * 2,
        pairId: index,
        word,
        isFlipped: false,
        isMatched: false,
      });
      cardPairs.push({
        id: index * 2 + 1,
        pairId: index,
        word,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle cards
    return cardPairs.sort(() => Math.random() - 0.5);
  }, [selectedCategory, difficulty]);

  // Start game
  const startGame = async () => {
    if (!canUse('game')) {
      setShowUpgradePrompt(true);
      return;
    }
    
    const success = await tryUse('game');
    if (!success) {
      setShowUpgradePrompt(true);
      return;
    }
    
    hasSavedRef.current = false;
    const newCards = generateCards();
    setCards(newCards);
    setFlippedCards([]);
    setMatchedPairs([]);
    setMoves(0);
    setStartTime(Date.now());
    setElapsedTime(0);
    setGameState('playing');
    
    // Preload audio for this category
    preloadCategoryAudio(selectedCategory);
  };

  // Handle card click
  const handleCardClick = useCallback((cardId: number) => {
    if (isChecking || flippedCards.length >= 2) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || matchedPairs.includes(card.pairId) || flippedCards.includes(cardId)) return;

    // Don't speak on flip - wait for match (smoother gameplay)
    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setIsChecking(true);
      setMoves(m => m + 1);

      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // Match found! Speak the word as reinforcement
        setTimeout(() => {
          speak(firstCard.word.chamorro); // Say the matched word
          setMatchedPairs(prev => [...prev, firstCard.pairId]);
          setFlippedCards([]);
          setIsChecking(false);
        }, 600);
      } else {
        // No match - flip back silently
        setTimeout(() => {
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  }, [flippedCards, cards, isChecking, speak]);

  // Calculate score
  const calculateScore = (moves: number, time: number, pairs: number) => {
    const baseScore = pairs * 100;
    const movesPenalty = Math.max(0, (moves - pairs) * 10);
    const timePenalty = Math.max(0, Math.floor(time / 10) * 5);
    return Math.max(0, baseScore - movesPenalty - timePenalty);
  };

  // Get stars
  const getStars = (moves: number, pairs: number) => {
    const efficiency = pairs / moves;
    if (efficiency >= 0.8) return 3;
    if (efficiency >= 0.5) return 2;
    return 1;
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pairsCount = DIFFICULTY_CONFIG[difficulty].pairs;
  const finalScore = calculateScore(moves, elapsedTime, pairsCount);
  const finalStars = getStars(moves, pairsCount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between safe-area-top">
          <div className="flex items-center gap-3">
            <Link
              to="/games"
              className="p-2 -ml-2 rounded-xl hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Go back to games"
            >
              <ArrowLeft className="w-5 h-5 text-brown-600 dark:text-gray-300" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🖼️</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-brown-800 dark:text-white">Picture Pairs</h1>
                <p className="text-[10px] text-brown-500 dark:text-gray-400">Match the pictures!</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <TTSDisclaimer variant="tooltip" />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5 text-brown-600" /> : <Sun className="w-5 h-5 text-yellow-400" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="animate-fade-in">
            {/* Welcome */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/50 dark:to-teal-900/50 mb-4 shadow-lg">
                <span className="text-5xl">🖼️</span>
              </div>
              <h2 className="text-2xl font-bold text-brown-800 dark:text-white mb-2">Picture Pairs</h2>
              <p className="text-brown-600 dark:text-gray-400">
                Find matching pictures and learn Chamorro words!
              </p>
            </div>

            {/* Category Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg mb-4">
              <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 mb-3">Choose a Category</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GAME_CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedCategory.id === category.id
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                        : 'border-cream-200 dark:border-slate-700 hover:border-teal-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{category.icon}</span>
                    <span className="text-sm font-medium text-brown-700 dark:text-gray-300">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg mb-4">
              <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 mb-3">Choose Difficulty</h3>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG.easy][]).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setDifficulty(key)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      difficulty === key
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                        : 'border-cream-200 dark:border-slate-700 hover:border-teal-300'
                    }`}
                  >
                    <span className="text-xl block mb-1">
                      {key === 'easy' ? '🌱' : key === 'medium' ? '🌿' : '🌳'}
                    </span>
                    <span className="text-sm font-medium text-brown-700 dark:text-gray-300 capitalize">{key}</span>
                    <span className="text-xs text-brown-500 dark:text-gray-400 block">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* TTS Disclaimer */}
            <TTSDisclaimer variant="banner" className="mb-4" />

            {/* Start Button */}
            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Play className="w-6 h-6" />
              Start Game
            </button>
            
            {/* Games remaining */}
            <p className="text-center text-sm text-brown-500 dark:text-gray-500 mt-3">
              Games today: {getCount('game')}/{getLimit('game')}
            </p>
          </div>
        )}

        {/* Playing Screen */}
        {gameState === 'playing' && (
          <div className="animate-fade-in">
            {/* Stats Bar */}
            <div className="flex items-center justify-between mb-4 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-brown-600 dark:text-gray-300">
                  <span className="text-sm font-bold">Moves: {moves}</span>
                </div>
                <div className="flex items-center gap-1 text-brown-600 dark:text-gray-300">
                  <Timer className="w-4 h-4" />
                  <span className="text-sm font-bold">{formatTime(elapsedTime)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                <Trophy className="w-4 h-4" />
                <span className="font-bold">{matchedPairs.length}/{pairsCount}</span>
              </div>
            </div>

            {/* Card Grid */}
            <div className={`grid grid-cols-4 gap-2 sm:gap-3 max-w-md mx-auto`}>
              {cards.map((card) => {
                const isMatched = matchedPairs.includes(card.pairId);
                const isFlipped = flippedCards.includes(card.id) || isMatched;
                
                return (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    disabled={isChecking || isMatched || flippedCards.includes(card.id)}
                    className={`aspect-square rounded-xl transition-all duration-300 transform ${
                      isFlipped
                        ? isMatched
                          ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 scale-95'
                          : 'bg-white dark:bg-slate-700 border-2 border-teal-400 rotate-0'
                        : 'bg-gradient-to-br from-teal-400 to-green-500 border-2 border-teal-300 hover:scale-105 cursor-pointer'
                    }`}
                    style={{
                      perspective: '1000px',
                    }}
                  >
                    {isFlipped ? (
                      <span className="text-3xl sm:text-4xl">{card.word.emoji}</span>
                    ) : (
                      <span className="text-2xl sm:text-3xl">❓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Restart Button */}
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setGameState('setup')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Change Settings
              </button>
            </div>
          </div>
        )}

        {/* Complete Screen */}
        {gameState === 'complete' && (
          <div className="animate-fade-in text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-teal-200 dark:from-green-900/50 dark:to-teal-800/50 mb-6 shadow-lg">
              <Trophy className="w-12 h-12 text-teal-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-brown-800 dark:text-white mb-2">
              Håfa Adai! Great Job!
            </h2>
            
            {/* Stars */}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map(star => (
                <Star
                  key={star}
                  className={`w-10 h-10 ${
                    star <= finalStars
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
            
            {/* Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{moves}</p>
                  <p className="text-xs text-brown-500 dark:text-gray-400">Moves</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{formatTime(elapsedTime)}</p>
                  <p className="text-xs text-brown-500 dark:text-gray-400">Time</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{finalScore}</p>
                  <p className="text-xs text-brown-500 dark:text-gray-400">Score</p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  hasSavedRef.current = false;
                  startGame();
                }}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
              <button
                onClick={() => setGameState('setup')}
                className="flex-1 py-3 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 rounded-xl font-medium hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors"
              >
                Settings
              </button>
            </div>
            
            <Link
              to="/games"
              className="inline-block mt-4 text-teal-500 dark:text-teal-400 hover:underline font-medium"
            >
              ← Back to Games
            </Link>
          </div>
        )}
      </main>

      {/* Upgrade Prompt */}
      {showUpgradePrompt && (
        <UpgradePrompt
          feature="games"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}
