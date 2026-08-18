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
    <div className="relative w-full aspect-[3/4] perspective-1000">
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
        <div className="absolute inset-0 backface-hidden">
          <div className="w-full h-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center p-8">
            <div className="flex-1 flex items-center justify-center">
              <p className="text-3xl sm:text-4xl font-semibold text-brown-800 dark:text-white text-center">
                {front}
              </p>
            </div>
            
            <p className="text-sm text-brown-500 dark:text-gray-400 mt-4">
              Tap to flip
            </p>
          </div>
        </div>

        {/* Back of card */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <div className="w-full h-full bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-600 dark:to-ocean-700 rounded-2xl shadow-xl border-2 border-coral-400 dark:border-ocean-600 flex flex-col items-center justify-center p-8 text-white">
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <p className="text-2xl sm:text-3xl font-semibold text-center">
                {back}
              </p>
              
              {pronunciation && (
                <p className="text-lg text-white/90 italic text-center">
                  ({pronunciation})
                </p>
              )}
              
              {example && (
                <div className="mt-4 pt-4 border-t border-white/30 w-full">
                  <p className="text-sm text-white/70 text-center mb-1">Example:</p>
                  <p className="text-base text-center">
                    {example}
                  </p>
                </div>
              )}
            </div>
            
            <p className="text-sm text-white/70 mt-4">
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
