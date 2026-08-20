import { useState, useEffect, useRef, useCallback } from 'react';
import { Headphones, Volume2, Play, Sparkles } from 'lucide-react';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { useSpeech } from '../hooks/useSpeech';
import { UpgradePrompt } from './UpgradePrompt';
import { TTSDisclaimer } from './TTSDisclaimer';
import { formatUsageSummary } from '../lib/usageDisplay';
import { GamePage, GamePageHeader, GameProgress, GameResult } from './games/GamePage';

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
      { chamorro: 'Månnge\'', english: 'Delicious', emoji: '😋' },
      { chamorro: 'Kåtne', english: 'Meat', emoji: '🍖' },
      { chamorro: 'Chåda\'', english: 'Egg', emoji: '🥚' },
      { chamorro: 'Hånom', english: 'Water', emoji: '💧' },
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
      { chamorro: 'Puti\'on', english: 'Star', emoji: '⭐' },
      { chamorro: 'Uchan', english: 'Rain', emoji: '🌧️' },
      { chamorro: 'Manglo\'', english: 'Wind', emoji: '💨' },
    ],
  },
  {
    id: 'numbers',
    name: 'Numbers',
    icon: '🔢',
    words: [
      { chamorro: 'Unu', english: 'One', emoji: '1️⃣' },
      { chamorro: 'Dos', english: 'Two', emoji: '2️⃣' },
      { chamorro: 'Tres', english: 'Three', emoji: '3️⃣' },
      { chamorro: 'Kuåtro', english: 'Four', emoji: '4️⃣' },
      { chamorro: 'Sinko', english: 'Five', emoji: '5️⃣' },
      { chamorro: 'Sais', english: 'Six', emoji: '6️⃣' },
      { chamorro: 'Siete', english: 'Seven', emoji: '7️⃣' },
      { chamorro: 'Ocho', english: 'Eight', emoji: '8️⃣' },
    ],
  },
];

const ROUNDS_PER_GAME = 10;

type GameState = 'setup' | 'playing' | 'feedback' | 'complete';

export function SoundMatch() {
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const hasSavedRef = useRef(false);
  const { canUse, tryUse, getCount, getLimit } = useSubscription();
  const { speak, preload, isSpeaking } = useSpeech(); // Use shared TTS hook with preloading
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const [selectedCategory, setSelectedCategory] = useState<Category>(GAME_CATEGORIES[0]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [currentWord, setCurrentWord] = useState<WordItem | null>(null);
  const [options, setOptions] = useState<WordItem[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  // Generate a new round
  const generateRound = useCallback(() => {
    const categoryWords = selectedCategory.words;
    
    // Filter out words we've already used (if possible)
    let availableWords = categoryWords.filter(w => !usedWords.has(w.chamorro));
    if (availableWords.length < 4) {
      // Reset if we're running low
      setUsedWords(new Set());
      availableWords = categoryWords;
    }
    
    // Pick a random word as the correct answer
    const correctWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    
    // Pick 3 wrong answers
    const wrongOptions = categoryWords
      .filter(w => w.chamorro !== correctWord.chamorro)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    // Combine and shuffle
    const allOptions = [correctWord, ...wrongOptions].sort(() => Math.random() - 0.5);
    
    setCurrentWord(correctWord);
    setOptions(allOptions);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setUsedWords(prev => new Set([...prev, correctWord.chamorro]));
    
    // 🚀 Preload audio in background so it's ready when user taps
    preload(correctWord.chamorro);
    // Also preload "Bunitu!" for correct answer feedback
    preload('Bunitu!');
  }, [selectedCategory, usedWords, preload]);

  // Start the game
  const startGame = async () => {
    // Check subscription limits
    if (!canUse('game')) {
      setShowUpgradePrompt(true);
      return;
    }
    
    // Try to use a game
    const success = await tryUse('game');
    if (!success) {
      setShowUpgradePrompt(true);
      return;
    }
    
    setGameState('playing');
    setCurrentRound(1);
    setScore(0);
    setStreak(0);
    setUsedWords(new Set());
    hasSavedRef.current = false;
    generateRound();
  };

  // Handle answer selection
  const handleAnswer = (word: WordItem) => {
    if (selectedAnswer !== null) return; // Already answered
    
    setSelectedAnswer(word.emoji);
    const correct = word.chamorro === currentWord?.chamorro;
    setIsCorrect(correct);
    setGameState('feedback');
    
    if (correct) {
      const streakBonus = streak >= 3 ? 50 : streak >= 2 ? 25 : 0;
      setScore(prev => prev + 100 + streakBonus);
      setStreak(prev => prev + 1);
      // Play celebration sound/speak
      speak('Bunitu!'); // "Beautiful!" in Chamorro
    } else {
      setStreak(0);
      // Speak the correct answer
      setTimeout(() => {
        speak(currentWord?.chamorro || '');
      }, 500);
    }
    
    // Move to next round after delay
    setTimeout(() => {
      if (currentRound >= ROUNDS_PER_GAME) {
        setGameState('complete');
      } else {
        setCurrentRound(prev => prev + 1);
        setGameState('playing');
        generateRound();
      }
    }, correct ? 1500 : 2500); // Longer delay for wrong answers to hear correct pronunciation
  };

  // Save game result when complete
  useEffect(() => {
    if (gameState === 'complete' && isSignedIn && !hasSavedRef.current) {
      hasSavedRef.current = true;
      const stars = score >= 800 ? 3 : score >= 600 ? 2 : 1;
      saveGameResultMutation.mutate({
        game_type: 'sound_match',
        score,
        stars,
        difficulty: 'easy',
        category_id: selectedCategory.id,
        category_title: selectedCategory.name,
      });
    }
  }, [gameState, score, isSignedIn, saveGameResultMutation, selectedCategory]);

  // Calculate stars for display
  const getStars = (finalScore: number) => {
    if (finalScore >= 800) return 3;
    if (finalScore >= 600) return 2;
    return 1;
  };

  // Play the current word
  const playWord = () => {
    if (currentWord) {
      speak(currentWord.chamorro);
    }
  };

  return (
    <GamePage>
      <GamePageHeader title="Sound Match" subtitle="Listen and choose the matching picture" icon={Headphones} hasSpeech />

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">No reading needed</p>
              <h2 className="mt-1 text-2xl font-bold text-brown-950 dark:text-white">Choose what to practice</h2>
              <p className="mt-2 text-brown-600 dark:text-gray-300">You’ll hear each Chamorro word before choosing a picture.</p>
            </div>

            {/* Category Selection */}
            <div className="mb-6 rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-3 text-sm font-semibold text-brown-700 dark:text-gray-300">Topic</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GAME_CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={selectedCategory.id === category.id}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedCategory.id === category.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                        : 'border-cream-200 dark:border-slate-700 hover:border-purple-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{category.icon}</span>
                    <span className="text-sm font-medium text-brown-700 dark:text-gray-300">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* TTS Disclaimer */}
            <TTSDisclaimer variant="banner" className="mb-4" />

            {/* Start Button */}
            <button
              onClick={startGame}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 font-bold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
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
        {(gameState === 'playing' || gameState === 'feedback') && currentWord && (
          <div className="animate-fade-in">
            <GameProgress current={currentRound} total={ROUNDS_PER_GAME} score={score} streak={streak} />

            {/* Audio Button - Always shows word, tap to hear */}
            <button
              onClick={playWord}
              disabled={isSpeaking}
              className={`w-full py-5 rounded-2xl mb-6 transition-all flex flex-col items-center justify-center gap-2 ${
                isSpeaking
                  ? 'bg-purple-500 text-white scale-105'
                  : 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 hover:from-purple-200 hover:to-pink-200 dark:hover:from-purple-900/70 dark:hover:to-pink-900/70 border-2 border-purple-300 dark:border-purple-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isSpeaking 
                  ? 'bg-white/20' 
                  : 'bg-purple-500 shadow-lg shadow-purple-500/30'
              }`}>
                <Volume2 className={`w-6 h-6 ${isSpeaking ? 'animate-pulse text-white' : 'text-white'}`} />
              </div>
              
              {/* Always show the Chamorro word */}
              {currentWord && (
                <div className="text-center">
                  <span className={`text-2xl font-bold block ${isSpeaking ? 'text-white' : 'text-purple-700 dark:text-purple-300'}`}>
                    {currentWord.chamorro}
                  </span>
                  <span className={`text-sm ${isSpeaking ? 'text-white/80' : 'text-purple-500 dark:text-purple-400'}`}>
                    {isSpeaking ? '🔊 Playing...' : '👆 Tap to hear'}
                  </span>
                </div>
              )}
            </button>

            {/* Answer Options - Big Emoji Buttons */}
            <div className="grid grid-cols-2 gap-4">
              {options.map((option, index) => {
                const isSelected = selectedAnswer === option.emoji;
                const isCorrectAnswer = option.chamorro === currentWord.chamorro;
                const showResult = gameState === 'feedback';
                
                let buttonClass = 'bg-white dark:bg-slate-800 border-2 border-cream-200 dark:border-slate-700 hover:border-purple-400 hover:scale-105';
                
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
                    onClick={() => handleAnswer(option)}
                    disabled={gameState === 'feedback'}
                    aria-label={option.english}
                    className={`p-6 sm:p-8 rounded-2xl transition-all ${buttonClass}`}
                  >
                    <span className="text-5xl sm:text-6xl block mb-2">{option.emoji}</span>
                    {showResult && (
                      <span className={`text-sm font-medium ${isCorrectAnswer ? 'text-green-600 dark:text-green-400' : 'text-brown-500 dark:text-gray-500'}`}>
                        {option.english}
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
                    <span className="font-bold">{currentWord.chamorro}</span>
                    <span className="text-sm block mt-1">({currentWord.english})</span>
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

      {/* Upgrade Prompt */}
      {showUpgradePrompt && (
        <UpgradePrompt
          feature="game"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </GamePage>
  );
}
