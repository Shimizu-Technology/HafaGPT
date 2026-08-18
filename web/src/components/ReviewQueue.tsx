import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Flashcard } from './Flashcard';
import { ReviewRatingButtons } from './ReviewRatingButtons';
import { useDueCards, useRecordReview, type QualityRating } from '../hooks/useSpacedRepetition';

export function ReviewQueue() {
  const { data, isLoading, isError, refetch } = useDueCards(undefined, 20);
  const reviewMutation = useRecordReview();
  const [reviewedCardIds, setReviewedCardIds] = useState<Set<string>>(() => new Set());
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allCards = data?.due_cards ?? [];
  const cards = allCards.filter((card) => !reviewedCardIds.has(card.card_id));
  const currentCard = cards[0];

  const handleRate = async (quality: QualityRating) => {
    if (!currentCard) return;

    setError(null);
    try {
      await reviewMutation.mutateAsync({
        cardId: currentCard.card_id,
        deckId: currentCard.deck_id,
        quality,
        content: {
          front: currentCard.front,
          back: currentCard.back,
          pronunciation: currentCard.pronunciation,
          example: currentCard.example,
          source_kind: currentCard.source_kind,
        },
      });
      setIsFlipped(false);
      setReviewedCardIds((cardIds) => new Set(cardIds).add(currentCard.card_id));
    } catch {
      setError('Your review was not saved. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-coral-600" aria-hidden="true" />
          <p className="mt-3 text-brown-700 dark:text-gray-200">Loading your reviews…</p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4 dark:bg-slate-900">
        <div className="max-w-sm text-center">
          <RotateCcw className="mx-auto h-10 w-10 text-coral-600" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-bold text-brown-900 dark:text-white">Reviews could not load</h1>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-5 min-h-11 rounded-xl bg-coral-600 px-5 py-2.5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!currentCard) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4 dark:bg-slate-900">
        <div className="max-w-sm text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-brown-900 dark:text-white">You are caught up</h1>
          <p className="mt-2 text-brown-600 dark:text-gray-300">
            Nice work. New reviews will appear here when they are due.
          </p>
          <Link
            to="/flashcards"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-coral-600 px-5 py-2.5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
          >
            Study more cards
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream-50 pb-24 dark:bg-slate-900">
      <header className="sticky top-0 z-10 border-b border-cream-200 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 safe-area-top">
          <Link
            to="/"
            aria-label="Back to home"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-700 hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-white dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-brown-900 dark:text-white">Review due cards</h1>
            <p className="text-sm text-brown-600 dark:text-gray-300">
              {reviewedCardIds.size + 1} of {reviewedCardIds.size + cards.length}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md">
          <Flashcard
            front={currentCard.front}
            back={currentCard.back}
            pronunciation={currentCard.pronunciation ?? undefined}
            example={currentCard.example ?? undefined}
            onFlip={setIsFlipped}
          />
        </div>
        {isFlipped && (
          <ReviewRatingButtons
            onRate={(quality) => void handleRate(quality)}
            disabled={reviewMutation.isPending}
            error={error}
          />
        )}
      </div>
    </main>
  );
}
