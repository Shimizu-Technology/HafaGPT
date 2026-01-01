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

// Body parts with visual representations
interface BodyPart {
  chamorro: string;
  english: string;
  emoji: string;
  instruction: string; // Chamorro instruction
}

const BODY_PARTS: BodyPart[] = [
  { chamorro: 'Ulo', english: 'Head', emoji: '🧠', instruction: "Påtti i ulo-mu!" },
  { chamorro: 'Mata', english: 'Eyes', emoji: '👁️', instruction: "Påtti i mata-mu!" },
  { chamorro: 'Talanga', english: 'Ears', emoji: '👂', instruction: "Påtti i talanga-mu!" },
  { chamorro: 'Gui\'eng', english: 'Nose', emoji: '👃', instruction: "Påtti i gui'eng-mu!" },
  { chamorro: 'Pachot', english: 'Mouth', emoji: '👄', instruction: "Påtti i pachot-mu!" },
  { chamorro: 'Kanai', english: 'Hand', emoji: '✋', instruction: "Na'fåna i kanai-mu!" },
  { chamorro: 'Addeng', english: 'Foot', emoji: '🦶', instruction: "Na'fåna i addeng-mu!" },
  { chamorro: 'Tata\'ao', english: 'Stomach', emoji: '🫃', instruction: "Påtti i tata'ao-mu!" },
];

const ROUNDS_PER_GAME = 10;

type GameState = 'setup' | 'playing' | 'listening' | 'feedback' | 'complete';

export function SimonSays() {
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
  const [currentBodyPart, setCurrentBodyPart] = useState<BodyPart | null>(null);
  const [options, setOptions] = useState<BodyPart[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [usedParts, setUsedParts] = useState<Set<string>>(new Set());
  const [showInstruction, setShowInstruction] = useState(true);

  // Generate a new round
  const generateRound = useCallback(() => {
    // Filter out body parts we've already used (if possible)
    let availableParts = BODY_PARTS.filter(p => !usedParts.has(p.chamorro));
    if (availableParts.length < 4) {
      setUsedParts(new Set());
      availableParts = BODY_PARTS;
    }
    
    // Pick a random body part as the correct answer
    const correctPart = availableParts[Math.floor(Math.random() * availableParts.length)];
    
    // Pick 3 wrong answers
    const wrongOptions = BODY_PARTS
      .filter(p => p.chamorro !== correctPart.chamorro)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    // Combine and shuffle
    const allOptions = [correctPart, ...wrongOptions].sort(() => Math.random() - 0.5);
    
    setCurrentBodyPart(correctPart);
    setOptions(allOptions);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setUsedParts(prev => new Set([...prev, correctPart.chamorro]));
    setShowInstruction(true);
    
    // Preload audio
    preload(correctPart.instruction);
    preload('Bunitu!');
    
    // Auto-play the instruction after a short delay
    setTimeout(() => {
      speak(correctPart.instruction);
      setGameState('listening');
    }, 500);
  }, [usedParts, preload, speak]);

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
    setUsedParts(new Set());
    hasSavedRef.current = false;
    generateRound();
  };

  // Handle answer selection
  const handleAnswer = (part: BodyPart) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(part.chamorro);
    const correct = part.chamorro === currentBodyPart?.chamorro;
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
        speak(currentBodyPart?.chamorro || '');
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
        game_type: 'simon_says',
        score,
        stars,
        difficulty: 'easy',
        category: 'body_parts',
      });
    }
  }, [gameState, score, isSignedIn, saveGameResultMutation]);

  const getStars = (finalScore: number) => {
    if (finalScore >= 800) return 3;
    if (finalScore >= 600) return 2;
    return 1;
  };

  const playInstruction = () => {
    if (currentBodyPart) {
      speak(currentBodyPart.instruction);
    }
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">👆</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-brown-800 dark:text-white">Simon Says</h1>
                <p className="text-[10px] text-brown-500 dark:text-gray-400">Touch your body parts!</p>
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
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 mb-4 shadow-lg">
                <span className="text-5xl">👆</span>
              </div>
              <h2 className="text-2xl font-bold text-brown-800 dark:text-white mb-2">Simon Says</h2>
              <p className="text-brown-600 dark:text-gray-400">
                Listen to the Chamorro command and tap the correct body part!
              </p>
            </div>

            {/* Body Parts Preview */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg mb-6">
              <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 mb-3">Body parts you'll learn:</h3>
              <div className="grid grid-cols-4 gap-2">
                {BODY_PARTS.map(part => (
                  <div
                    key={part.chamorro}
                    className="text-center p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"
                  >
                    <span className="text-2xl block">{part.emoji}</span>
                    <span className="text-[10px] text-brown-600 dark:text-gray-400 block">{part.chamorro}</span>
                  </div>
                ))}
              </div>
            </div>

            <TTSDisclaimer variant="banner" className="mb-4" />

            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Play className="w-6 h-6" />
              Start Game
            </button>
            
            <p className="text-center text-sm text-brown-500 dark:text-gray-500 mt-3">
              Games today: {getCount('game')}/{getLimit('game')}
            </p>
          </div>
        )}

        {/* Playing/Listening Screen */}
        {(gameState === 'playing' || gameState === 'listening' || gameState === 'feedback') && currentBodyPart && (
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

            {/* Instruction Card */}
            <button
              onClick={playInstruction}
              disabled={isSpeaking}
              className={`w-full py-5 rounded-2xl mb-6 transition-all flex flex-col items-center justify-center gap-2 ${
                isSpeaking
                  ? 'bg-indigo-500 text-white scale-105'
                  : 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 hover:from-indigo-200 hover:to-purple-200 dark:hover:from-indigo-900/70 dark:hover:to-purple-900/70 border-2 border-indigo-300 dark:border-indigo-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isSpeaking 
                  ? 'bg-white/20' 
                  : 'bg-indigo-500 shadow-lg shadow-indigo-500/30'
              }`}>
                <Volume2 className={`w-6 h-6 ${isSpeaking ? 'animate-pulse text-white' : 'text-white'}`} />
              </div>
              
              <div className="text-center">
                <span className={`text-lg font-bold block ${isSpeaking ? 'text-white' : 'text-indigo-700 dark:text-indigo-300'}`}>
                  "{currentBodyPart.instruction}"
                </span>
                <span className={`text-xs block mt-1 ${isSpeaking ? 'text-white/80' : 'text-indigo-500 dark:text-indigo-400'}`}>
                  "Touch your {currentBodyPart.english.toLowerCase()}!"
                </span>
                <span className={`text-sm mt-2 ${isSpeaking ? 'text-white/80' : 'text-indigo-500 dark:text-indigo-400'}`}>
                  {isSpeaking ? '🔊 Playing...' : '👆 Tap to hear again'}
                </span>
              </div>
            </button>

            {/* Body Part Options - Big buttons with emojis */}
            <div className="grid grid-cols-2 gap-4">
              {options.map((part, index) => {
                const isSelected = selectedAnswer === part.chamorro;
                const isCorrectAnswer = part.chamorro === currentBodyPart.chamorro;
                const showResult = gameState === 'feedback';
                
                let buttonClass = 'bg-white dark:bg-slate-800 border-2 border-cream-200 dark:border-slate-700 hover:border-indigo-400 hover:scale-105';
                
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
                    onClick={() => handleAnswer(part)}
                    disabled={gameState === 'feedback'}
                    className={`p-6 rounded-2xl transition-all ${buttonClass}`}
                  >
                    <span className="text-5xl block mb-2">{part.emoji}</span>
                    <span className={`text-sm font-medium block ${
                      showResult && isCorrectAnswer 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-brown-600 dark:text-gray-400'
                    }`}>
                      {part.chamorro}
                    </span>
                    {showResult && (
                      <span className="text-xs text-brown-500 dark:text-gray-500 block">
                        ({part.english})
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
                    <span className="font-bold">{currentBodyPart.chamorro}</span>
                    <span className="text-sm block mt-1">({currentBodyPart.english})</span>
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
              <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">{score}</div>
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
                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
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

