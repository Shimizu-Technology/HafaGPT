import { GameTermDialog } from './games/GameTermDialog';
import { useGamePace } from '../hooks/useGamePace';
import { GamePaceControl } from './games/GamePaceControl';
import { useGameRoundGuard } from '../hooks/useGameRoundGuard';
import { useGameReturn } from '../hooks/useGameReturn';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, RotateCcw, Trophy, Star, Play, Timer } from 'lucide-react';
import { useGameTimers } from '../hooks/useGameTimers';
import { GameSaveStatus } from './games/GameSaveStatus';
import { createClientAttemptId } from '../lib/clientAttemptId';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useGameSubscription } from '../hooks/useGameSubscription';
import { useSpeech } from '../hooks/useSpeech';
import { UpgradePrompt } from './UpgradePrompt';
import { TTSDisclaimer } from './TTSDisclaimer';
import { formatUsageSummary } from '../lib/usageDisplay';
import { GamePage, GamePageHeader } from './games/GamePage';

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
      { chamorro: 'Månnok', english: 'Chicken', emoji: '🐓' },
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
      { chamorro: "Kulot kåhet", english: 'Orange', emoji: '🟠' },
      { chamorro: 'Kulot lila', english: 'Purple', emoji: '🟣' },
      { chamorro: "Å'paka'", english: 'White', emoji: '⚪' },
      { chamorro: "Åttilung", english: 'Black', emoji: '⚫' },
    ],
  },
  {
    id: 'food',
    name: 'Food',
    icon: '🍽️',
    words: [
      { chamorro: 'Niyok', english: 'Coconut palm', emoji: '🥥' },
      { chamorro: 'Chotda', english: 'Green banana', emoji: '🍌' },
      { chamorro: 'Mångga', english: 'Mango', emoji: '🥭' },
      { chamorro: 'Hineksa\'', english: 'Cooked rice', emoji: '🍚' },
      { chamorro: 'Kåtne', english: 'Meat', emoji: '🍖' },
      { chamorro: 'Chåda\'', english: 'Egg', emoji: '🥚' },
      { chamorro: 'Hånom', english: 'Water', emoji: '💧' },
      { chamorro: 'Kelaguen', english: 'Citrus-cured meat', emoji: '🥗' },
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
  const pace = useGamePace();
  const [readTerm, setReadTerm] = useState<{ content: string; speak?: string } | null>(null);
  const gameReturn = useGameReturn();
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const resultUnresolved = !!(saveGameResultMutation.isPending || saveGameResultMutation.isError);
  const hasSavedRef = useRef(false);
  const startingRef = useRef(false);
  const gameAttemptIdRef = useRef(createClientAttemptId());
  const { schedule, clear: clearTimers } = useGameTimers();
  const { canUse, tryUse, getCount, getLimit, startStatus, getRoundAttemptId } = useGameSubscription();
  const { preload } = useSpeech();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const guard = useGameRoundGuard((gameState === 'playing') || startStatus.pending,
    resultUnresolved || (!!isSignedIn && gameState === 'complete' && !saveGameResultMutation.isSuccess),
    saveGameResultMutation.isError && saveGameResultMutation.variables ? () => saveGameResultMutation.mutate(saveGameResultMutation.variables!) : undefined);
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
        client_attempt_id: gameAttemptIdRef.current,
          game_type: 'picture_pairs',
          score: calculateScore(moves, elapsedTime, pairsCount),
          stars,
          difficulty,
          category_id: selectedCategory.id,
          category_title: selectedCategory.name,
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
    if (startingRef.current || resultUnresolved) return;
    startingRef.current = true;
    setShowUpgradePrompt(false);
    try {

      if (!canUse('game')) {
        setShowUpgradePrompt(true);
        return;
      }

      const success = await tryUse('game');
      if (!success) {
        setShowUpgradePrompt(true);
        return;
      }

      clearTimers();
      saveGameResultMutation.reset();
      hasSavedRef.current = false;
      gameAttemptIdRef.current = getRoundAttemptId();
      const newCards = generateCards();
      setIsChecking(false);
      setCards(newCards);
      setFlippedCards([]);
      setMatchedPairs([]);
      setMoves(0);
      setStartTime(Date.now());
      setElapsedTime(0);
      setGameState('playing');

      // Preload audio for this category
      preloadCategoryAudio(selectedCategory);

    } finally {
      startingRef.current = false;
    }
  };

  // Handle card click
  const handleCardClick = useCallback((cardId: number) => {
    const card = cards.find(c => c.id === cardId);
    if (card && (flippedCards.includes(cardId) || matchedPairs.includes(card.pairId))) {
      setReadTerm({ content: `${card.word.chamorro} — ${card.word.english}`, speak: card.word.chamorro });
      return;
    }
    if (isChecking || flippedCards.length >= 2) return;
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
        schedule(() => {
          setMatchedPairs(prev => [...prev, firstCard.pairId]);
          setFlippedCards([]);
          setIsChecking(false);
        }, 600);
      } else {
        if (pace.challenge) schedule(() => {
          setFlippedCards([]);
          setIsChecking(false);
        }, 1500);
      }
    }
  }, [flippedCards, cards, isChecking, schedule, matchedPairs, pace.challenge]);

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
    <GamePage guard={guard} startStatus={startStatus} stage={gameState}>
      <GameTermDialog term={readTerm} onClose={() => setReadTerm(null)} />
      <GamePageHeader title="Picture Pairs" subtitle="Match pictures and hear each Chamorro word" icon={ImageIcon} hasSpeech />

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">No reading needed</p>
              <h2 className="mt-1 text-2xl font-bold text-brown-950 dark:text-white">Choose your matching game</h2>
              <p className="mt-2 text-brown-600 dark:text-gray-300">Find matching pictures and hear each Chamorro word.</p>
            </div>

            {/* Category Selection */}
            <div className="mb-4 rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-3 text-sm font-semibold text-brown-700 dark:text-gray-300">Topic</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GAME_CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={selectedCategory.id === category.id}
                    className={`p-3 rounded-xl border-2 transition-colors ${
                      selectedCategory.id === category.id
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                        : 'border-cream-200 dark:border-slate-700 [@media(hover:hover)_and_(pointer:fine)]:hover:border-teal-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{category.icon}</span>
                    <span className="text-sm font-medium text-brown-700 dark:text-gray-300">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Selection */}
            <div className="mb-4 rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-3 text-sm font-semibold text-brown-700 dark:text-gray-300">Number of pairs</h3>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG.easy][]).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setDifficulty(key)}
                    aria-pressed={difficulty === key}
                    className={`p-3 rounded-xl border-2 transition-colors ${
                      difficulty === key
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                        : 'border-cream-200 dark:border-slate-700 [@media(hover:hover)_and_(pointer:fine)]:hover:border-teal-300'
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
            <GamePaceControl {...pace} />
            <button
              onClick={startGame}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-coral-700 px-5 font-bold text-white [@media(hover:hover)_and_(pointer:fine)]:hover:bg-coral-800 dark:bg-teal-700 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-teal-800"
             disabled={startStatus.pending}>
              <Play className="w-6 h-6" />
              Start Game
            </button>

            {/* Games remaining */}
            <p className="text-center text-sm text-brown-500 dark:text-gray-500 mt-3">
              {formatUsageSummary(getCount('game'), getLimit('game'))}
            </p>
          </div>
        )}

        {/* Playing Screen */}
        {gameState === 'playing' && (
          <div className="animate-fade-in">
            {/* Stats Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg">
              <div className="flex flex-wrap items-center gap-3">
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
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-md mx-auto`}>
              {cards.map((card) => {
                const isMatched = matchedPairs.includes(card.pairId);
                const isFlipped = flippedCards.includes(card.id) || isMatched;

                return (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    disabled={isChecking && !isFlipped}
                    aria-label={isFlipped ? `${card.word.chamorro}, ${card.word.english} picture. Read or hear card${isMatched ? ', matched' : ''}` : 'Hidden picture'}
                    className={`w-full min-w-0 min-h-40 aspect-square rounded-xl transition-colors duration-300 transform ${
                      isFlipped
                        ? isMatched
                          ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 scale-95'
                          : 'bg-white dark:bg-slate-700 border-2 border-teal-400 rotate-0'
                        : 'bg-gradient-to-br from-teal-400 to-green-500 border-2 border-teal-300  cursor-pointer'
                    }`}
                    style={{
                      perspective: '1000px',
                    }}
                  >
                    {isFlipped ? (
                      <span className="flex flex-col items-center gap-1 p-2"><span className="text-3xl sm:text-4xl">{card.word.emoji}</span><span className="w-full break-words text-base font-semibold text-brown-900 dark:text-white">{card.word.chamorro}</span><span className="text-xs text-brown-700 dark:text-gray-200">Read / hear</span></span>
                    ) : (
                      <span className="text-2xl sm:text-3xl">❓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {isChecking && flippedCards.length === 2 && !pace.challenge && (() => {
              const first = cards.find(card => card.id === flippedCards[0]);
              const second = cards.find(card => card.id === flippedCards[1]);
              return first?.pairId !== second?.pairId;
            })() && <button type="button" onClick={() => { setFlippedCards([]); setIsChecking(false); }} className="mt-4 min-h-12 w-full rounded-xl bg-coral-700 px-4 font-bold text-white dark:bg-teal-700">Next — hide these cards</button>}

            {/* Restart Button */}
            <div className="flex justify-center mt-4">
              <button
                onClick={() => guard.requestLeave(() => { clearTimers(); setGameState('setup'); })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-300 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-cream-200 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-slate-600 transition-colors"
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
                onClick={startGame}
                disabled={resultUnresolved || startStatus.pending}
                className="flex-1 py-3 bg-gradient-to-r from-green-700 to-teal-700 text-white rounded-xl font-medium [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
              <button
                disabled={resultUnresolved || startStatus.pending}
                onClick={() => guard.requestLeave(() => { clearTimers(); setGameState('setup'); })}
                className="flex-1 py-3 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 rounded-xl font-medium [@media(hover:hover)_and_(pointer:fine)]:hover:bg-cream-200 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-slate-600 transition-colors"
              >
                Settings
              </button>
            </div>

            <Link
              to={gameReturn.to} replace
              className="inline-block mt-4 text-teal-500 dark:text-teal-400 [@media(hover:hover)_and_(pointer:fine)]:hover:underline font-medium"
            >
              {gameReturn.label}
            </Link>
          </div>
        )}
        {gameState === 'complete' && <GameSaveStatus mutation={saveGameResultMutation} />}
      </main>

      {/* Upgrade Prompt */}
      {showUpgradePrompt && !startStatus.error && !startStatus.pending && (
        <UpgradePrompt
          feature="game"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </GamePage>
  );
}
