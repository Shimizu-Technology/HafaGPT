import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, AlertCircle, Save, RefreshCw, Plus } from 'lucide-react';
import { Flashcard } from './Flashcard';
import { TTSDisclaimer } from './TTSDisclaimer';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { useUser } from '@clerk/clerk-react';
import { useSaveDeck, useDictionaryFlashcards } from '../hooks/useFlashcardsQuery';

interface FlashcardData {
  front: string;
  back: string;
  pronunciation?: string;
  example?: string;
  category: string;
}

interface FlashcardsResponse {
  flashcards: FlashcardData[];
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

export function FlashcardViewer() {
  const { topic } = useParams<{ topic: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const cardTypeParam = searchParams.get('type') as 'curated' | 'dictionary' | 'default' | 'custom' | null;
  // Map old values to new ones for backwards compatibility
  const cardType = cardTypeParam === 'default' || cardTypeParam === 'curated' ? 'curated' 
                 : cardTypeParam === 'custom' || cardTypeParam === 'dictionary' ? 'dictionary' 
                 : 'curated';
  
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [newCards, setNewCards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [showNewCardsNotification, setShowNewCardsNotification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false); // Prevent duplicate fetches
  const hasGeneratedMoreRef = useRef(false); // Prevent duplicate background generation
  const batchCountRef = useRef(0); // Track how many batches generated
  const [isCardFlipped, setIsCardFlipped] = useState(false); // Track if current card is flipped
  const [isDeckSaved, setIsDeckSaved] = useState(false); // Track if custom deck has been saved
  const [cardsStudied, setCardsStudied] = useState(0); // Track total cards studied this session

  // Use React Query mutation for saving decks
  const saveDeckMutation = useSaveDeck();
  
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
      localStorage.setItem(tempCardsKey, JSON.stringify({
        cards: cards,
        timestamp: Date.now()
      }));
    }
  };

  // Helper function to clear localStorage
  const clearLocalStorage = () => {
    if (topic) {
      const tempCardsKey = `flashcards_temp_${topic}`;
      localStorage.removeItem(tempCardsKey);
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
      const formattedCards: FlashcardData[] = deck.cards.map(card => ({
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
    const tempCardsData = localStorage.getItem(tempCardsKey);
    
    if (tempCardsData) {
      try {
        const parsedCards = JSON.parse(tempCardsData);
        const timestamp = parsedCards.timestamp;
        const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hour
        
        // Clear if older than 1 hour
        if (!timestamp || timestamp < oneHourAgo) {
          localStorage.removeItem(tempCardsKey);
        }
      } catch (err) {
        console.error('Failed to parse temp cards:', err);
        localStorage.removeItem(tempCardsKey);
      }
    }
  }, [topic]);

  // Load dictionary cards from API (instant loading from 10,350+ words)
  // This effect runs when dictionary data is fetched
  useEffect(() => {
    if (cardType === 'dictionary' && dictionaryData?.cards && dictionaryData.cards.length > 0) {
      // Map dictionary cards to FlashcardData format
      const mappedCards: FlashcardData[] = dictionaryData.cards.map(card => ({
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
      
      const response = await fetch(`${API_URL}/api/generate-flashcards`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to generate more flashcards');
      }

      const data: FlashcardsResponse = await response.json();
      
      // Frontend safety net: Remove any duplicates that slipped through
      const existingFronts = new Set(cardsToCheck.map(c => c.front.toLowerCase().trim()));
      const existingBacks = new Set(cardsToCheck.map(c => c.back.toLowerCase().trim()));
      
      const uniqueNewCards = data.flashcards.filter(card => {
        const frontLower = card.front.toLowerCase().trim();
        const backLower = card.back.toLowerCase().trim();
        return !existingFronts.has(frontLower) && !existingBacks.has(backLower);
      });
      
      if (uniqueNewCards.length < data.flashcards.length) {
        console.warn(`🎴 [FRONTEND] Filtered out ${data.flashcards.length - uniqueNewCards.length} duplicate(s) from batch ${batchCountRef.current + 1}`);
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
    }
  };

  // Handle card flip
  const handleCardFlip = (flipped: boolean) => {
    setIsCardFlipped(flipped);
  };

  // Handle card rating (Hard/Good/Easy)
  const handleRating = async (confidence: 1 | 2 | 3) => {
    // For now, just log the rating (we'll wire up the API later)
    console.log(`Card rated: ${confidence} (1=Hard, 2=Good, 3=Easy)`);
    
    // TODO: Add toast notification
    const ratingLabels = { 1: 'Hard', 2: 'Good', 3: 'Easy' };
    console.log(`✅ Rated as ${ratingLabels[confidence]}!`);
    
    // Move to next card
    handleNext();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Loader2 className="w-12 h-12 animate-spin text-coral-500 dark:text-ocean-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-brown-800 dark:text-white mb-2">
            Generating flashcards...
          </p>
          <p className="text-sm text-brown-600 dark:text-gray-300">
            Creating personalized {topicTitles[topic || '']} flashcards from our Chamorro knowledge base
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-coral-500 dark:bg-ocean-400 animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-coral-500 dark:bg-ocean-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 rounded-full bg-coral-500 dark:bg-ocean-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4 font-medium">{error}</p>
          <button
            onClick={() => navigate('/flashcards')}
            className="px-6 py-2.5 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  // Show loading state for dictionary flashcards
  if (cardType === 'dictionary' && isDictionaryLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400 mx-auto mb-2" />
          <p className="text-brown-600 dark:text-gray-300">Loading dictionary flashcards...</p>
        </div>
      </div>
    );
  }

  // Show loading state when no cards yet
  if (flashcards.length === 0 || !flashcards[currentIndex]) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400 mx-auto mb-2" />
          <p className="text-brown-600 dark:text-gray-300">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/flashcards')}
            className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
          </button>
          
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1">
            <h1 className="text-lg font-semibold text-brown-800 dark:text-white">
              {topicTitles[topic || ''] || dictionaryData?.category?.title || topic}
            </h1>
              <TTSDisclaimer variant="tooltip" />
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              cardType === 'curated'
                ? 'bg-coral-100 dark:bg-ocean-900/30 text-coral-700 dark:text-ocean-300'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
            }`}>
              {cardType === 'curated' ? 'Curated' : 'Dictionary'}
            </span>
          </div>
          
          {/* Save Deck Button (legacy - for custom AI cards only) */}
          {cardTypeParam === 'custom' && flashcards.length > 0 && (
            <button
              onClick={handleSaveDeck}
              disabled={saveDeckMutation.isPending || isGeneratingMore || isDeckSaved}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:cursor-not-allowed flex-shrink-0 ${
                isDeckSaved 
                  ? 'bg-green-500 dark:bg-green-600 text-white opacity-90' 
                  : 'bg-coral-500 hover:bg-coral-600 dark:bg-ocean-600 dark:hover:bg-ocean-700 text-white disabled:opacity-50'
              }`}
              title={
                isDeckSaved 
                  ? "Deck saved! View in My Decks" 
                  : isGeneratingMore 
                    ? "Wait for all cards to finish generating" 
                    : "Save this deck"
              }
            >
              {saveDeckMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isDeckSaved ? '✓ Saved' : isGeneratingMore ? 'Generating...' : 'Save'}
              </span>
            </button>
          )}

          {/* Shuffle Button (for dictionary cards) */}
          {cardType === 'dictionary' && (
            <button
              onClick={() => {
                setCardsStudied(prev => prev + flashcards.length);
                setCurrentIndex(0);
                setIsCardFlipped(false);
                refetchDictionary();
              }}
              disabled={isDictionaryLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors font-medium text-sm disabled:opacity-50 flex-shrink-0"
              title="Get new cards"
            >
              <RefreshCw className={`w-4 h-4 ${isDictionaryLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">New Cards</span>
            </button>
          )}

          {/* Card Counter */}
          <div className="text-sm font-bold text-coral-600 dark:text-ocean-400 flex-shrink-0">
            {currentIndex + 1} / {flashcards.length}
          </div>
        </div>
      </div>

      {/* Flashcard Area */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-4 py-8"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="w-full max-w-md">
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
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => handleRating(1)}
              className="px-6 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md hover:shadow-lg transition-all touch-manipulation min-w-[100px]"
            >
              Hard
            </button>
            <button
              onClick={() => handleRating(2)}
              className="px-6 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-semibold shadow-md hover:shadow-lg transition-all touch-manipulation min-w-[100px]"
            >
              Good
            </button>
            <button
              onClick={() => handleRating(3)}
              className="px-6 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold shadow-md hover:shadow-lg transition-all touch-manipulation min-w-[100px]"
            >
              Easy
            </button>
          </div>
        )}
        
        {/* Help text for unsaved custom cards (legacy) */}
        {cardTypeParam === 'custom' && !isDeckSaved && isCardFlipped && (
          <div className="mt-6 text-center text-sm text-brown-600 dark:text-gray-400 italic">
            💡 Save this deck to track your progress with ratings
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
                🎉 Great job! You've finished this deck!
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
    </div>
  );
}

