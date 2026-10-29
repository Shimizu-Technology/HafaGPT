import { useState, useCallback, useEffect } from 'react';
import { ArrowRight, SkipForward, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { LearningTopic } from '../data/learningPath';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { PronunciationButton } from './PronunciationButton';
import { LearnerProgress } from './LearnerProgress';
import { TTSDisclaimer } from './TTSDisclaimer';
import { getCuratedDeckConceptIds } from '../data/conceptEvidence';

interface LessonFlashcardsProps {
  topic: LearningTopic;
  onComplete: (cardsCount: number, conceptIds: string[]) => void;
  onSkip: () => void;
  initialIndex?: number;
  initialViewed?: number[];
  onProgress?: (index: number, viewed: number[]) => void;
}

/** Run the flashcard step of a lesson using the topic's aligned deck and trust. */
export function LessonFlashcards({ topic, onComplete, onSkip, initialIndex = 0, initialViewed = [0], onProgress }: LessonFlashcardsProps) {
  const deck = DEFAULT_FLASHCARD_DECKS[topic.flashcardCategory];
  const cards = deck?.cards || [];

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewedCards, setViewedCards] = useState<Set<number>>(new Set(initialViewed));


  useEffect(() => {
    onProgress?.(currentIndex, [...viewedCards]);
  }, [currentIndex, viewedCards, onProgress]);

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


  if (!deck || cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-brown-600 dark:text-gray-400">
          No flashcards available for this topic.
        </p>
        <button
          onClick={onSkip}
          className="mt-4 text-coral-700 dark:text-ocean-400 hover:underline"
        >
          Skip to quiz →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TTSDisclaimer variant="inline" className="!text-amber-800 dark:!text-amber-200" />
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm text-brown-600 dark:text-gray-400">
        <span>{viewedCards.size} of {cards.length} cards viewed</span>
        <span>{currentIndex + 1} / {cards.length}</span>
      </div>

      {/* Progress bar */}
      <LearnerProgress value={progress} label="Cards viewed" />

      {/* Flashcard */}
      <div className="relative">
        <button
          type="button"
          aria-pressed={isFlipped}
          aria-label={isFlipped ? `Show the Chamorro side for ${currentCard.back}` : `Show the meaning of ${currentCard.front}`}
          onClick={handleFlip}
          className="group w-full cursor-pointer perspective-1000 rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-4"
        >
          <div
            className={`grid w-full min-h-64 transition-transform duration-200 motion-reduce:transition-none group-focus-visible:transition-none transform-style-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              className="col-start-1 row-start-1 bg-white dark:bg-slate-800 rounded-3xl border border-cream-200/50 dark:border-slate-700/50 flex flex-col items-center justify-center p-6 backface-hidden"
              aria-hidden={isFlipped}
              style={{ backfaceVisibility: 'hidden' }}
            >


              <p className="font-chamorro text-3xl sm:text-4xl font-semibold text-brown-800 dark:text-white text-center">
                {currentCard.front}
              </p>

              {currentCard.pronunciation && (
                <p className="mt-3 text-lg text-brown-500 dark:text-gray-400 italic">
                  ({currentCard.pronunciation})
                </p>
              )}

              <p className="mt-6 text-sm text-brown-600 dark:text-gray-300">
                Tap to flip
              </p>
            </div>

            {/* Back */}
            <div
              className="col-start-1 row-start-1 bg-coral-700 dark:bg-teal-700 rounded-3xl flex flex-col items-center justify-center p-6 backface-hidden"
              aria-hidden={!isFlipped}
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <p className="text-2xl sm:text-3xl font-bold text-white text-center">
                {currentCard.back}
              </p>

              {currentCard.pronunciation && (
                <p className="mt-3 text-lg text-white italic">
                  ({currentCard.pronunciation})
                </p>
              )}

              <p className="mt-6 text-sm text-white">
                Tap to flip back
              </p>
            </div>
          </div>
        </button>
        <div className="mt-3 flex justify-end">
          <PronunciationButton key={currentCard.front} text={currentCard.front} label="Hear it" showLabel />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          aria-label="Previous card"
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
        <div className="hidden">
          {cards.map((_, idx) => (
            <button
              key={idx}
              aria-label={`View card ${idx + 1}`}
              onClick={() => {
                setCurrentIndex(idx);
                setIsFlipped(false);
                setViewedCards(prev => new Set([...prev, idx]));
              }}
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
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
          aria-label="Next card"
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
          onClick={() => onComplete(
            cards.length,
            getCuratedDeckConceptIds(topic.flashcardCategory),
          )}
          disabled={!allViewed}
          className={`flex-1 py-3 px-4 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
            allViewed
              ? 'bg-coral-700 dark:bg-teal-700 text-white hover:bg-coral-800 dark:hover:bg-teal-800'
              : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-400 cursor-not-allowed'
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
      <p className="text-center text-sm text-brown-600 dark:text-gray-300">
        Use the arrow buttons to navigate. Tap the card or press Enter to reveal its meaning.
      </p>
    </div>
  );
}
