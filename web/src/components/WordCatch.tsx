import { useGamePace } from '../hooks/useGamePace';
import { GamePaceControl } from './games/GamePaceControl';
import { useGameRoundGuard } from '../hooks/useGameRoundGuard';
import { useGameReturn } from '../hooks/useGameReturn';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Settings2, Play, Sparkles, BookOpen, Pause, RotateCcw, MousePointerClick, Zap, Trophy, Star, ThumbsUp, Check, X, Flame, Timer } from 'lucide-react';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';
import { useDictionaryFlashcards } from '../hooks/useFlashcardsQuery';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { frameDistance } from '../lib/gameRound';
import { GameSaveStatus } from './games/GameSaveStatus';
import { createClientAttemptId } from '../lib/clientAttemptId';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useGameSubscription } from '../hooks/useGameSubscription';
import { UpgradePrompt } from './UpgradePrompt';
import { GamePage, GamePageHeader } from './games/GamePage';

interface GameSettings {
  category: string;
  mode: 'beginner' | 'challenge';
}

interface FlyingPair {
  id: number;
  chamorro: string;
  english: string;
  isCorrect: boolean; // true = matching pair, false = wrong pair
  x: number; // current x position (percentage)
  y: number; // current y position (percentage)
  startX: number; // starting x
  startY: number; // starting y
  endX: number; // ending x
  endY: number; // ending y
  progress: number; // 0-1 animation progress
  speed: number; // how fast it moves
  caught: boolean; // has been tapped
  missed: boolean; // went off screen without being caught
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
const GAME_DURATION = 60; // 60 seconds per game
const SPAWN_INTERVAL_START = 3000; // ms between spawns (starts slower)
const SPAWN_INTERVAL_MIN = 1500; // ms minimum spawn interval
const PAIR_SPEED_START = 0.003; // Starting speed (much slower for playability)
const CORRECT_PAIR_RATIO = 0.65; // 65% of pairs are correct (slightly easier)
const MAX_LIVES = 3;

export function WordCatch() {
  const pace = useGamePace();
  const gameReturn = useGameReturn();
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const resultUnresolved = !!(saveGameResultMutation.isPending || saveGameResultMutation.isError);
  const hasSavedRef = useRef(false);
  const startingRef = useRef(false);
  const gameAttemptIdRef = useRef(createClientAttemptId());
  const { data: categoriesData, isLoading: categoriesLoading } = useVocabularyCategories();
  const { canUse, tryUse, getCount, getLimit, startStatus, getRoundAttemptId } = useGameSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'paused' | 'complete'>('setup');
  const guard = useGameRoundGuard((gameState === 'playing' || gameState === 'paused') || startStatus.pending,
    resultUnresolved || (!!isSignedIn && gameState === 'complete' && !saveGameResultMutation.isSuccess),
    saveGameResultMutation.isError && saveGameResultMutation.variables ? () => saveGameResultMutation.mutate(saveGameResultMutation.variables!) : undefined);
  const [settings, setSettings] = useState<GameSettings>({
    category: 'greetings',
    mode: 'beginner',
  });

  // Active game data
  const [flyingPairs, setFlyingPairs] = useState<FlyingPair[]>([]);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [caught, setCaught] = useState(0);
  const [, setMissed] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [currentSpeed, setCurrentSpeed] = useState(PAIR_SPEED_START);
  const [spawnInterval, setSpawnInterval] = useState(SPAWN_INTERVAL_START);

  // Refs
  const animationRef = useRef<number | null>(null);
  const simulationRef = useRef(new Map<number, FlyingPair>());
  const pairElementsRef = useRef(new Map<number, HTMLButtonElement>());
  const [roundFeedback, setRoundFeedback] = useState<string | null>(null);
  const caughtIdsRef = useRef(new Set<number>());
  const comboRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pairIdRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);

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

    if (!sourceCards || sourceCards.length < 4) {
      return [];
    }

    return sourceCards.map(card => ({
      chamorro: card.front,
      english: card.back,
    }));
  }, [settings.mode, curatedFlashcards, flashcardsData]);

  // Generate a flying pair
  const spawnPair = useCallback(() => {
    if (wordPool.length < 2 || gameState !== 'playing') return;

    const isCorrect = Math.random() < CORRECT_PAIR_RATIO;
    const wordIndex = Math.floor(Math.random() * wordPool.length);
    const word = wordPool[wordIndex];

    let english = word.english;
    if (!isCorrect) {
      // Choose a finite pool with a different meaning, including duplicate definitions.
      const otherMeanings = wordPool.filter(entry => entry.english !== word.english);
      if (!otherMeanings.length) return;
      english = otherMeanings[Math.floor(Math.random() * otherMeanings.length)].english;
    }

    // Random start position (from edges)
    const side = Math.floor(Math.random() * 4); // 0=left, 1=right, 2=top, 3=bottom
    let startX = 0, startY = 0, endX = 0, endY = 0;

    switch (side) {
      case 0: // From left
        startX = -15;
        startY = 20 + Math.random() * 60;
        endX = 115;
        endY = 20 + Math.random() * 60;
        break;
      case 1: // From right
        startX = 115;
        startY = 20 + Math.random() * 60;
        endX = -15;
        endY = 20 + Math.random() * 60;
        break;
      case 2: // From top
        startX = 20 + Math.random() * 60;
        startY = -15;
        endX = 20 + Math.random() * 60;
        endY = 115;
        break;
      case 3: // From bottom
        startX = 20 + Math.random() * 60;
        startY = 115;
        endX = 20 + Math.random() * 60;
        endY = -15;
        break;
    }

    pairIdRef.current += 1;
    const newPair: FlyingPair = {
      id: pairIdRef.current,
      chamorro: word.chamorro,
      english,
      isCorrect,
      x: startX,
      y: startY,
      startX,
      startY,
      endX,
      endY,
      progress: 0,
      speed: currentSpeed + (Math.random() * 0.001), // Slight speed variation
      caught: false,
      missed: false,
    };

    simulationRef.current.set(newPair.id, newPair);
    setFlyingPairs(prev => [...prev, newPair]);
  }, [wordPool, gameState, currentSpeed]);

  // Handle tapping a pair
  const handleCatch = useCallback((pairId: number) => {
    if (gameState !== 'playing' || livesRef.current <= 0 || caughtIdsRef.current.has(pairId)) return;
    const pair = flyingPairs.find(item => item.id === pairId);
    if (!pair || pair.caught || pair.missed) return;
    caughtIdsRef.current.add(pairId);
    simulationRef.current.delete(pairId);
    if (pace.challenge) setFlyingPairs(prev => prev.filter(item => item.id !== pairId));
    else {
      setRoundFeedback(pair.isCorrect ? 'That’s a match!' : `These meanings don’t match. ${pair.chamorro} means ${wordPool.find(word => word.chamorro === pair.chamorro)?.english}.`);
      setFlyingPairs(prev => prev.map(item => item.id === pairId ? { ...item, caught: true } : item));
    }
    if (pair.isCorrect) {
      const nextCombo = comboRef.current + 1;
      const comboBonus = comboRef.current * 10;
      setScore(score => score + 100 + comboBonus);
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      setMaxCombo(current => Math.max(current, nextCombo));
      setCaught(count => count + 1);
    } else {
      comboRef.current = 0;
      setCombo(0);
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0) setGameState('complete');
    }
  }, [flyingPairs, gameState, pace.challenge, wordPool]);

  // Mutable simulation and element transforms avoid React and positional layout per frame.
  useEffect(() => {
    if (gameState !== 'playing' || !pace.challenge || guard.blocked) return;
    let previousTime: number | null = null;
    let width = gameAreaRef.current?.clientWidth || 0;
    let height = gameAreaRef.current?.clientHeight || 0;
    const observer = new ResizeObserver(entries => { width = entries[0].contentRect.width; height = entries[0].contentRect.height; });
    if (gameAreaRef.current) observer.observe(gameAreaRef.current);
    const animate = (timestamp: number) => {
      const elapsed = previousTime === null ? 0 : timestamp - previousTime;
      previousTime = timestamp;
      const expired: FlyingPair[] = [];
      for (const pair of simulationRef.current.values()) {
        pair.progress += frameDistance(pair.speed, elapsed);
        pair.x = pair.startX + (pair.endX - pair.startX) * pair.progress;
        pair.y = pair.startY + (pair.endY - pair.startY) * pair.progress;
        const element = pairElementsRef.current.get(pair.id);
        if (element) element.style.transform = `translate(${pair.x * width / 100}px, ${pair.y * height / 100}px) translate(-50%, -50%)`;
        if (pair.progress >= 1) expired.push(pair);
      }
      if (expired.length) {
        const ids = new Set(expired.map(pair => pair.id));
        ids.forEach(id => simulationRef.current.delete(id));
        const missedMatches = expired.filter(pair => pair.isCorrect).length;
        if (missedMatches) {
          comboRef.current = 0;
          setCombo(0);
          setMissed(count => count + missedMatches);
        }
        setFlyingPairs(pairs => pairs.filter(pair => !ids.has(pair.id)));
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { observer.disconnect(); if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [gameState, pace.challenge, guard.blocked]);

  useEffect(() => {
    const pause = () => { if (document.hidden) setGameState(state => state === 'playing' ? 'paused' : state); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);

  const spawnPairRef = useRef(spawnPair);
  const spawnIntervalRef = useRef(spawnInterval);
  useEffect(() => {
    spawnPairRef.current = spawnPair;
    spawnIntervalRef.current = spawnInterval;
  }, [spawnPair, spawnInterval]);

  const relaxedPairCount = pace.challenge ? 0 : flyingPairs.length;

  // Spawn timer
  useEffect(() => {
    if (gameState !== 'playing' || guard.blocked) return;

    if (!pace.challenge) {
      if (relaxedPairCount === 0) spawnPairRef.current();
      return;
    }
    const spawn = () => {
      spawnPairRef.current();
      // Schedule next spawn
      spawnTimerRef.current = setTimeout(spawn, spawnIntervalRef.current);
    };

    // Initial spawn
    spawnTimerRef.current = setTimeout(spawn, 500);

    return () => {
      if (spawnTimerRef.current) {
        clearTimeout(spawnTimerRef.current);
      }
    };
  }, [gameState, pace.challenge, guard.blocked, relaxedPairCount]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing' || guard.blocked) return;

    const timer = setInterval(() => {
      setElapsedSeconds(seconds => seconds + 1);
      if (!pace.challenge) return;
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('complete');
          return 0;
        }
        return prev - 1;
      });

      // Gradually increase difficulty (very gentle)
      setCurrentSpeed(s => Math.min(s + 0.00005, PAIR_SPEED_START + 0.003));
      setSpawnInterval(i => Math.max(i - 15, SPAWN_INTERVAL_MIN));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, pace.challenge, guard.blocked]);

  // Save game result when complete
  useEffect(() => {
    if (gameState === 'complete' && isSignedIn && !hasSavedRef.current) {
      hasSavedRef.current = true;
      const stars = caught >= 20 ? 3 : caught >= 10 ? 2 : 1;
      saveGameResultMutation.mutate({
        client_attempt_id: gameAttemptIdRef.current,
        game_type: 'word_catch',
        mode: settings.mode,
        category_id: settings.category,
        score,
        moves: caught,
        pairs: maxCombo,
        time_seconds: elapsedSeconds,
        stars,
      });
    }
  }, [gameState, isSignedIn, caught, score, maxCombo, elapsedSeconds, settings, saveGameResultMutation, resultUnresolved]);

  // Start game
  const startGame = useCallback(async () => {
    if (startingRef.current || resultUnresolved) return;
    startingRef.current = true;
    setShowUpgradePrompt(false);
    try {

      if (wordPool.length < 4) {
        alert('Not enough words in this category. Please try another category.');
        return;
      }
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

      if (wordPool.length < 4) {
        alert('Not enough words in this category. Please try another category.');
        return;
      }
      saveGameResultMutation.reset();
      hasSavedRef.current = false;
      gameAttemptIdRef.current = getRoundAttemptId();
      livesRef.current = MAX_LIVES;
      comboRef.current = 0;
      setLives(MAX_LIVES);
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setCaught(0);
      setMissed(0);
      setTimeLeft(GAME_DURATION);
      setElapsedSeconds(0);
      setCurrentSpeed(PAIR_SPEED_START);
      setSpawnInterval(SPAWN_INTERVAL_START);
      caughtIdsRef.current.clear();
      simulationRef.current.clear();
      setRoundFeedback(null);
      setFlyingPairs([]);
      setGameState('playing');

    } finally {
      startingRef.current = false;
    }
  }, [wordPool, isSignedIn, canUse, tryUse, getRoundAttemptId, saveGameResultMutation, resultUnresolved]);

  // Reset to setup
  const resetGame = () => {
    if (resultUnresolved) return;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (spawnTimerRef.current) {
      clearTimeout(spawnTimerRef.current);
    }
    setGameState('setup');
    simulationRef.current.clear();
    setRoundFeedback(null);
    setFlyingPairs([]);
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
      if (spawnTimerRef.current) {
        clearTimeout(spawnTimerRef.current);
      }
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  };

  const handleBack = () => navigate(gameReturn.to, { replace: true });

  // Calculate stars
  const getStars = () => {
    if (caught >= 20) return 3;
    if (caught >= 10) return 2;
    return 1;
  };

  const isLoading = settings.mode === 'challenge' ? flashcardsLoading : false;
  const hasEnoughWords = wordPool.length >= 4;

  if (categoriesLoading) {
    return (
      <GamePage guard={guard} startStatus={startStatus} stage={gameState}>
        <GamePageHeader title="Word Catch" subtitle="Catch matching Chamorro and English word pairs." icon={MousePointerClick} />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-coral-600 border-t-transparent dark:border-teal-500 dark:border-t-transparent" />
          <p className="text-brown-600 dark:text-gray-400">Loading games...</p>
        </div>
      </GamePage>
    );
  }

  return (
    <GamePage guard={guard} startStatus={startStatus} stage={gameState}>
      <GamePageHeader
        title="Word Catch"
        subtitle={gameState === 'setup' ? 'Catch matching Chamorro and English word pairs.' : `${timeLeft} seconds · ${score} points`}
        icon={MousePointerClick}
        onBack={handleBack}
        trailing={(gameState === 'playing' || gameState === 'paused') ? (
          <>
            <button type="button" onClick={togglePause} className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-600 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-cream-100 dark:text-gray-300 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-slate-700" aria-label={gameState === 'paused' ? 'Resume game' : 'Pause game'}>
              {gameState === 'paused' ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
            </button>
            <button type="button" onClick={() => { guard.requestLeave(resetGame); }} className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-600 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-cream-100 dark:text-gray-300 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-slate-700" aria-label="Change game settings">
              <Settings2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : undefined}
      />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
            {/* Mode Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 border border-cream-200 dark:border-slate-700">
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
                    p-2 sm:p-3 rounded-xl text-center transition-colors duration-200
                    ${settings.mode === 'beginner'
                      ? 'bg-coral-700 dark:bg-teal-700 text-white'
                      : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-cream-200 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-slate-600'
                    }
                  `}
                >
                  <Sparkles className={`w-5 h-5 mx-auto mb-1 ${settings.mode === 'beginner' ? 'text-white' : 'text-amber-500'}`} />
                  <span className="text-xs sm:text-sm font-bold block">Beginner</span>
                  <span className={`text-xs sm:text-xs ${settings.mode === 'beginner' ? 'text-white' : 'text-brown-500 dark:text-gray-300'}`}>Common phrases</span>
                </button>
                <button
                  onClick={() => setSettings((s) => ({ ...s, mode: 'challenge' }))}
                  aria-pressed={settings.mode === 'challenge'}
                  className={`
                    p-2 sm:p-3 rounded-xl text-center transition-colors duration-200
                    ${settings.mode === 'challenge'
                      ? 'bg-coral-700 dark:bg-teal-700 text-white'
                      : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-cream-200 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-slate-600'
                    }
                  `}
                >
                  <BookOpen className={`w-5 h-5 mx-auto mb-1 ${settings.mode === 'challenge' ? 'text-white' : 'text-coral-700 dark:text-teal-400'}`} />
                  <span className="text-xs sm:text-sm font-bold block">Challenge</span>
                  <span className={`text-xs sm:text-xs ${settings.mode === 'challenge' ? 'text-white' : 'text-brown-500 dark:text-gray-300'}`}>Full dictionary</span>
                </button>
              </div>
            </div>

            {/* Category Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 border border-cream-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-brown-800 dark:text-white mb-2">Choose Topic</h3>
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Choose a topic">
                {availableCategories.map((catId) => (
                  <button
                    key={catId}
                    onClick={() => setSettings((s) => ({ ...s, category: catId }))}
                    aria-pressed={settings.category === catId}
                    className={`
                      min-w-20 flex-none p-2 rounded-xl text-center transition-colors duration-200
                      ${settings.category === catId
                        ? 'bg-coral-700 dark:bg-teal-700 text-white'
                        : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-cream-200 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-slate-600'
                      }
                    `}
                  >
                    <span className="text-base sm:text-lg block">{categoryIcons[catId] || '📚'}</span>
                    <span className="text-xs sm:text-xs font-medium capitalize leading-tight block mt-0.5">
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
                  <Check className="h-4 w-4 flex-none text-emerald-700 dark:text-emerald-400" aria-hidden="true" /> Tap pairs with matching meanings
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 flex-none text-red-600 dark:text-red-400" aria-hidden="true" /> Let pairs with wrong meanings pass by
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 flex-none text-amber-600 dark:text-amber-400" aria-hidden="true" /> Build combos for bonus points
                </li>
                <li className="flex items-center gap-2">
                  <Timer className="h-4 w-4 flex-none text-coral-700 dark:text-teal-400" aria-hidden="true" /> 60 seconds - catch as many as you can!
                </li>
              </ul>
            </details>

            {/* Start Button */}
            <GamePaceControl {...pace} />
            <button
              onClick={startGame}
              disabled={isLoading || !hasEnoughWords}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral-700 px-4 font-bold text-white transition-colors [@media(hover:hover)_and_(pointer:fine)]:hover:bg-coral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-700 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-teal-800"
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
            <div className="flex items-center justify-between mb-3 sm:mb-4 bg-white dark:bg-slate-800 rounded-xl p-3 border border-cream-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                {/* Lives */}
                <div role="img" aria-label={`${lives} lives remaining`} className="flex items-center gap-0.5">
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
                  <p className="text-lg sm:text-xl font-bold text-coral-700 dark:text-teal-400">{score}</p>
                  <p className="text-xs text-brown-500 dark:text-gray-400">Score</p>
                </div>
                <div className="text-center">
                  <p className="inline-flex items-center gap-1 text-lg sm:text-xl font-bold text-brown-800 dark:text-white">{combo}<Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" /></p>
                  <p className="text-xs text-brown-500 dark:text-gray-400">Combo</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg sm:text-xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-brown-800 dark:text-white'}`}>
                    {pace.challenge ? `${timeLeft}s` : 'No timer'}
                  </p>
                  <p className="text-xs text-brown-500 dark:text-gray-400">Time</p>
                </div>
              </div>
            </div>

            {/* Game Area */}
            <div
              ref={gameAreaRef}
              className="relative bg-cream-100 dark:bg-slate-800 rounded-2xl border border-cream-300 dark:border-slate-600 h-[55vh] sm:h-[60vh] overflow-hidden"
            >
              {/* Flying Pairs */}
              {(pace.challenge ? flyingPairs : flyingPairs.slice(0, 1)).map(pair => (
                <button
                  key={pair.id}
                  ref={element => { if (element) pairElementsRef.current.set(pair.id, element); else pairElementsRef.current.delete(pair.id); }}
                  onClick={() => handleCatch(pair.id)}
                  disabled={pair.caught || pair.missed}
                  className={`
                    absolute top-0 left-0
                    px-3 sm:px-4 py-2 sm:py-3 rounded-xl
                    font-bold text-xs sm:text-sm text-center
                    transition-colors duration-150
                    ${pair.caught
                      ? pair.isCorrect
                        ? 'bg-emerald-700 text-white'
                        : 'bg-red-700 text-white'
                      : 'bg-white dark:bg-slate-800 text-brown-900 dark:text-white border-2 border-teal-400 dark:border-teal-600 '
                    }
                  `}
                  style={{
                    left: pace.challenge ? 0 : '50%',
                    top: pace.challenge ? 0 : '40%',
                    maxWidth: '90%',
                    transform: pace.challenge ? `translate(${pair.x * (gameAreaRef.current?.clientWidth || 0) / 100}px, ${pair.y * (gameAreaRef.current?.clientHeight || 0) / 100}px) translate(-50%, -50%)` : 'translate(-50%, -50%)',
                    transition: 'background-color 150ms',
                  }}
                >
                  <div className="break-words">
                    <span className="block font-bold">{pair.chamorro}</span>
                    <span className="block text-xs sm:text-xs opacity-80">= {pair.english}</span>
                  </div>
                </button>
              ))}

              {/* Paused Overlay */}
              {gameState === 'paused' && (
                <div className="absolute inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center z-10">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white mb-4">Paused</p>
                    <button
                      onClick={togglePause}
                      className="px-6 py-3 rounded-xl bg-coral-700 dark:bg-teal-700 text-white font-bold [@media(hover:hover)_and_(pointer:fine)]:hover:bg-coral-800 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-teal-800 transition-colors"
                    >
                      Resume
                    </button>
                  </div>
                </div>
              )}

              {/* Instructions overlay (first few seconds) */}
              {pace.challenge && timeLeft >= GAME_DURATION - 3 && gameState === 'playing' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/50 text-white px-6 py-4 rounded-2xl text-center animate-pulse">
                    <p className="text-lg font-bold">Tap matching word pairs</p>
                    <p className="text-sm opacity-80">Let incorrect meanings pass by</p>
                  </div>
                </div>
              )}
            </div>
            {!pace.challenge && <div className="mt-4 space-y-3 text-brown-900 dark:text-white">
              <p>Tap the pair if the meaning matches, or choose Not a match.</p>
              {roundFeedback ? <div role="status"><p>{roundFeedback}</p><button type="button" onClick={() => { setRoundFeedback(null); simulationRef.current.clear(); setFlyingPairs([]); }} disabled={gameState === 'paused'} className="mt-3 min-h-12 w-full rounded-xl bg-coral-700 px-4 font-bold text-white dark:bg-teal-700">Next pair</button></div> : <button type="button" disabled={gameState === 'paused' || !flyingPairs.length} onClick={() => {
                const pair = flyingPairs[0];
                if (!pair) return;
                caughtIdsRef.current.add(pair.id);
                simulationRef.current.delete(pair.id);
                setRoundFeedback(pair.isCorrect ? `These do match: ${pair.chamorro} means ${pair.english}.` : 'Good choice. These meanings don’t match.');
                if (pair.isCorrect) { comboRef.current = 0; setCombo(0); setMissed(count => count + 1); }
                setFlyingPairs(pairs => pairs.map(item => ({ ...item, caught: true })));
              }} className="min-h-12 w-full rounded-xl border border-brown-400 px-4 font-semibold dark:border-slate-500">Not a match</button>}
              <button type="button" onClick={() => setGameState('complete')} className="min-h-12 w-full rounded-xl border border-brown-400 px-4 font-semibold dark:border-slate-500">Finish round</button>
            </div>}
          </div>
        )}

        {/* Complete Screen */}
        {gameState === 'complete' && (
          <div className="max-w-sm mx-auto text-center space-y-4 sm:space-y-6">
            {/* Game Over */}
            <div className="relative">
              <div className="h-20 w-20 sm:h-24 sm:w-24 mx-auto flex items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                {caught >= 20 ? <Trophy className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden="true" /> : caught >= 10 ? <Star className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden="true" /> : <ThumbsUp className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden="true" />}
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-1">
                {timeLeft === 0 ? "Time's Up!" : 'Game Over!'}
              </h2>
              <p className="text-brown-600 dark:text-gray-400">
                You caught {caught} correct {caught === 1 ? 'pair' : 'pairs'}!
              </p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-2" role="img" aria-label={`${getStars()} out of 3 stars`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Star key={i} aria-hidden="true" className={`h-8 w-8 sm:h-10 sm:w-10 ${i < getStars() ? "fill-amber-400 text-amber-400" : "text-cream-300 dark:text-slate-600"}`} />
              ))}
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-cream-200 dark:border-slate-700">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-coral-700 dark:text-teal-400">{score}</p>
                  <p className="text-xs sm:text-xs text-brown-500 dark:text-gray-400">Score</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white">{caught}</p>
                  <p className="text-xs sm:text-xs text-brown-500 dark:text-gray-400">Caught</p>
                </div>
                <div>
                  <p className="inline-flex items-center gap-1 text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white">{maxCombo}<Flame className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" /></p>
                  <p className="text-xs sm:text-xs text-brown-500 dark:text-gray-400">Max Combo</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={playAgain}
                disabled={resultUnresolved || startStatus.pending}
                className="flex-1 py-3 px-4 rounded-xl bg-coral-700 dark:bg-teal-700 text-white font-bold transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                Play Again
              </button>
              <button
                onClick={resetGame}
                disabled={resultUnresolved || startStatus.pending}
                className="flex-1 py-3 px-4 rounded-xl bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 font-bold [@media(hover:hover)_and_(pointer:fine)]:hover:bg-cream-200 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
                Settings
              </button>
            </div>

            <Link
              to={gameReturn.to} replace
              className="inline-block text-coral-700 dark:text-teal-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-coral-600 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:text-teal-300 [@media(hover:hover)_and_(pointer:fine)]:hover:underline font-medium text-sm"
            >
              {gameReturn.label}
            </Link>
          </div>
        )}
        {gameState === 'complete' && <GameSaveStatus mutation={saveGameResultMutation} />}
      </main>

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && !startStatus.error && !startStatus.pending && (
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
