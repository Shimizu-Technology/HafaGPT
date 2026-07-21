import { useState, useCallback } from 'react';
import { ArrowRight, SkipForward, Volume2, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { LearningTopic } from '../data/learningPath';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { useSpeech } from '../hooks/useSpeech';

interface LessonFlashcardsProps {
  topic: LearningTopic;
  onComplete: (cardsCount: number) => void;
  onSkip: () => void;
}

export function LessonFlashcards({ topic, onComplete, onSkip }: LessonFlashcardsProps) {
  const deck = DEFAULT_FLASHCARD_DECKS[topic.flashcardCategory];
  const cards = deck?.cards || [];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewedCards, setViewedCards] = useState<Set<number>>(new Set([0]));
  
  const { speak, isSpeaking } = useSpeech();

  const currentCard = cards[currentIndex];
  const progress = ((viewedCards.size) / cards.length) * 100;
  const allViewed = viewedCards.size === cards.length;

  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setViewedCards(prev => new Set([...prev, currentIndex + 1]));
    }
  }, [currentIndex, cards.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const handleSpeak = () => {
    if (currentCard) {
      speak(currentCard.front);
    }
  };

  if (!deck || cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-brown-600 dark:text-gray-400">
          No flashcards available for this topic.
        </p>
        <button
          onClick={onSkip}
          className="mt-4 text-coral-600 dark:text-ocean-400 hover:underline"
        >
          Skip to quiz →
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm text-brown-600 dark:text-gray-400">
        <span>{viewedCards.size} of {cards.length} cards viewed</span>
        <span>{currentIndex + 1} / {cards.length}</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-coral-400 to-coral-500 dark:from-ocean-400 dark:to-ocean-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Flashcard */}
      <div className="relative">
        <div
          onClick={handleFlip}
          className="cursor-pointer perspective-1000"
        >
          <div
            className={`relative w-full aspect-[4/3] sm:aspect-[3/2] transition-transform duration-500 transform-style-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-cream-200/50 dark:border-slate-700/50 flex flex-col items-center justify-center p-6 backface-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak();
                }}
                disabled={isSpeaking}
                className="absolute top-4 right-4 p-3 rounded-full bg-coral-100 dark:bg-ocean-900/40 
                         text-coral-600 dark:text-ocean-400 hover:bg-coral-200 dark:hover:bg-ocean-800/40 
                         transition-colors disabled:opacity-50"
              >
                <Volume2 className="w-5 h-5" />
              </button>
              
              <p className="text-3xl sm:text-4xl font-bold text-brown-800 dark:text-white text-center">
                {currentCard.front}
              </p>
              
              {currentCard.pronunciation && (
                <p className="mt-3 text-lg text-brown-500 dark:text-gray-400 italic">
                  ({currentCard.pronunciation})
                </p>
              )}
              
              <p className="mt-6 text-sm text-brown-400 dark:text-gray-500">
                Tap to flip
              </p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 rounded-3xl shadow-xl flex flex-col items-center justify-center p-6 backface-hidden"
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <p className="text-2xl sm:text-3xl font-bold text-white text-center">
                {currentCard.back}
              </p>
              
              {currentCard.pronunciation && (
                <p className="mt-3 text-lg text-white/70 italic">
                  ({currentCard.pronunciation})
                </p>
              )}
              
              <p className="mt-6 text-sm text-white/60">
                Tap to flip back
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-300
                   hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Mobile: Show card counter */}
        <div className="sm:hidden flex items-center gap-2">
          <span className="text-lg font-semibold text-brown-800 dark:text-white">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>

        {/* Desktop: Card dots */}
        <div className="hidden sm:flex gap-1.5 py-2">
          {cards.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                setIsFlipped(false);
                setViewedCards(prev => new Set([...prev, idx]));
              }}
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${
                idx === currentIndex
                  ? 'bg-coral-500 dark:bg-ocean-400 w-6'
                  : viewedCards.has(idx)
                  ? 'bg-coral-300 dark:bg-ocean-600'
                  : 'bg-cream-300 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-300
                   hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onSkip}
          className="flex-1 py-3 px-4 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300
                   font-medium rounded-xl hover:bg-cream-200 dark:hover:bg-slate-600 
                   transition-colors flex items-center justify-center gap-2"
        >
          <SkipForward className="w-4 h-4" />
          Skip to Quiz
        </button>

        <button
          onClick={() => onComplete(cards.length)}
          disabled={!allViewed}
          className={`flex-1 py-3 px-4 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
            allViewed
              ? 'bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white hover:from-coral-600 hover:to-coral-700 dark:hover:from-ocean-600 dark:hover:to-ocean-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          {allViewed ? (
            <>
              Continue to Quiz
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              View all cards first
            </>
          )}
        </button>
      </div>

      {/* Hint */}
      <p className="text-center text-sm text-brown-500 dark:text-gray-500">
        Swipe or use arrows to navigate • Tap card to flip
      </p>
    </div>
  );
}

