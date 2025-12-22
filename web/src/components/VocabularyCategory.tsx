import { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, ChevronDown, ChevronUp, Search, X, Loader2 } from 'lucide-react';
import { useCategoryWords, VocabularyWord } from '../hooks/useVocabularyQuery';

const PAGE_SIZE = 50;

export function VocabularyCategory() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [expandedWord, setExpandedWord] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Pagination state - track additional words loaded beyond initial fetch
  const [additionalWords, setAdditionalWords] = useState<VocabularyWord[]>([]);
  const [currentOffset, setCurrentOffset] = useState(PAGE_SIZE); // Start at PAGE_SIZE since initial fetch is 0
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch initial category words from API (offset 0)
  const { data, isLoading, error } = useCategoryWords(categoryId, PAGE_SIZE, 0);
  
  const category = data?.category;
  const totalWords = data?.total || 0;
  const initialWords = data?.words || [];
  
  // Combine initial words with any additional loaded words
  const words = [...initialWords, ...additionalWords];
  
  // Reset additional words when category changes
  useEffect(() => {
    setAdditionalWords([]);
    setCurrentOffset(PAGE_SIZE);
    setSearchQuery('');
    setExpandedWord(null);
  }, [categoryId]);
  
  const hasMore = words.length < totalWords;
  
  const loadMore = async () => {
    if (hasMore && !isLoadingMore && categoryId) {
      setIsLoadingMore(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(
          `${API_URL}/api/vocabulary/categories/${categoryId}?limit=${PAGE_SIZE}&offset=${currentOffset}`
        );
        if (response.ok) {
          const result = await response.json();
          setAdditionalWords(prev => [...prev, ...result.words]);
          setCurrentOffset(prev => prev + PAGE_SIZE);
        }
      } catch (err) {
        console.error('Failed to load more words:', err);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  // Filter words based on search
  const filteredWords = searchQuery.trim()
    ? words.filter(
        word =>
          word.chamorro.toLowerCase().includes(searchQuery.toLowerCase()) ||
          word.definition.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : words;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400" />
      </div>
    );
  }

  // Error or not found
  if (error || !category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-brown-600 dark:text-gray-400 mb-4">Category not found</p>
          <button
            onClick={() => navigate('/vocabulary')}
            className="px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors"
          >
            Back to Vocabulary
          </button>
        </div>
      </div>
    );
  }

  // Speak word using OpenAI TTS with Spanish hint
  const speakWord = async (word: VocabularyWord, index: number) => {
    if (speakingIndex !== null) return; // Prevent multiple simultaneous plays
    
    setSpeakingIndex(index);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word.chamorro })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
          setSpeakingIndex(null);
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.onerror = () => {
          setSpeakingIndex(null);
          URL.revokeObjectURL(audioUrl);
          fallbackSpeak(word.chamorro);
        };
        await audioRef.current.play();
      } else {
        fallbackSpeak(word.chamorro);
      }
    } catch {
      fallbackSpeak(word.chamorro);
    }
  };

  // Fallback to browser TTS
  const fallbackSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES'; // Spanish for better Chamorro pronunciation
      utterance.rate = 0.8;
      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);
      speechSynthesis.speak(utterance);
    } else {
      setSpeakingIndex(null);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedWord(expandedWord === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 safe-area-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/vocabulary"
                className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{category.icon}</span>
                <h1 className="text-xl font-semibold text-brown-800 dark:text-white">
                  {category.title}
                </h1>
              </div>
            </div>
            <div className="text-sm text-brown-500 dark:text-gray-400">
              {filteredWords.length} word{filteredWords.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search within category */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${category.title}...`}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-cream-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-brown-800 dark:text-white placeholder-brown-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-coral-500 dark:focus:ring-ocean-500 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-3 h-3 text-brown-400 dark:text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Word List */}
        <div className="space-y-3">
          {filteredWords.map((word, index) => {
            const isExpanded = expandedWord === index;
            const isSpeaking = speakingIndex === index;
            const hasExamples = word.examples && word.examples.length > 0;
            
            return (
              <div
                key={`${word.chamorro}-${index}`}
                className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-cream-200/50 dark:border-slate-700/50"
              >
                {/* Main Word Row */}
                <div
                  className={`p-4 ${hasExamples ? 'cursor-pointer hover:bg-cream-50 dark:hover:bg-slate-700/50' : ''} transition-colors`}
                  onClick={() => hasExamples && toggleExpand(index)}
                >
                  <div className="flex items-start gap-3">
                    {/* Speak Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakWord(word, index);
                      }}
                      disabled={speakingIndex !== null}
                      className={`p-2 rounded-lg transition-colors flex-shrink-0 mt-0.5 flex items-center justify-center ${
                        isSpeaking
                          ? 'bg-coral-100 dark:bg-ocean-900/50 text-coral-600 dark:text-ocean-400'
                          : 'bg-coral-50 dark:bg-ocean-900/30 text-coral-500 dark:text-ocean-400 hover:bg-coral-100 dark:hover:bg-ocean-900/50'
                      }`}
                    >
                      {isSpeaking ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>

                    {/* Word Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h3 className="font-bold text-brown-800 dark:text-white text-lg">
                          {word.chamorro}
                        </h3>
                        {word.part_of_speech && (
                          <span className="text-xs text-brown-400 dark:text-gray-500 italic">
                            {word.part_of_speech}
                          </span>
                        )}
                      </div>
                      <p className="text-brown-600 dark:text-gray-300 mt-0.5">
                        {word.definition}
                      </p>
                    </div>

                    {/* Expand Icon */}
                    {hasExamples && (
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-brown-400 dark:text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-brown-400 dark:text-gray-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && hasExamples && (
                  <div className="px-4 pb-4 pt-0 border-t border-cream-100 dark:border-slate-700">
                    <div className="pt-3 space-y-2">
                      <p className="text-xs font-medium text-brown-500 dark:text-gray-400 mb-2">
                        Examples
                      </p>
                      {word.examples.map((example, idx) => (
                        <div key={idx} className="bg-cream-50 dark:bg-slate-700/50 rounded-lg p-3">
                          <p className="text-brown-800 dark:text-white font-medium">
                            {example.chamorro}
                          </p>
                          <p className="text-brown-600 dark:text-gray-300 text-sm mt-1">
                            {example.english}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {filteredWords.length === 0 && searchQuery && (
          <div className="text-center py-12 text-brown-500 dark:text-gray-400">
            <p>No words found matching "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-coral-500 dark:text-ocean-400 hover:underline mt-2 text-sm"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !searchQuery && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="px-6 py-3 bg-coral-500 dark:bg-ocean-600 text-white rounded-xl hover:bg-coral-600 dark:hover:bg-ocean-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Load More ({totalWords - words.length} remaining)
                </>
              )}
            </button>
          </div>
        )}

        {/* All Loaded Indicator */}
        {!hasMore && words.length > PAGE_SIZE && !searchQuery && (
          <div className="mt-6 text-center text-brown-500 dark:text-gray-400 text-sm">
            ✓ All {totalWords} words loaded
          </div>
        )}

        {/* Back to Categories */}
        <div className="mt-8 text-center">
          <Link
            to="/vocabulary"
            className="inline-flex items-center gap-2 px-4 py-2 text-coral-600 dark:text-ocean-400 hover:bg-coral-50 dark:hover:bg-ocean-900/30 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Categories
          </Link>
        </div>
      </div>
    </div>
  );
}
