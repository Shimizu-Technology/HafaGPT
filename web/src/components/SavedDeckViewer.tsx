import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCw,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDeckCards, useReviewCard } from '../hooks/useFlashcardsQuery';
import { type QualityRating } from '../hooks/useSpacedRepetition';
import { Flashcard } from './Flashcard';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { ReviewRatingButtons } from './ReviewRatingButtons';

function DeckState({
  title,
  description,
  action,
  onRetry,
  tone = 'neutral',
}: {
  title: string;
  description: string;
  action: string;
  onRetry?: () => void;
  tone?: 'neutral' | 'error';
}) {
  const Icon = tone === 'error' ? AlertCircle : BookOpen;
  return (
    <section className={`rounded-3xl border bg-white p-6 text-center dark:bg-slate-800 sm:p-8 ${
      tone === 'error' ? 'border-red-200 dark:border-red-900' : 'border-cream-200 dark:border-slate-700'
    }`}>
      <Icon className={`mx-auto h-9 w-9 ${tone === 'error' ? 'text-red-600 dark:text-red-300' : 'text-coral-600 dark:text-teal-300'}`} aria-hidden="true" />
      <h2 className="mt-4 text-xl font-bold text-brown-950 dark:text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-brown-600 dark:text-gray-400">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-700"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          {action}
        </button>
      ) : (
        <Link
          to="/flashcards/my-decks"
          className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-700"
        >
          {action}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

export function SavedDeckViewer() {
  const { deckId } = useParams<{ deckId: string }>();
  return <SavedDeckSession key={deckId || 'missing-deck'} deckId={deckId} />;
}

function SavedDeckSession({ deckId }: { deckId: string | undefined }) {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState('');
  const { data, isLoading, isError, refetch } = useDeckCards(deckId, user?.id, isLoaded && !!user);
  const reviewCardMutation = useReviewCard(deckId || '');
  const reviewInFlightRef = useRef(false);
  const cards = data?.cards || [];
  const deckTitle = data?.title || 'Saved deck';
  const deckTopic = data?.topic || '';

  const handlePrevious = useCallback(() => {
    if (reviewInFlightRef.current) return;
    setCurrentIndex((index) => {
      if (index === 0) return index;
      setIsCardFlipped(false);
      setReviewError(null);
      setCompletionMessage('');
      return index - 1;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (reviewInFlightRef.current) return;
    setCurrentIndex((index) => {
      if (index >= cards.length - 1) return index;
      setIsCardFlipped(false);
      setReviewError(null);
      setCompletionMessage('');
      return index + 1;
    });
  }, [cards.length]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') handlePrevious();
      if (event.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleNext, handlePrevious]);

  useEffect(() => {
    if (currentIndex >= cards.length && cards.length > 0) {
      setCurrentIndex(cards.length - 1);
    }
  }, [cards.length, currentIndex]);

  const handleRating = (quality: QualityRating) => {
    const card = cards[currentIndex];
    if (!user || !card || reviewInFlightRef.current) return;
    const confidence: 1 | 2 | 3 = quality <= 3 ? 1 : quality === 4 ? 2 : 3;
    reviewInFlightRef.current = true;
    setReviewError(null);
    setCompletionMessage('');

    reviewCardMutation.mutate(
      {
        user_id: user.id,
        flashcard_id: card.id,
        confidence,
        quality,
      },
      {
        onSuccess: () => {
          reviewInFlightRef.current = false;
          if (currentIndex === cards.length - 1) {
            setCompletionMessage('Review saved. You finished this deck.');
          } else {
            handleNext();
          }
        },
        onError: () => {
          reviewInFlightRef.current = false;
          setReviewError('Your review was not saved. Please try again.');
        },
      },
    );
  };

  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;
  const currentCard = cards[currentIndex];

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title={deckTitle}
        subtitle={deckTopic ? deckTopic.replace(/-/g, ' ') : 'Saved flashcard practice'}
        icon={BookOpen}
        backTo="/flashcards/my-decks"
        backLabel="Back to saved decks"
        maxWidthClassName="max-w-3xl"
        trailing={cards.length > 0 ? (
          <span className="rounded-full bg-coral-100 px-2.5 py-1 text-xs font-bold text-coral-700 dark:bg-teal-950/50 dark:text-teal-300">
            {currentIndex + 1} / {cards.length}
          </span>
        ) : undefined}
        below={cards.length > 0 ? (
          <div
            className="h-1.5 overflow-hidden rounded-full bg-cream-200 dark:bg-slate-700"
            role="progressbar"
            aria-label="Deck progress"
            aria-valuemin={1}
            aria-valuemax={cards.length}
            aria-valuenow={currentIndex + 1}
          >
            <div className="h-full rounded-full bg-coral-500 dark:bg-teal-500" style={{ width: `${progress}%` }} />
          </div>
        ) : undefined}
      />

      <main className="mx-auto max-w-3xl px-4 py-5 sm:py-8">
        {isLoaded && !user ? (
          <DeckState
            title="Sign in to study this deck"
            description="Saved decks and spaced-repetition progress are connected to your account."
            action="Back to saved decks"
          />
        ) : !isLoaded || isLoading ? (
          <section
            className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-coral-600 motion-reduce:animate-none dark:text-teal-300" aria-hidden="true" />
            <p className="mt-4 font-medium text-brown-600 dark:text-gray-300">Loading your deck…</p>
          </section>
        ) : isError ? (
          <DeckState
            title="This deck is unavailable"
            description="Your saved cards and review progress have not been changed. Try loading the deck again."
            action="Try again"
            onRetry={() => refetch()}
            tone="error"
          />
        ) : cards.length === 0 ? (
          <DeckState
            title="This deck has no cards"
            description="Choose another saved deck or create a new set from the flashcard library."
            action="Back to saved decks"
          />
        ) : currentCard ? (
          <div className="flex flex-col items-center">
            <p className="mb-4 text-center text-sm font-medium text-brown-600 dark:text-gray-300">
              Listen, flip the card, then choose how well you remembered.
            </p>
            <div className="w-full max-w-sm">
              <Flashcard
                front={currentCard.front}
                back={currentCard.back}
                pronunciation={currentCard.pronunciation || undefined}
                example={currentCard.example || undefined}
                onFlip={(flipped) => {
                  setIsCardFlipped(flipped);
                  setReviewError(null);
                  setCompletionMessage('');
                }}
              />
            </div>

            {currentCard.progress && (
              <p className="mt-4 text-center text-sm text-brown-500 dark:text-gray-400">
                Reviewed {currentCard.progress.times_reviewed} {currentCard.progress.times_reviewed === 1 ? 'time' : 'times'}
                {currentCard.progress.last_reviewed && (
                  <> · Last {new Date(currentCard.progress.last_reviewed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                )}
              </p>
            )}

            {isCardFlipped && !completionMessage && (
              <ReviewRatingButtons
                onRate={handleRating}
                disabled={reviewCardMutation.isPending}
                error={reviewError}
              />
            )}

            {completionMessage && (
              <div className="mt-6 w-full max-w-xl rounded-2xl border border-green-200 bg-green-50 p-4 text-center dark:border-green-900 dark:bg-green-950/20" role="status">
                <CheckCircle2 className="mx-auto h-6 w-6 text-green-700 dark:text-green-300" aria-hidden="true" />
                <p className="mt-2 font-bold text-green-900 dark:text-green-100">{completionMessage}</p>
                <button
                  type="button"
                  onClick={() => navigate('/flashcards/my-decks')}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-5 font-semibold text-white hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                >
                  Back to saved decks
                </button>
              </div>
            )}

            <nav className="mt-6 flex w-full max-w-sm items-center justify-between gap-3" aria-label="Deck navigation">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0 || reviewCardMutation.isPending}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-4 font-semibold text-brown-800 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === cards.length - 1 || reviewCardMutation.isPending}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-4 font-semibold text-brown-800 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              >
                Next
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
            <p className="mt-3 hidden text-sm text-brown-500 dark:text-gray-400 sm:block">
              You can also use the left and right arrow keys.
            </p>
          </div>
        ) : null}
      </main>
    </LearnerPageShell>
  );
}
