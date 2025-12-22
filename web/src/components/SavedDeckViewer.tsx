import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Flashcard } from './Flashcard';
import { useDeckCards, useReviewCard } from '../hooks/useFlashcardsQuery';

export function SavedDeckViewer() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Fetch deck cards with progress
  const { data, isLoading, isError, error } = useDeckCards(deckId, user?.id, isLoaded && !!user);
  
  // Review card mutation
  const reviewCardMutation = useReviewCard(deckId || '');

  const cards = data?.cards || [];
  const deckTitle = data?.title || '';
  const deckTopic = data?.topic || '';

  // Navigate handlers
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsCardFlipped(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsCardFlipped(false);
    }
  };

  // Handle card flip
  const handleCardFlip = (flipped: boolean) => {
    setIsCardFlipped(flipped);
  };

  // Handle card rating
  const handleRating = (confidence: 1 | 2 | 3) => {
    if (!user || !cards[currentIndex]) return;

    const card = cards[currentIndex];

    reviewCardMutation.mutate({
      user_id: user.id,
      flashcard_id: card.id,
      confidence: confidence
    }, {
      onSuccess: (data) => {
        console.log(`✅ Card reviewed: ${data.message}`);
        // Move to next card
        handleNext();
      },
      onError: (err) => {
        console.error('Failed to review card:', err);
        alert('Failed to save progress. Please try again.');
      }
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, cards.length]);

  // Redirect if not signed in
  if (isLoaded && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-coral-500 dark:text-ocean-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-brown-800 dark:text-white mb-2">
            Sign in required
          </h2>
          <p className="text-brown-600 dark:text-gray-400 mb-6">
            Please sign in to view your saved decks.
          </p>
          <button
            onClick={() => navigate('/flashcards')}
            className="px-6 py-3 rounded-lg bg-coral-500 hover:bg-coral-600 text-white font-semibold transition-colors"
          >
            Go to Flashcards
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-coral-600 dark:text-ocean-400 animate-spin" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-brown-800 dark:text-white mb-2">
            Failed to load deck
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-6">
            {error?.message || 'Something went wrong'}
          </p>
          <button
            onClick={() => navigate('/flashcards/my-decks')}
            className="px-6 py-3 rounded-lg bg-coral-500 hover:bg-coral-600 text-white font-semibold transition-colors"
          >
            Back to My Decks
          </button>
        </div>
      </div>
    );
  }

  // No cards
  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-coral-500 dark:text-ocean-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-brown-800 dark:text-white mb-2">
            No cards in this deck
          </h2>
          <button
            onClick={() => navigate('/flashcards/my-decks')}
            className="mt-4 px-6 py-3 rounded-lg bg-coral-500 hover:bg-coral-600 text-white font-semibold transition-colors"
          >
            Back to My Decks
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between safe-area-top">
          <button
            onClick={() => navigate('/flashcards/my-decks')}
            className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
          </button>
          
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-brown-800 dark:text-white">
              {deckTitle}
            </h1>
            <p className="text-xs text-brown-600 dark:text-gray-400 capitalize">
              {deckTopic.replace('-', ' ')}
            </p>
          </div>

          {/* Card Counter */}
          <div className="text-sm font-bold text-coral-600 dark:text-ocean-400 flex-shrink-0">
            {currentIndex + 1} / {cards.length}
          </div>
        </div>
      </div>

      {/* Flashcard Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Flashcard
            front={currentCard.front}
            back={currentCard.back}
            pronunciation={currentCard.pronunciation || undefined}
            example={currentCard.example || undefined}
            onFlip={handleCardFlip}
          />
        </div>

        {/* Progress Indicator */}
        {currentCard.progress && (
          <div className="mt-4 text-center">
            <p className="text-sm text-brown-600 dark:text-gray-400">
              Reviewed {currentCard.progress.times_reviewed} time{currentCard.progress.times_reviewed !== 1 ? 's' : ''}
              {currentCard.progress.last_reviewed && (
                <> • Last: {new Date(currentCard.progress.last_reviewed).toLocaleDateString()}</>
              )}
            </p>
          </div>
        )}

        {/* Rating Buttons (show after flip) */}
        {isCardFlipped && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => handleRating(1)}
              disabled={reviewCardMutation.isPending}
              className="px-6 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md hover:shadow-lg transition-all touch-manipulation min-w-[100px] disabled:opacity-50"
            >
              Hard
            </button>
            <button
              onClick={() => handleRating(2)}
              disabled={reviewCardMutation.isPending}
              className="px-6 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-semibold shadow-md hover:shadow-lg transition-all touch-manipulation min-w-[100px] disabled:opacity-50"
            >
              Good
            </button>
            <button
              onClick={() => handleRating(3)}
              disabled={reviewCardMutation.isPending}
              className="px-6 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold shadow-md hover:shadow-lg transition-all touch-manipulation min-w-[100px] disabled:opacity-50"
            >
              Easy
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="p-4 rounded-full bg-white dark:bg-slate-800 border-2 border-coral-200 dark:border-ocean-900/50 disabled:opacity-30 disabled:cursor-not-allowed hover:border-coral-400 dark:hover:border-ocean-500 hover:shadow-md transition-all touch-manipulation"
          >
            <ChevronLeft className="w-6 h-6 text-coral-600 dark:text-ocean-400" />
          </button>

          <div className="flex gap-2">
            {cards.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-8 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 shadow-sm'
                    : 'w-2 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
            className="p-4 rounded-full bg-white dark:bg-slate-800 border-2 border-coral-200 dark:border-ocean-900/50 disabled:opacity-30 disabled:cursor-not-allowed hover:border-coral-400 dark:hover:border-ocean-500 hover:shadow-md transition-all touch-manipulation"
          >
            <ChevronRight className="w-6 h-6 text-coral-600 dark:text-ocean-400" />
          </button>
        </div>

        {/* Desktop hint */}
        <p className="hidden sm:block text-sm text-brown-600 dark:text-gray-400 mt-6 font-medium">
          Use arrow keys to navigate • Click card to flip
        </p>

        {/* Mobile hint */}
        <p className="sm:hidden text-sm text-brown-600 dark:text-gray-400 mt-6 font-medium">
          Tap card to flip
        </p>
      </div>
    </div>
  );
}

