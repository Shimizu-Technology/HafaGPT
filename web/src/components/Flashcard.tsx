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
    // Notify parent when flipped to back (true)
    if (onFlip && newFlippedState) {
      onFlip(newFlippedState);
    }
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent flip when clicking audio button
    if (isSpeaking) {
      stop();
    } else {
      speak(front);
    }
  };

  return (
    <div
      className="relative w-full aspect-[3/4] cursor-pointer perspective-1000"
      onClick={handleFlip}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front of card */}
        <div className="absolute inset-0 backface-hidden">
          <div className="w-full h-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center p-8">
            <div className="flex-1 flex items-center justify-center">
              <p className="text-3xl sm:text-4xl font-semibold text-brown-800 dark:text-white text-center">
                {front}
              </p>
            </div>
            
            {/* Audio button */}
            {isSupported && (
              <button
                onClick={handleSpeak}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSpeak(e as any);
                }}
                className="absolute top-4 right-4 p-3 rounded-full bg-coral-100 dark:bg-ocean-900/30 text-coral-600 dark:text-ocean-400 hover:bg-coral-200 dark:hover:bg-ocean-800/50 transition-colors touch-manipulation"
              >
                <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
              </button>
            )}
            
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
      </div>
    </div>
  );
}

