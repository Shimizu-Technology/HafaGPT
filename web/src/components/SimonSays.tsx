import { useGameRoundGuard } from '../hooks/useGameRoundGuard';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Hand, Volume2, Play, Sparkles } from 'lucide-react';
import { useGameTimers } from '../hooks/useGameTimers';
import { GameSaveStatus } from './games/GameSaveStatus';
import { createClientAttemptId } from '../lib/clientAttemptId';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useGameSubscription } from '../hooks/useGameSubscription';
import { useGameAudioPrompt } from '../hooks/useGameAudioPrompt';
import { GameAudioStatus } from './games/GameAudioStatus';
import { UpgradePrompt } from './UpgradePrompt';
import { TTSDisclaimer } from './TTSDisclaimer';
import { formatUsageSummary } from '../lib/usageDisplay';
import { GamePage, GamePageHeader, GameProgress, GameResult } from './games/GamePage';

// Body parts with visual representations
interface BodyPart {
  chamorro: string;
  english: string;
  emoji: string;
  instruction: string; // Chamorro instruction
}

const BODY_PARTS: BodyPart[] = [
  { chamorro: 'Ulu', english: 'Head', emoji: '🧠', instruction: "Påtti i ulu-mu!" },
  { chamorro: 'Åtadok', english: 'Eyes', emoji: '👁️', instruction: "Påtti i åtadok-mu!" },
  { chamorro: 'Talanga', english: 'Ears', emoji: '👂', instruction: "Påtti i talanga-mu!" },
  { chamorro: 'Gui\'eng', english: 'Nose', emoji: '👃', instruction: "Påtti i gui'eng-mu!" },
  { chamorro: 'Pachot', english: 'Mouth', emoji: '👄', instruction: "Påtti i pachot-mu!" },
  { chamorro: 'Kannai', english: 'Hand', emoji: '✋', instruction: "Na'fåna i kannai-mu!" },
  { chamorro: 'Addeng', english: 'Foot', emoji: '🦶', instruction: "Na'fåna i addeng-mu!" },
  { chamorro: 'Tuyan', english: 'Stomach', emoji: '🫃', instruction: "Påtti i tuyan-mu!" },
];

const ROUNDS_PER_GAME = 10;

type GameState = 'setup' | 'playing' | 'listening' | 'feedback' | 'complete';

export function SimonSays() {
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const resultUnresolved = !!(saveGameResultMutation.isPending || saveGameResultMutation.isError);
  const hasSavedRef = useRef(false);
  const startingRef = useRef(false);
  const gameAttemptIdRef = useRef(createClientAttemptId());
  const { schedule, clear: clearTimers } = useGameTimers();
  const { canUse, tryUse, getCount, getLimit, startStatus, getRoundAttemptId } = useGameSubscription();
  const audio = useGameAudioPrompt();
  const { speak, preload, isSpeaking, listen, resetPrompt } = audio;
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const guard = useGameRoundGuard((gameState === 'playing' || gameState === 'listening' || gameState === 'feedback') || startStatus.pending,
    resultUnresolved || (!!isSignedIn && gameState === 'complete' && !saveGameResultMutation.isSuccess),
    saveGameResultMutation.isError && saveGameResultMutation.variables ? () => saveGameResultMutation.mutate(saveGameResultMutation.variables!) : undefined);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [awardedPoints, setAwardedPoints] = useState(0);
  const [currentBodyPart, setCurrentBodyPart] = useState<BodyPart | null>(null);
  const [options, setOptions] = useState<BodyPart[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [usedParts, setUsedParts] = useState<Set<string>>(new Set());
  // Generate a new round
  const generateRound = useCallback(() => {
    resetPrompt();
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

    // Preload audio
    preload(correctPart.instruction);
    preload('Bunitu!');

    setGameState('playing');
  }, [usedParts, preload, resetPrompt]);

  // Start the game
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
      setGameState('playing');
      setCurrentRound(1);
      setScore(0);
      setStreak(0);
      setUsedParts(new Set());
      hasSavedRef.current = false;
      gameAttemptIdRef.current = getRoundAttemptId();
      generateRound();

    } finally {
      startingRef.current = false;
    }
  };

  // Handle answer selection
  const handleAnswer = (part: BodyPart) => {
    if (selectedAnswer !== null || !audio.canAnswer) return;

    clearTimers();
    setSelectedAnswer(part.chamorro);
    const correct = part.chamorro === currentBodyPart?.chamorro;
    setIsCorrect(correct);
    setGameState('feedback');

    if (correct) {
      const streakBonus = streak >= 3 ? 50 : streak >= 2 ? 25 : 0;
      const points = 100 + streakBonus;
      setAwardedPoints(points);
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      speak('Bunitu!');
    } else {
      setStreak(0);
      schedule(() => {
        speak(currentBodyPart?.chamorro || '');
      }, 500);
    }


  };

  const continueRound = () => {
    audio.stop();
    clearTimers();
    if (currentRound >= ROUNDS_PER_GAME) {
      setGameState('complete');
    } else {
      setCurrentRound(prev => prev + 1);
      setGameState('playing');
      generateRound();
    }
  };

  // Save game result when complete
  useEffect(() => {
    if (gameState === 'complete' && isSignedIn && !hasSavedRef.current) {
      hasSavedRef.current = true;
      const stars = score >= 800 ? 3 : score >= 600 ? 2 : 1;
      saveGameResultMutation.mutate({
        client_attempt_id: gameAttemptIdRef.current,
        game_type: 'simon_says',
        score,
        stars,
        difficulty: 'easy',
        category_id: 'body_parts',
        category_title: 'Body Parts',
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
      void listen(currentBodyPart.instruction);
    }
  };

  return (
    <GamePage guard={guard} startStatus={startStatus} stage={gameState}>
      <GamePageHeader title="Simon Says" subtitle="Listen and follow the Chamorro command" icon={Hand} hasSpeech />

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Setup Screen */}
        {gameState === 'setup' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-brown-950 dark:text-white">Listen and follow along</h2>
              <p className="mt-2 text-brown-600 dark:text-gray-300">No reading needed: hear a Chamorro command and choose the matching body part.</p>
            </div>

            {/* Body Parts Preview */}
            <div className="mb-6 rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="text-sm font-semibold text-brown-700 dark:text-gray-300 mb-3">Body parts you'll learn:</h3>
              <div className="grid grid-cols-4 gap-2">
                {BODY_PARTS.map(part => (
                  <div
                    key={part.chamorro}
                    className="text-center p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg"
                  >
                    <span className="text-2xl block">{part.emoji}</span>
                    <span className="text-xs text-brown-600 dark:text-gray-400 block">{part.chamorro}</span>
                  </div>
                ))}
              </div>
            </div>

            <TTSDisclaimer variant="banner" className="mb-4" />

            <button
              onClick={startGame}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-coral-700 px-5 font-bold text-white [@media(hover:hover)_and_(pointer:fine)]:hover:bg-coral-800 dark:bg-teal-700 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-teal-800"
             disabled={startStatus.pending}>
              <Play className="w-6 h-6" />
              Start Game
            </button>

            <p className="text-center text-sm text-brown-500 dark:text-gray-400 mt-3">
              {formatUsageSummary(getCount('game'), getLimit('game'))}
            </p>
          </div>
        )}

        {/* Playing/Listening Screen */}
        {(gameState === 'playing' || gameState === 'listening' || gameState === 'feedback') && currentBodyPart && (
          <div className="animate-fade-in">
            <GameProgress current={currentRound} total={ROUNDS_PER_GAME} score={score} streak={streak} />

            {/* Instruction Card */}
            <button
              onClick={playInstruction}
              disabled={isSpeaking}
              className={`w-full py-5 rounded-2xl mb-6 transition-colors flex flex-col items-center justify-center gap-2 ${
                isSpeaking
                  ? 'bg-teal-700 text-white '
                  : 'bg-teal-100 dark:bg-teal-900/50 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-teal-200 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-teal-900/70 border-2 border-teal-300 dark:border-teal-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isSpeaking
                  ? 'bg-white/20'
                  : 'bg-teal-700 '
              }`}>
                <Volume2 className={`w-6 h-6 ${isSpeaking ? 'animate-pulse text-white' : 'text-white'}`} />
              </div>

              <div className="text-center">
                <span className={`text-lg font-bold block ${isSpeaking ? 'text-white' : 'text-teal-700 dark:text-teal-300'}`}>
                  "{currentBodyPart.instruction}"
                </span>
                <span className={`text-xs block mt-1 ${isSpeaking ? 'text-white/90' : 'text-teal-700 dark:text-teal-400'}`}>
                  "Touch your {currentBodyPart.english.toLowerCase()}!"
                </span>
                <span className={`text-sm mt-2 ${isSpeaking ? 'text-white/90' : 'text-teal-700 dark:text-teal-400'}`}>
                  {isSpeaking ? 'Playing…' : 'Tap to hear'}
                </span>
              </div>
            </button>

            <GameAudioStatus audio={audio} onRetry={playInstruction} />

            {/* Body Part Options - Big buttons with emojis */}
            <div className="grid grid-cols-2 gap-4">
              {options.map((part, index) => {
                const isSelected = selectedAnswer === part.chamorro;
                const isCorrectAnswer = part.chamorro === currentBodyPart.chamorro;
                const showResult = gameState === 'feedback';

                let buttonClass = 'bg-white dark:bg-slate-800 border-2 border-cream-200 dark:border-slate-700 [@media(hover:hover)_and_(pointer:fine)]:hover:border-teal-400 ';

                if (showResult) {
                  if (isCorrectAnswer) {
                    buttonClass = 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 ';
                  } else if (isSelected && !isCorrectAnswer) {
                    buttonClass = 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500 opacity-60';
                  } else {
                    buttonClass = 'bg-white dark:bg-slate-800 border-2 border-cream-200 dark:border-slate-700 opacity-40';
                  }
                }

                return (
                  <button
                    key={index}
                    aria-label={showResult ? `${part.chamorro} (${part.english})` : part.chamorro}
                    onClick={() => handleAnswer(part)}
                    disabled={gameState === 'feedback' || !audio.canAnswer}
                    className={`p-6 rounded-2xl transition-colors ${buttonClass}`}
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
                      <span className="text-xs text-brown-500 dark:text-gray-400 block">
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
                    <span className="font-bold">Bunitu! (+{awardedPoints})</span>
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
          <GameResult
            replayDisabled={resultUnresolved}
            score={score}
            stars={getStars(score)}
            heading="Håfa adai! Great job!"
            onReplay={() => {
              setGameState('setup');
              hasSavedRef.current = false;
              gameAttemptIdRef.current = getRoundAttemptId();
            }}
          />
        )}
        {gameState === 'feedback' && (
          <button type="button" onClick={continueRound} className="mt-4 min-h-12 w-full rounded-xl bg-coral-700 px-4 font-semibold text-white [@media(hover:hover)_and_(pointer:fine)]:hover:bg-coral-800 dark:bg-teal-700 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-teal-800">
            {currentRound >= ROUNDS_PER_GAME ? 'See results' : 'Next round'}
          </button>
        )}
        {gameState === 'complete' && <GameSaveStatus mutation={saveGameResultMutation} />}
      </main>

      {showUpgradePrompt && !startStatus.error && !startStatus.pending && (
        <UpgradePrompt
          feature="game"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </GamePage>
  );
}
