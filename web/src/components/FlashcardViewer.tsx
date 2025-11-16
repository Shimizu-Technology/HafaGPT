import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Flashcard } from './Flashcard';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';

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
  numbers: 'Numbers 1-20',
  verbs: 'Common Verbs',
  'common-phrases': 'Everyday Phrases'
};

export function FlashcardViewer() {
  const { topic } = useParams<{ topic: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cardTypeParam = searchParams.get('type') as 'default' | 'custom' | null;
  const [cardType] = useState<'default' | 'custom'>(cardTypeParam || 'default'); // Read from URL
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

  // Load cards based on cardType from URL
  useEffect(() => {
    if (!topic) return;
    
    if (cardType === 'default') {
      loadDefaultCards();
    } else {
      loadCustomCards();
    }
  }, [topic, cardType]);

  // Load default cards instantly
  const loadDefaultCards = () => {
    if (!topic) return;
    
    const deckData = DEFAULT_FLASHCARD_DECKS[topic];
    if (!deckData) {
      // If no default cards, fallback to custom
      loadCustomCards();
      return;
    }

    // Map default cards to FlashcardData format
    const mappedCards: FlashcardData[] = deckData.cards.map(card => ({
      front: card.front,
      back: card.back,
      pronunciation: card.pronunciation,
      category: topic
    }));

    setFlashcards(mappedCards);
    setCurrentIndex(0);
    // Reset custom card state
    hasFetchedRef.current = false;
    hasGeneratedMoreRef.current = false;
    batchCountRef.current = 0;
  };

  // Load custom AI-generated cards (progressive: 3 cards initially)
  const loadCustomCards = async () => {
    if (!topic) return;

    // Reset state for new custom generation
    hasFetchedRef.current = true;
    hasGeneratedMoreRef.current = false;
    batchCountRef.current = 0;
    setFlashcards([]);
    setNewCards([]);
    setCurrentIndex(0);
    setLoading(true);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('topic', topic);
      formData.append('count', '3'); // Generate 3 cards initially for fast load
      formData.append('variety', 'basic'); // Batch 1: Basic everyday usage
      
      const response = await fetch(`${API_URL}/api/generate-flashcards`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to generate flashcards');
      }

      const data: FlashcardsResponse = await response.json();
      setFlashcards(data.flashcards);
      setLoading(false);
      batchCountRef.current = 1;
      
      // Immediately start generating 3 more in the background
      setTimeout(() => generateMoreCards('conversational'), 500);
    } catch (err) {
      console.error('❌ [FLASHCARDS] Error fetching flashcards:', err);
      setError('Failed to load flashcards. Please try again.');
      hasFetchedRef.current = false;
      setLoading(false);
    }
  };

  // Background generation of additional cards (3 at a time, up to 9 total)
  const generateMoreCards = async (variety: 'conversational' | 'advanced') => {
    if (!topic || hasGeneratedMoreRef.current || batchCountRef.current >= 3) return;
    
    hasGeneratedMoreRef.current = true;
    setIsGeneratingMore(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('topic', topic);
      formData.append('count', '3'); // Generate 3 more cards
      formData.append('variety', variety); // Batch 2: conversational, Batch 3: advanced
      
      const response = await fetch(`${API_URL}/api/generate-flashcards`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to generate more flashcards');
      }

      const data: FlashcardsResponse = await response.json();
      setNewCards(data.flashcards);
      setIsGeneratingMore(false);
      
      // Auto-add new cards to deck after 1 second
      setTimeout(() => {
        setFlashcards(prev => [...prev, ...data.flashcards]);
        setShowNewCardsNotification(false);
        batchCountRef.current += 1;
        
        // Generate another batch if we haven't hit 9 cards yet (batch 3)
        if (batchCountRef.current === 2) {
          hasGeneratedMoreRef.current = false;
          setTimeout(() => generateMoreCards('advanced'), 1000);
        }
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
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
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

  if (flashcards.length === 0 && !loading) {
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/flashcards')}
            className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
          </button>
          
          <h1 className="text-lg font-semibold text-brown-800 dark:text-white">
            {topicTitles[topic || ''] || topic}
          </h1>
          
          <div className="text-sm font-bold text-coral-600 dark:text-ocean-400">
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
          />
        </div>

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

