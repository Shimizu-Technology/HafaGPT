import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, AlertCircle, Save, RefreshCw, Plus, HelpCircle, CheckCircle2, Layers3 } from 'lucide-react';
import { Flashcard } from './Flashcard';
import { TTSDisclaimer } from './TTSDisclaimer';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useSaveDeck, useDictionaryFlashcards } from '../hooks/useFlashcardsQuery';
import { useRecordReview, type QualityRating } from '../hooks/useSpacedRepetition';
import { createCardIdentity, resolveReviewSourceKind } from '../lib/cardIdentity';
import { ReviewRatingButtons } from './ReviewRatingButtons';
import { browserStorage } from '../lib/browserStorage';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { ContentTrustNote } from './ContentTrustNote';
import {
  getFlashcardTrustForCard,
  type FlashcardContentSource,
} from '../data/contentTrust';
import { ALL_TOPICS } from '../data/learningPath';
import { readTopicReturn } from '../lib/topicReturn';

interface FlashcardData {
  contentSource: FlashcardContentSource;
  sourceId?: string;
  front: string;
  back: string;
  pronunciation?: string;
  example?: string;
  category: string;
}

interface FlashcardsResponse {
  flashcards: Array<Omit<FlashcardData, 'contentSource'>>;
  topic: string;
  count: number;
}

const topicTitles: Record<string, string> = {
  greetings: 'Greetings & Basics',
  family: 'Family Members',
  food: 'Food & Cooking',
  numbers: 'Numbers 1-10',
  colors: 'Colors',
  body: 'Body Parts',
  verbs: 'Common Verbs',
  phrases: 'Common Phrases',
  'common-phrases': 'Everyday Phrases'
};

/** Coordinate curated and dictionary-backed flashcard study with trust context. */
export function FlashcardViewer() {
  const { topic } = useParams<{ topic: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [searchParams] = useSearchParams();
  const cardTypeParam = searchParams.get('type') as 'curated' | 'dictionary' | 'default' | 'custom' | null;
  // Map old values to new ones for backwards compatibility
  const cardType = cardTypeParam === 'default' || cardTypeParam === 'curated' ? 'curated' 
                 : cardTypeParam === 'custom' || cardTypeParam === 'dictionary' ? 'dictionary' 
                 : 'curated';
  const connectedTopic = ALL_TOPICS.find((candidate) => candidate.flashcardCategory === topic);
  const topicReturn = readTopicReturn(searchParams.toString(), connectedTopic?.id);
  
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [newCards, setNewCards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [showNewCardsNotification, setShowNewCardsNotification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false); // Prevent duplicate fetches
  const hasGeneratedMoreRef = useRef(false); // Prevent duplicate background generation
  const batchCountRef = useRef(0); // Track how many batches generated
  const [isCardFlipped, setIsCardFlipped] = useState(false); // Track if current card is flipped
  const [isDeckSaved, setIsDeckSaved] = useState(false); // Track if custom deck has been saved
  const [cardsStudied, setCardsStudied] = useState(0); // Track total cards studied this session
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSaved, setReviewSaved] = useState(false);

  // Use React Query mutation for saving decks
  const saveDeckMutation = useSaveDeck();
  const recordReviewMutation = useRecordReview();
  
  // Use dictionary flashcards API for "dictionary" mode (instant loading from 10,350+ words)
  const {
    data: dictionaryData,
    isLoading: isDictionaryLoading,
    error: dictionaryError,
    refetch: refetchDictionary
  } = useDictionaryFlashcards(
    topic,
    10, // Get 10 cards per fetch
    true, // Shuffle for variety
    cardType === 'dictionary' && !!topic // Only fetch when in dictionary mode
  );

  // Helper function to save cards to localStorage (legacy - kept for backwards compatibility)
  const saveToLocalStorage = (cards: FlashcardData[]) => {
    if (cardTypeParam === 'custom' && topic) {
      const tempCardsKey = `flashcards_temp_${topic}`;
      browserStorage.set(tempCardsKey, JSON.stringify({
        cards: cards,
        timestamp: Date.now()
      }));
    }
  };

  // Helper function to clear localStorage
  const clearLocalStorage = () => {
    if (topic) {
      const tempCardsKey = `flashcards_temp_${topic}`;
      browserStorage.remove(tempCardsKey);
    }
  };

  // Load cards based on cardType from URL
  useEffect(() => {
    if (!topic) return;
    
    if (cardType === 'curated') {
      // Load hardcoded curated cards immediately
      loadCuratedCards();
    } else if (cardType === 'dictionary') {
      // Dictionary cards are loaded via React Query hook (useDictionaryFlashcards)
      // If dictionary fails, fallback to hardcoded cards
      if (dictionaryError) {
        console.warn('Dictionary API failed, falling back to curated cards');
        loadCuratedCards();
      }
      // Otherwise, dictionary data will be handled by the separate useEffect
    }
  }, [topic, cardType, dictionaryError]);

  // Load curated (hardcoded) cards
  const loadCuratedCards = () => {
    if (!topic) return;
    
    const deck = DEFAULT_FLASHCARD_DECKS[topic];
    if (deck) {
      const formattedCards: FlashcardData[] = deck.cards.map((card, index) => ({
        contentSource: 'curated',
        sourceId: `curated:${topic}:${index}`,
        front: card.front,
        back: card.back,
        pronunciation: card.pronunciation,
        example: card.example,
        category: deck.displayName
      }));
      setFlashcards(formattedCards);
      setCurrentIndex(0);
      setError(null);
    } else {
      setError(`No curated cards found for topic: ${topic}`);
    }
  };

  // Legacy: Clean up any old localStorage temp cards
  useEffect(() => {
    if (!topic) return;
    
    // Clean up any stale localStorage data from old "custom" mode
    const tempCardsKey = `flashcards_temp_${topic}`;
    const tempCardsData = browserStorage.get(tempCardsKey);
    
    if (tempCardsData) {
      try {
        const parsedCards = JSON.parse(tempCardsData);
        const timestamp = parsedCards.timestamp;
        const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hour
        
        // Clear if older than 1 hour
        if (!timestamp || timestamp < oneHourAgo) {
          browserStorage.remove(tempCardsKey);
        }
      } catch (err) {
        console.error('Failed to parse temp cards:', err);
        browserStorage.remove(tempCardsKey);
      }
    }
  }, [topic]);

  // Load dictionary cards from API (instant loading from 10,350+ words)
  // This effect runs when dictionary data is fetched
  useEffect(() => {
    if (cardType === 'dictionary' && dictionaryData?.cards && dictionaryData.cards.length > 0) {
      // Map dictionary cards to FlashcardData format
      const mappedCards: FlashcardData[] = dictionaryData.cards.map(card => ({
        contentSource: 'dictionary',
        sourceId: card.source_id,
        front: card.front,
        back: card.back,
        pronunciation: undefined, // Dictionary doesn't have pronunciation
        example: card.example || undefined,
        category: dictionaryData.category?.title || topic || ''
      }));

      setFlashcards(mappedCards);
      setCurrentIndex(0);
      setError(null);
      // Reset custom card state
      hasFetchedRef.current = false;
      hasGeneratedMoreRef.current = false;
      batchCountRef.current = 0;
    }
  }, [dictionaryData, cardType, topic]);

  // Load more dictionary cards (for "Load More" button)
  const loadMoreDictionaryCards = () => {
    if (cardType === 'dictionary') {
      setCardsStudied(prev => prev + flashcards.length);
      refetchDictionary();
    }
  };

  // Background generation of additional cards (legacy - kept for backwards compatibility with ?type=custom)
  const generateMoreCards = async (variety: 'conversational' | 'advanced', previousCardsList?: FlashcardData[]) => {
    if (!topic || hasGeneratedMoreRef.current || batchCountRef.current >= 3) return;
    
    hasGeneratedMoreRef.current = true;
    setIsGeneratingMore(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('topic', topic);
      formData.append('count', '3'); // Generate 3 more cards
      formData.append('variety', variety); // Batch 2: conversational, Batch 3: advanced
      
      // Pass current flashcards to avoid duplicates
      // Use provided previousCardsList if available (for chaining), otherwise use state
      const cardsToCheck = previousCardsList || flashcards;
      formData.append('previous_cards', JSON.stringify(
        cardsToCheck.map(card => ({
          front: card.front,
          back: card.back
        }))
      ));
      
      console.log(`🎴 [FRONTEND] Batch ${batchCountRef.current + 1}: Checking against ${cardsToCheck.length} previous cards`);
      
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/generate-flashcards`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to generate more flashcards');
      }

      const data: FlashcardsResponse = await response.json();
      
      // Frontend safety net: Remove any duplicates that slipped through
      const existingFronts = new Set(cardsToCheck.map(c => c.front.toLowerCase().trim()));
      const existingBacks = new Set(cardsToCheck.map(c => c.back.toLowerCase().trim()));
      
      const generatedCards: FlashcardData[] = data.flashcards.map((card) => ({
        ...card,
        contentSource: 'custom',
      }));
      const uniqueNewCards = generatedCards.filter(card => {
        const frontLower = card.front.toLowerCase().trim();
        const backLower = card.back.toLowerCase().trim();
        return !existingFronts.has(frontLower) && !existingBacks.has(backLower);
      });
      
      if (uniqueNewCards.length < generatedCards.length) {
        console.warn(`🎴 [FRONTEND] Filtered out ${generatedCards.length - uniqueNewCards.length} duplicate(s) from batch ${batchCountRef.current + 1}`);
      }
      
      setNewCards(uniqueNewCards);
      setIsGeneratingMore(false);
      
      // Auto-add new cards to deck after 1 second
      setTimeout(() => {
        setFlashcards(prev => {
          const updatedCards = [...prev, ...uniqueNewCards];
          saveToLocalStorage(updatedCards); // Save to localStorage
          
          // Generate another batch if we haven't hit 9 cards yet (batch 3)
          // Pass updatedCards to the next batch to avoid race conditions
          if (batchCountRef.current === 1) {
            hasGeneratedMoreRef.current = false;
            batchCountRef.current = 2;
            setTimeout(() => generateMoreCards('advanced', updatedCards), 1000);
          } else {
            batchCountRef.current += 1;
            hasGeneratedMoreRef.current = false;
          }
          
          return updatedCards;
        });
        setShowNewCardsNotification(false);
      }, 1000);
      
      setShowNewCardsNotification(true);
    } catch (err) {
      console.error('❌ [FLASHCARDS] Error generating more flashcards:', err);
      setIsGeneratingMore(false);
      hasGeneratedMoreRef.current = false; // Allow retry
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsCardFlipped(false); // Reset flip state
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsCardFlipped(false); // Reset flip state

      if (
        cardTypeParam === 'custom' &&
        currentIndex >= flashcards.length - 3 &&
        !isGeneratingMore &&
        !hasGeneratedMoreRef.current &&
        batchCountRef.current < 3
      ) {
        void generateMoreCards(batchCountRef.current === 0 ? 'conversational' : 'advanced');
      }
    }
  };

  // Handle card flip
  const handleCardFlip = (flipped: boolean) => {
    setIsCardFlipped(flipped);
  };

  // Handle card rating (Hard/Good/Easy)
  const handleRating = async (quality: QualityRating) => {
    if (!topic || !currentCard) return;

    setReviewError(null);
    setReviewSaved(false);
    const sourceKind = resolveReviewSourceKind(currentCard);

    try {
      await recordReviewMutation.mutateAsync({
        cardId: createCardIdentity({
          sourceKind,
          sourceId: currentCard.sourceId ?? `${sourceKind}:${topic}:${currentIndex}`,
        }),
        deckId: `${sourceKind}:${topic}`,
        quality,
        content: {
          front: currentCard.front,
          back: currentCard.back,
          pronunciation: currentCard.pronunciation,
          example: currentCard.example,
          source_kind: sourceKind,
        },
      });
      setReviewSaved(true);
      if (currentIndex < flashcards.length - 1) {
        handleNext();
      } else {
        setIsCardFlipped(false);
      }
    } catch {
      setReviewError('Your review was not saved. Please try again.');
    }
  };

  // Handle saving custom deck
  const handleSaveDeck = async () => {
    if (!user) {
      alert('Please sign in to save custom flashcard decks!');
      return;
    }

    if (flashcards.length === 0) {
      alert('No cards to save!');
      return;
    }

    // Use React Query mutation
    saveDeckMutation.mutate({
      user_id: user.id,
      topic: topic!,
      title: `My ${topicTitles[topic || ''] || topic} Cards`,
      card_type: 'custom',
      cards: flashcards.map(card => ({
        front: card.front,
        back: card.back,
        pronunciation: card.pronunciation || null,
        example: card.example || null
      }))
    }, {
      onSuccess: (data) => {
        alert(`✅ ${data.message}`);
        clearLocalStorage(); // Clear temp cards after successful save
        setIsDeckSaved(true); // Mark deck as saved
      },
      onError: () => {
        alert('Failed to save deck. Please try again.');
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
  }, [currentIndex, flashcards.length]);

  // Touch swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
  };

  if (error) {
    return (
      <LearnerPageShell className="flex items-center justify-center">
        <div className="text-center px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4 font-medium">{error}</p>
          <button
            onClick={() => navigate('/flashcards')}
            className="min-h-11 rounded-xl bg-coral-600 px-6 py-2.5 font-semibold text-white hover:bg-coral-700 dark:bg-ocean-600 dark:hover:bg-ocean-700"
          >
            Back to Decks
          </button>
        </div>
      </LearnerPageShell>
    );
  }

  // Show loading state for dictionary flashcards
  if (cardType === 'dictionary' && isDictionaryLoading) {
    return (
      <LearnerPageShell className="flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400 mx-auto mb-2" />
          <p className="text-brown-600 dark:text-gray-300">Loading dictionary flashcards...</p>
        </div>
      </LearnerPageShell>
    );
  }

  // Show loading state when no cards yet
  if (flashcards.length === 0 || !flashcards[currentIndex]) {
    return (
      <LearnerPageShell className="flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400 mx-auto mb-2" />
          <p className="text-brown-600 dark:text-gray-300">Loading flashcards...</p>
        </div>
      </LearnerPageShell>
    );
  }

  const currentCard = flashcards[currentIndex];
  const deckTitle = topicTitles[topic || ''] || dictionaryData?.category?.title || topic || 'Flashcards';
  const progress = ((currentIndex + 1) / flashcards.length) * 100;
  const contentTrust = getFlashcardTrustForCard(
    currentCard,
    topic || '',
    dictionaryData?.trust,
  );
  const deckSourceLabel = currentCard.contentSource === 'curated'
    ? 'Guided deck'
    : currentCard.contentSource === 'custom'
      ? 'Custom practice deck'
      : 'Dictionary deck';

  return (
    <LearnerPageShell className="flex flex-col">
      <LearnerPageHeader
        title={deckTitle}
        subtitle={`${deckSourceLabel} · Card ${currentIndex + 1} of ${flashcards.length}`}
        icon={Layers3}
        backTo={topicReturn?.to ?? '/flashcards'}
        backLabel={topicReturn?.label ?? 'Back to flashcard decks'}
        onBack={topicReturn ? () => navigate(topicReturn.to) : undefined}
        trailing={(
          <div className="flex items-center gap-1">
            <TTSDisclaimer variant="tooltip" />
            {cardTypeParam === 'custom' && flashcards.length > 0 && (
              <button type="button" onClick={handleSaveDeck} disabled={saveDeckMutation.isPending || isGeneratingMore || isDeckSaved} aria-label={isDeckSaved ? 'Deck saved' : 'Save this deck'} className="flex h-11 w-11 items-center justify-center rounded-xl text-coral-700 hover:bg-coral-100 disabled:opacity-50 dark:text-ocean-300 dark:hover:bg-ocean-950">
                {saveDeckMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              </button>
            )}
            {cardType === 'dictionary' && (
              <button type="button" onClick={() => { setCardsStudied(prev => prev + flashcards.length); setCurrentIndex(0); setIsCardFlipped(false); void refetchDictionary(); }} disabled={isDictionaryLoading} aria-label="Get new flashcards" className="flex h-11 w-11 items-center justify-center rounded-xl text-coral-700 hover:bg-coral-100 disabled:opacity-50 dark:text-ocean-300 dark:hover:bg-ocean-950">
                <RefreshCw className={`h-5 w-5 ${isDictionaryLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        )}
        below={(
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-200 dark:bg-slate-700" role="progressbar" aria-label="Flashcard progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <div className="h-full bg-coral-600 transition-all dark:bg-ocean-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-semibold text-brown-500 dark:text-gray-400">{currentIndex + 1} / {flashcards.length}</span>
          </div>
        )}
      />

      {/* Flashcard Area */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-4 py-8"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="w-full max-w-md">
          <ContentTrustNote trust={contentTrust} className="mb-4" compact />
          <Flashcard
            front={currentCard.front}
            back={currentCard.back}
            pronunciation={currentCard.pronunciation}
            example={currentCard.example}
            onFlip={handleCardFlip}
          />
        </div>

        {/* Rating Buttons (show after flip) */}
        {/* Rating Buttons - Only show if card is flipped AND (deck is curated/dictionary OR saved) */}
        {isCardFlipped && (cardType === 'curated' || cardType === 'dictionary' || isDeckSaved) && (
          <ReviewRatingButtons
            onRate={(quality) => void handleRating(quality)}
            disabled={recordReviewMutation.isPending}
            error={reviewError}
          />
        )}

        {reviewSaved && !isCardFlipped && (
          <p className="mt-4 text-sm font-semibold text-teal-700 dark:text-teal-300" role="status">
            Review saved. We will bring this card back at the right time.
          </p>
        )}
        
        {/* Help text for unsaved custom cards (legacy) */}
        {cardTypeParam === 'custom' && !isDeckSaved && isCardFlipped && (
          <div className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-brown-600 dark:text-gray-400">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            <span>Save this deck to track your progress with ratings</span>
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
            {flashcards.map((_, index) => (
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
            disabled={currentIndex === flashcards.length - 1}
            className="p-4 rounded-full bg-white dark:bg-slate-800 border-2 border-coral-200 dark:border-ocean-900/50 disabled:opacity-30 disabled:cursor-not-allowed hover:border-coral-400 dark:hover:border-ocean-500 hover:shadow-md transition-all touch-manipulation"
          >
            <ChevronRight className="w-6 h-6 text-coral-600 dark:text-ocean-400" />
          </button>
        </div>

        {/* Deck Complete - Load More Section */}
        {currentIndex === flashcards.length - 1 && flashcards.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border-2 border-emerald-200 dark:border-emerald-700/50">
            <div className="text-center">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold mb-3">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
                Great job! You've finished this deck!
                {cardsStudied > 0 && (
                  <span className="block text-sm font-normal mt-1">
                    Cards studied this session: {cardsStudied + flashcards.length}
                  </span>
                )}
              </p>
              
              {cardType === 'dictionary' && (
                <button
                  onClick={loadMoreDictionaryCards}
                  disabled={isDictionaryLoading}
                  className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {isDictionaryLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Load 10 More Cards
                    </>
                  )}
                </button>
              )}
              
              {cardType === 'curated' && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Try <span className="font-semibold">Dictionary mode</span> for unlimited practice!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Desktop hint */}
        <p className="hidden sm:block text-sm text-brown-600 dark:text-gray-400 mt-6 font-medium">
          Use arrow keys to navigate • Click card to flip
        </p>

        {/* Mobile hint */}
        <p className="sm:hidden text-sm text-brown-600 dark:text-gray-400 mt-6 font-medium">
          Swipe to navigate • Tap card to flip
        </p>
      </div>

      {/* Generating More Indicator */}
      {isGeneratingMore && !showNewCardsNotification && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-white dark:bg-slate-800 rounded-full shadow-xl border-2 border-coral-200 dark:border-ocean-900/50 px-6 py-3 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-coral-500 dark:text-ocean-400" />
            <span className="text-sm font-semibold text-brown-800 dark:text-white">
              Generating 3 more cards...
            </span>
          </div>
        </div>
      )}

      {/* New Cards Ready - Auto-adding Notification */}
      {showNewCardsNotification && newCards.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-20 animate-fade-in">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600 rounded-xl shadow-xl px-6 py-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span className="text-white font-bold">
              {newCards.length} new cards added to deck!
            </span>
          </div>
        </div>
      )}
    </LearnerPageShell>
  );
}
