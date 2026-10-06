import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';

interface FlashcardProps {
  front: string;
  back: string;
  pronunciation?: string;
  example?: string;
  onFlip?: (isFlipped: boolean) => void; // Callback when card is flipped
}

export function Flashcard({ front, back, pronunciation, example, onFlip }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const { speak, stop, isSpeaking, isSupported } = useSpeech();

  // Reset flip state when card content changes
  useEffect(() => {
    setIsFlipped(false);
  }, [front, back]);

  const handleFlip = () => {
    const newFlippedState = !isFlipped;
    setIsFlipped(newFlippedState);
    onFlip?.(newFlippedState);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(front);
    }
  };

  const handleSpeak = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent flip when clicking audio button
    toggleSpeech();
  };

  const handleSpeakTouch = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSpeech();
  };

  return (
    <div className="relative h-[clamp(12rem,30dvh,17rem)] w-full perspective-1000 sm:h-[clamp(16rem,40dvh,24rem)]">
      <button
        type="button"
        onClick={handleFlip}
        aria-pressed={isFlipped}
        aria-label={isFlipped ? `Show the Chamorro side for ${back}` : `Show the meaning of ${front}`}
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-4 rounded-2xl`}
      >
        {/* Front of card */}
        <div className="absolute inset-0 backface-hidden" aria-hidden={isFlipped}>
          <div className="w-full h-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-cream-300 dark:border-gray-700 flex flex-col p-6">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center">
                <p className="w-full break-words text-3xl sm:text-4xl font-semibold text-brown-800 dark:text-white text-center">
                  {front}
                </p>
              </div>
            </div>

            <p className="shrink-0 text-center text-sm text-brown-500 dark:text-gray-400 mt-4">
              Tap to flip
            </p>
          </div>
        </div>

        {/* Back of card */}
        <div className="absolute inset-0 backface-hidden rotate-y-180" aria-hidden={!isFlipped}>
          <div className="w-full h-full bg-coral-700 dark:bg-teal-800 rounded-2xl shadow-sm border border-coral-800 dark:border-teal-700 flex flex-col p-6 text-white">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex min-h-full flex-col items-center justify-center gap-3">
                <p className="w-full break-words text-2xl sm:text-3xl font-semibold text-center">
                  {back}
                </p>

                {pronunciation && (
                  <p className="w-full break-words text-lg text-white/90 italic text-center">
                    ({pronunciation})
                  </p>
                )}

                {example && (
                  <div className="mt-4 pt-4 border-t border-white/30 w-full">
                    <p className="text-sm text-white/90 text-center mb-1">Example:</p>
                    <p className="break-words text-base text-center">
                      {example}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <p className="shrink-0 text-center text-sm text-white/90 mt-4">
              Tap to flip back
            </p>
          </div>
        </div>
      </button>

      {!isFlipped && isSupported && (
        <button
          type="button"
          onClick={handleSpeak}
          onTouchEnd={handleSpeakTouch}
          aria-label={isSpeaking ? `Stop playing ${front}` : `Listen to ${front}`}
          className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-coral-100 text-coral-600 transition-colors hover:bg-coral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-ocean-900/30 dark:text-ocean-400 dark:hover:bg-ocean-800/50"
        >
          <Volume2 className={`w-5 h-5 ${isSpeaking ? 'motion-safe:animate-pulse' : ''}`} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
