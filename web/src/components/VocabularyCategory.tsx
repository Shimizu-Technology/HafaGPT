import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Library, Search, X, Loader2 } from 'lucide-react';
import { useCategoryWords, VocabularyWord } from '../hooks/useVocabularyQuery';
import { PronunciationButton } from './PronunciationButton';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { ContentTrustNote } from './ContentTrustNote';
import { TTSDisclaimer } from './TTSDisclaimer';
import { DICTIONARY_CONTENT_TRUST } from '../data/contentTrust';

const PAGE_SIZE = 50;

/** Show a dictionary category and the trust metadata returned for its entries. */
export function VocabularyCategory() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [expandedWord, setExpandedWord] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
      <LearnerPageShell className="flex items-center justify-center">
        <div className="flex items-center gap-3 text-brown-600 dark:text-gray-300" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-coral-500 dark:text-ocean-400" aria-hidden="true" />
          <span>Loading words…</span>
        </div>
      </LearnerPageShell>
    );
  }

  // Error or not found
  if (error || !category) {
    return (
      <LearnerPageShell className="flex items-center justify-center p-4">
        <div className="rounded-2xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-brown-600 dark:text-gray-400 mb-4">Category not found</p>
          <button
            onClick={() => navigate('/vocabulary')}
            className="min-h-11 rounded-xl bg-coral-500 px-5 py-2.5 font-semibold text-white hover:bg-coral-600"
          >
            Back to Vocabulary
          </button>
        </div>
      </LearnerPageShell>
    );
  }

  const toggleExpand = (index: number) => {
    setExpandedWord(expandedWord === index ? null : index);
  };

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title={category.title}
        subtitle="Dictionary category"
        icon={Library}
        backTo="/vocabulary"
        backLabel="Back to dictionary"
        trailing={(
          <span className="hidden rounded-full bg-cream-100 px-3 py-1.5 text-xs font-semibold text-brown-600 dark:bg-slate-800 dark:text-gray-300 sm:inline-flex">
            {filteredWords.length} word{filteredWords.length !== 1 ? 's' : ''}
          </span>
        )}
      />

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
        <ContentTrustNote trust={DICTIONARY_CONTENT_TRUST} className="mb-4" />
        <TTSDisclaimer variant="inline" className="mb-4" />
        {/* Search within category */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-400 dark:text-gray-500" />
            <input
              aria-label={`Search in ${category.title}`}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${category.title}...`}
              className="min-h-12 w-full rounded-2xl border border-cream-300 bg-white py-3 pl-11 pr-11 text-base text-brown-900 placeholder-brown-400 shadow-sm focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear category search"
                className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl hover:bg-cream-100 dark:hover:bg-slate-700"
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
            const hasExamples = word.examples && word.examples.length > 0;
            
            return (
              <article
                key={`${word.chamorro}-${index}`}
                className="overflow-hidden rounded-2xl border border-cream-200 bg-white dark:border-slate-700 dark:bg-slate-800"
              >
                {/* Main Word Row */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Speak Button */}
                    <span className="flex-shrink-0">
                      <PronunciationButton text={word.chamorro} className="mt-0.5 bg-coral-50 text-coral-600 hover:bg-coral-100 dark:bg-ocean-900/30 dark:text-ocean-400" />
                    </span>

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
                      <button
                        type="button"
                        onClick={() => toggleExpand(index)}
                        aria-expanded={isExpanded}
                        aria-controls={`category-examples-${index}`}
                        aria-label={`${isExpanded ? 'Hide' : 'Show'} examples for ${word.chamorro}`}
                        className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-brown-500 hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-gray-400 dark:hover:bg-slate-700"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-brown-400 dark:text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-brown-400 dark:text-gray-500" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && hasExamples && (
                  <div id={`category-examples-${index}`} className="border-t border-cream-200 px-4 pb-4 pt-0 dark:border-slate-700">
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
              </article>
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
            All {totalWords} words loaded
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
      </main>
    </LearnerPageShell>
  );
}
