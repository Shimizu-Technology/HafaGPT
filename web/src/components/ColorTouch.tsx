import { useState, useEffect, useRef, useCallback } from 'react';
import { Palette, Volume2, Play, Sparkles } from 'lucide-react';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { useSpeech } from '../hooks/useSpeech';
import { UpgradePrompt } from './UpgradePrompt';
import { TTSDisclaimer } from './TTSDisclaimer';
import { formatUsageSummary } from '../lib/usageDisplay';
import { GamePage, GamePageHeader, GameProgress, GameResult } from './games/GamePage';

// Color data with visual representations
interface ColorItem {
  chamorro: string;
  english: string;
  hex: string;
  emoji: string;
}

const COLORS: ColorItem[] = [
  { chamorro: "Agaga'", english: 'Red', hex: '#EF4444', emoji: '🔴' },
  { chamorro: 'Asut', english: 'Blue', hex: '#3B82F6', emoji: '🔵' },
  { chamorro: 'Betde', english: 'Green', hex: '#22C55E', emoji: '🟢' },
  { chamorro: 'Amariyu', english: 'Yellow', hex: '#EAB308', emoji: '🟡' },
  { chamorro: 'Kulot kåhet', english: 'Orange', hex: '#F97316', emoji: '🟠' },
  { chamorro: 'Kulot lila', english: 'Purple', hex: '#A855F7', emoji: '🟣' },
  { chamorro: "Å'paka'", english: 'White', hex: '#F8FAFC', emoji: '⚪' },
  { chamorro: 'Åttilung', english: 'Black', hex: '#1E293B', emoji: '⚫' },
  { chamorro: 'Kulot di rosa', english: 'Pink', hex: '#EC4899', emoji: '🩷' },
  { chamorro: 'Kulot chukulåti', english: 'Brown', hex: '#92400E', emoji: '🟤' },
];

const ROUNDS_PER_GAME = 10;

type GameState = 'setup' | 'playing' | 'feedback' | 'complete';

export function ColorTouch() {
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
  const [currentColor, setCurrentColor] = useState<ColorItem | null>(null);
  const [options, setOptions] = useState<ColorItem[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [usedColors, setUsedColors] = useState<Set<string>>(new Set());

  // Generate a new round
  const generateRound = useCallback(() => {
    // Filter out colors we've already used (if possible)
    let availableColors = COLORS.filter(c => !usedColors.has(c.chamorro));
    if (availableColors.length < 4) {
      setUsedColors(new Set());
      availableColors = COLORS;
    }
    
    // Pick a random color as the correct answer
    const correctColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    
    // Pick 3 wrong answers
    const wrongOptions = COLORS
      .filter(c => c.chamorro !== correctColor.chamorro)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    // Combine and shuffle
    const allOptions = [correctColor, ...wrongOptions].sort(() => Math.random() - 0.5);
    
    setCurrentColor(correctColor);
    setOptions(allOptions);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setUsedColors(prev => new Set([...prev, correctColor.chamorro]));
    
    // Preload audio
    preload(correctColor.chamorro);
    preload('Bunitu!');
  }, [usedColors, preload]);

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
    setUsedColors(new Set());
    hasSavedRef.current = false;
    generateRound();
  };

  // Handle answer selection
  const handleAnswer = (color: ColorItem) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(color.chamorro);
    const correct = color.chamorro === currentColor?.chamorro;
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
        speak(currentColor?.chamorro || '');
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
        game_type: 'color_touch',
        score,
        stars,
        difficulty: 'easy',
        category_id: 'colors',
        category_title: 'Colors',
      });
    }
  }, [gameState, score, isSignedIn, saveGameResultMutation]);

  const getStars = (finalScore: number) => {
    if (finalScore >= 800) return 3;
    if (finalScore >= 600) return 2;
    return 1;
  };

  const playWord = () => {
    if (currentColor) {
      speak(currentColor.chamorro);
    }
  };

  return (
    <GamePage>
      <GamePageHeader title="Color Touch" subtitle="Listen and tap the matching color" icon={Palette} hasSpeech />

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">No reading needed</p>
              <h2 className="mt-1 text-2xl font-bold text-brown-950 dark:text-white">Listen first, then choose</h2>
              <p className="mt-2 text-brown-600 dark:text-gray-300">Hear a Chamorro color and tap the matching square.</p>
            </div>

            {/* Color Preview */}
            <div className="mb-6 rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 mb-3">Colors you'll learn:</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {COLORS.slice(0, 8).map(color => (
                  <div
                    key={color.chamorro}
                    className="w-10 h-10 rounded-xl shadow-md border-2 border-white dark:border-slate-600"
                    style={{ backgroundColor: color.hex }}
                    title={`${color.chamorro} (${color.english})`}
                  />
                ))}
              </div>
            </div>

            <TTSDisclaimer variant="banner" className="mb-4" />

            <button
              onClick={startGame}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 font-bold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              <Play className="w-6 h-6" />
              Start Game
            </button>
            
            <p className="text-center text-sm text-brown-500 dark:text-gray-500 mt-3">
              {formatUsageSummary(getCount('game'), getLimit('game'))}
            </p>
          </div>
        )}

        {/* Playing Screen */}
        {(gameState === 'playing' || gameState === 'feedback') && currentColor && (
          <div className="animate-fade-in">
            <GameProgress current={currentRound} total={ROUNDS_PER_GAME} score={score} streak={streak} />

            {/* Audio Button */}
            <button
              onClick={playWord}
              disabled={isSpeaking}
              className={`w-full py-5 rounded-2xl mb-6 transition-all flex flex-col items-center justify-center gap-2 ${
                isSpeaking
                  ? 'bg-pink-500 text-white scale-105'
                  : 'bg-gradient-to-br from-pink-100 to-orange-100 dark:from-pink-900/50 dark:to-orange-900/50 hover:from-pink-200 hover:to-orange-200 dark:hover:from-pink-900/70 dark:hover:to-orange-900/70 border-2 border-pink-300 dark:border-pink-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isSpeaking 
                  ? 'bg-white/20' 
                  : 'bg-pink-500 shadow-lg shadow-pink-500/30'
              }`}>
                <Volume2 className={`w-6 h-6 ${isSpeaking ? 'animate-pulse text-white' : 'text-white'}`} />
              </div>
              
              <div className="text-center">
                <span className={`text-2xl font-bold block ${isSpeaking ? 'text-white' : 'text-pink-700 dark:text-pink-300'}`}>
                  {currentColor.chamorro}
                </span>
                <span className={`text-sm ${isSpeaking ? 'text-white/80' : 'text-pink-500 dark:text-pink-400'}`}>
                  {isSpeaking ? '🔊 Playing...' : '👆 Tap to hear'}
                </span>
              </div>
            </button>

            {/* Color Options - Big colored buttons */}
            <div className="grid grid-cols-2 gap-4">
              {options.map((option, index) => {
                const isSelected = selectedAnswer === option.chamorro;
                const isCorrectAnswer = option.chamorro === currentColor.chamorro;
                const showResult = gameState === 'feedback';
                
                let buttonClass = 'border-4 border-white dark:border-slate-600 hover:scale-105 shadow-lg';
                let overlayClass = '';
                
                if (showResult) {
                  if (isCorrectAnswer) {
                    buttonClass = 'border-4 border-green-500 scale-105 shadow-xl';
                    overlayClass = 'ring-4 ring-green-400 ring-opacity-50';
                  } else if (isSelected && !isCorrectAnswer) {
                    buttonClass = 'border-4 border-red-500 opacity-60';
                  } else {
                    buttonClass = 'border-4 border-white dark:border-slate-600 opacity-40';
                  }
                }
                
                // Handle white and black specially for visibility
                const isWhite = option.english === 'White';
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option)}
                    disabled={gameState === 'feedback'}
                    aria-label={option.english}
                    className={`relative aspect-square rounded-2xl transition-all ${buttonClass} ${overlayClass}`}
                    style={{ 
                      backgroundColor: option.hex,
                      boxShadow: isWhite ? 'inset 0 0 0 2px rgba(0,0,0,0.1)' : undefined
                    }}
                  >
                    {/* Checkmark or X for feedback */}
                    {showResult && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {isCorrectAnswer && (
                          <span className="text-4xl drop-shadow-lg">✅</span>
                        )}
                        {isSelected && !isCorrectAnswer && (
                          <span className="text-4xl drop-shadow-lg">❌</span>
                        )}
                      </div>
                    )}
                    
                    {/* Label on hover/feedback */}
                    {showResult && (
                      <div className={`absolute bottom-2 left-0 right-0 text-center ${
                        isWhite || option.english === 'Yellow' ? 'text-gray-800' : 'text-white'
                      }`}>
                        <span className="text-sm font-bold drop-shadow-md bg-black/20 px-2 py-0.5 rounded-full">
                          {option.english}
                        </span>
                      </div>
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
                    <span className="font-bold">{currentColor.chamorro}</span>
                    <span className="text-sm block mt-1">({currentColor.english})</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Complete Screen */}
        {gameState === 'complete' && (
          <GameResult
            score={score}
            stars={getStars(score)}
            heading="Håfa adai! Great job!"
            onReplay={() => {
              setGameState('setup');
              hasSavedRef.current = false;
            }}
          />
        )}
      </main>

      {showUpgradePrompt && (
        <UpgradePrompt
          feature="game"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </GamePage>
  );
}
