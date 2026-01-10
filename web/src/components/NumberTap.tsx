import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, RotateCcw, Trophy, Star, Sun, Moon, Play, Sparkles } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { useSpeech } from '../hooks/useSpeech';
import { UpgradePrompt } from './UpgradePrompt';
import { TTSDisclaimer } from './TTSDisclaimer';

// Chamorro numbers 1-10
interface NumberItem {
  chamorro: string;
  english: string;
  value: number;
}

const NUMBERS: NumberItem[] = [
  { chamorro: 'Uno', english: 'One', value: 1 },
  { chamorro: 'Dos', english: 'Two', value: 2 },
  { chamorro: 'Tres', english: 'Three', value: 3 },
  { chamorro: 'Kuåttro', english: 'Four', value: 4 },
  { chamorro: 'Singko', english: 'Five', value: 5 },
  { chamorro: 'Sais', english: 'Six', value: 6 },
  { chamorro: 'Siette', english: 'Seven', value: 7 },
  { chamorro: 'Ocho', english: 'Eight', value: 8 },
  { chamorro: 'Nuebi', english: 'Nine', value: 9 },
  { chamorro: 'Dies', english: 'Ten', value: 10 },
];

// Fun items to count
const COUNTABLE_ITEMS = [
  { emoji: '🥥', name: 'coconut' },
  { emoji: '🌺', name: 'flower' },
  { emoji: '⭐', name: 'star' },
  { emoji: '🐠', name: 'fish' },
  { emoji: '🌴', name: 'palm tree' },
  { emoji: '🦀', name: 'crab' },
  { emoji: '🐚', name: 'shell' },
  { emoji: '🍌', name: 'banana' },
];

const ROUNDS_PER_GAME = 10;

type GameState = 'setup' | 'playing' | 'feedback' | 'complete';

export function NumberTap() {
  const { theme, toggleTheme } = useTheme();
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const hasSavedRef = useRef(false);
  const { canUse, tryUse, getCount, getLimit } = useSubscription();
  const { speak, preload, isSpeaking } = useSpeech();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [currentNumber, setCurrentNumber] = useState<NumberItem | null>(null);
  const [currentItem, setCurrentItem] = useState<typeof COUNTABLE_ITEMS[0] | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [usedNumbers, setUsedNumbers] = useState<Set<number>>(new Set());

  // Generate a new round
  const generateRound = useCallback(() => {
    // Filter out numbers we've already used (if possible)
    let availableNumbers = NUMBERS.filter(n => !usedNumbers.has(n.value));
    if (availableNumbers.length < 4) {
      setUsedNumbers(new Set());
      availableNumbers = NUMBERS;
    }
    
    // Pick a random number as the correct answer (limit to 1-6 for easier gameplay)
    const easyNumbers = availableNumbers.filter(n => n.value <= 6);
    const targetNumbers = easyNumbers.length >= 1 ? easyNumbers : availableNumbers;
    const correctNumber = targetNumbers[Math.floor(Math.random() * targetNumbers.length)];
    
    // Pick a random item to count
    const item = COUNTABLE_ITEMS[Math.floor(Math.random() * COUNTABLE_ITEMS.length)];
    
    // Generate 3 wrong answers that are different from correct
    const wrongNumbers: number[] = [];
    while (wrongNumbers.length < 3) {
      // Keep wrong answers close to correct for a good challenge
      const offset = Math.floor(Math.random() * 4) - 2; // -2 to +2
      let wrongValue = correctNumber.value + offset;
      if (wrongValue < 1) wrongValue = correctNumber.value + Math.abs(offset);
      if (wrongValue > 10) wrongValue = correctNumber.value - Math.abs(offset);
      if (wrongValue !== correctNumber.value && !wrongNumbers.includes(wrongValue) && wrongValue >= 1 && wrongValue <= 10) {
        wrongNumbers.push(wrongValue);
      }
    }
    
    // Combine and shuffle
    const allOptions = [correctNumber.value, ...wrongNumbers].sort(() => Math.random() - 0.5);
    
    setCurrentNumber(correctNumber);
    setCurrentItem(item);
    setOptions(allOptions);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setUsedNumbers(prev => new Set([...prev, correctNumber.value]));
    
    // Preload audio
    preload(correctNumber.chamorro);
    preload('Bunitu!');
  }, [usedNumbers, preload]);

  // Start the game
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
    
    setGameState('playing');
    setCurrentRound(1);
    setScore(0);
    setStreak(0);
    setUsedNumbers(new Set());
    hasSavedRef.current = false;
    generateRound();
  };

  // Handle answer selection
  const handleAnswer = (value: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(value);
    const correct = value === currentNumber?.value;
    setIsCorrect(correct);
    setGameState('feedback');
    
    if (correct) {
      const streakBonus = streak >= 3 ? 50 : streak >= 2 ? 25 : 0;
      setScore(prev => prev + 100 + streakBonus);
      setStreak(prev => prev + 1);
      speak('Bunitu!');
    } else {
      setStreak(0);
      setTimeout(() => {
        speak(currentNumber?.chamorro || '');
      }, 500);
    }
    
    setTimeout(() => {
      if (currentRound >= ROUNDS_PER_GAME) {
        setGameState('complete');
      } else {
        setCurrentRound(prev => prev + 1);
        setGameState('playing');
        generateRound();
      }
    }, correct ? 1500 : 2500);
  };

  // Save game result when complete
  useEffect(() => {
    if (gameState === 'complete' && isSignedIn && !hasSavedRef.current) {
      hasSavedRef.current = true;
      const stars = score >= 800 ? 3 : score >= 600 ? 2 : 1;
      saveGameResultMutation.mutate({
        game_type: 'number_tap',
        score,
        stars,
        difficulty: 'easy',
        category: 'numbers',
      });
    }
  }, [gameState, score, isSignedIn, saveGameResultMutation]);

  const getStars = (finalScore: number) => {
    if (finalScore >= 800) return 3;
    if (finalScore >= 600) return 2;
    return 1;
  };

  const playWord = () => {
    if (currentNumber) {
      speak(currentNumber.chamorro);
    }
  };

  // Generate emoji grid for counting
  const renderCountingGrid = () => {
    if (!currentNumber || !currentItem) return null;
    
    const items = [];
    for (let i = 0; i < currentNumber.value; i++) {
      items.push(
        <span key={i} className="text-3xl sm:text-4xl animate-bounce-in" style={{ animationDelay: `${i * 50}ms` }}>
          {currentItem.emoji}
        </span>
      );
    }
    
    return (
      <div className="flex flex-wrap justify-center gap-2 p-4">
        {items}
      </div>
    );
  };

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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🔢</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-brown-800 dark:text-white">Number Tap</h1>
                <p className="text-[10px] text-brown-500 dark:text-gray-400">Count and learn!</p>
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

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/50 dark:to-cyan-900/50 mb-4 shadow-lg">
                <span className="text-5xl">🔢</span>
              </div>
              <h2 className="text-2xl font-bold text-brown-800 dark:text-white mb-2">Number Tap</h2>
              <p className="text-brown-600 dark:text-gray-400">
                Listen to the Chamorro number and tap how many items you see!
              </p>
            </div>

            {/* Numbers Preview */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg mb-6">
              <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 mb-3">Numbers you'll learn:</h3>
              <div className="grid grid-cols-5 gap-2">
                {NUMBERS.slice(0, 10).map(num => (
                  <div
                    key={num.value}
                    className="text-center p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg"
                  >
                    <span className="text-xl font-bold text-teal-600 dark:text-teal-400">{num.value}</span>
                    <span className="block text-[10px] text-brown-500 dark:text-gray-400">{num.chamorro}</span>
                  </div>
                ))}
              </div>
            </div>

            <TTSDisclaimer variant="banner" className="mb-4" />

            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Play className="w-6 h-6" />
              Start Game
            </button>
            
            <p className="text-center text-sm text-brown-500 dark:text-gray-500 mt-3">
              Games today: {getCount('game')}/{getLimit('game')}
            </p>
          </div>
        )}

        {/* Playing Screen */}
        {(gameState === 'playing' || gameState === 'feedback') && currentNumber && currentItem && (
          <div className="animate-fade-in">
            {/* Progress & Score */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-brown-600 dark:text-gray-400">
                  Round {currentRound}/{ROUNDS_PER_GAME}
                </span>
                {streak >= 2 && (
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-bold">
                    🔥 {streak}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="font-bold text-brown-800 dark:text-white">{score}</span>
              </div>
            </div>

            {/* Audio Button */}
            <button
              onClick={playWord}
              disabled={isSpeaking}
              className={`w-full py-4 rounded-2xl mb-4 transition-all flex flex-col items-center justify-center gap-2 ${
                isSpeaking
                  ? 'bg-teal-500 text-white scale-105'
                  : 'bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/50 dark:to-cyan-900/50 hover:from-teal-200 hover:to-cyan-200 dark:hover:from-teal-900/70 dark:hover:to-cyan-900/70 border-2 border-teal-300 dark:border-teal-700'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isSpeaking 
                  ? 'bg-white/20' 
                  : 'bg-teal-500 shadow-lg shadow-teal-500/30'
              }`}>
                <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse text-white' : 'text-white'}`} />
              </div>
              
              <div className="text-center">
                <span className={`text-xl font-bold block ${isSpeaking ? 'text-white' : 'text-teal-700 dark:text-teal-300'}`}>
                  {currentNumber.chamorro}
                </span>
                <span className={`text-xs ${isSpeaking ? 'text-white/80' : 'text-teal-500 dark:text-teal-400'}`}>
                  {isSpeaking ? '🔊 Playing...' : '👆 Tap to hear'}
                </span>
              </div>
            </button>

            {/* Counting Grid */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-6 min-h-[120px] flex items-center justify-center shadow-lg border-2 border-cream-200 dark:border-slate-700">
              <div className="text-center">
                <p className="text-sm text-brown-500 dark:text-gray-400 mb-2">Count the {currentItem.name}s!</p>
                {renderCountingGrid()}
              </div>
            </div>

            {/* Number Options */}
            <div className="grid grid-cols-2 gap-4">
              {options.map((value, index) => {
                const isSelected = selectedAnswer === value;
                const isCorrectAnswer = value === currentNumber.value;
                const showResult = gameState === 'feedback';
                
                let buttonClass = 'bg-white dark:bg-slate-800 border-2 border-cream-200 dark:border-slate-700 hover:border-teal-400 hover:scale-105';
                
                if (showResult) {
                  if (isCorrectAnswer) {
                    buttonClass = 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 scale-105';
                  } else if (isSelected && !isCorrectAnswer) {
                    buttonClass = 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500 opacity-60';
                  } else {
                    buttonClass = 'bg-white dark:bg-slate-800 border-2 border-cream-200 dark:border-slate-700 opacity-40';
                  }
                }
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(value)}
                    disabled={gameState === 'feedback'}
                    className={`p-6 rounded-2xl transition-all ${buttonClass}`}
                  >
                    <span className="text-4xl font-bold text-teal-600 dark:text-teal-400 block">{value}</span>
                    {showResult && isCorrectAnswer && (
                      <span className="text-sm font-medium text-green-600 dark:text-green-400 block mt-1">
                        {NUMBERS.find(n => n.value === value)?.chamorro}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Feedback Message */}
            {gameState === 'feedback' && (
              <div className={`mt-6 p-4 rounded-xl text-center ${
                isCorrect 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {isCorrect ? (
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-bold">Bunitu! (+{100 + (streak >= 3 ? 50 : streak >= 2 ? 25 : 0)})</span>
                  </div>
                ) : (
                  <div>
                    <span className="font-medium">The answer was: </span>
                    <span className="font-bold">{currentNumber.value} ({currentNumber.chamorro})</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Complete Screen */}
        {gameState === 'complete' && (
          <div className="animate-fade-in text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/50 dark:to-yellow-800/50 mb-6 shadow-lg">
              <Trophy className="w-12 h-12 text-yellow-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-brown-800 dark:text-white mb-2">
              Håfa Adai! Great Job!
            </h2>
            
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map(star => (
                <Star
                  key={star}
                  className={`w-10 h-10 ${
                    star <= getStars(score)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg mb-6">
              <div className="text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">{score}</div>
              <div className="text-brown-600 dark:text-gray-400">points</div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setGameState('setup');
                  hasSavedRef.current = false;
                }}
                className="flex-1 py-3 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 rounded-xl font-medium hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
              <Link
                to="/games"
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                More Games
              </Link>
            </div>
          </div>
        )}
      </main>

      {showUpgradePrompt && (
        <UpgradePrompt
          feature="games"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}

