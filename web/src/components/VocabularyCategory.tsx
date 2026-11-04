import { useEffect, useRef } from 'react';
import { Link, useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Library, Search, X, Loader2 } from 'lucide-react';
import { useCategoryWordPages } from '../hooks/useVocabularyQuery';
import { DictionaryEntryList, DictionaryEntryRow } from './DictionaryEntryRow';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { ContentTrustNote } from './ContentTrustNote';
import { TTSDisclaimer } from './TTSDisclaimer';
import { DICTIONARY_CONTENT_TRUST } from '../data/contentTrust';
import { RecordsError } from './RecordsError';
import { currentAppPath } from '../lib/routes';

const PAGE_SIZE = 50;

/** Show a dictionary category and the trust metadata returned for its entries. */
export function VocabularyCategory() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  
  const { data: pages, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching, isPlaceholderData, isFetchNextPageError } = useCategoryWordPages(categoryId, searchQuery, PAGE_SIZE);
  const lastLoaded = useRef<{ categoryId: string | undefined; query: string; pages: typeof pages }>();
  useEffect(() => {
    if (pages && !isPlaceholderData) lastLoaded.current = { categoryId, query: searchQuery, pages };
  }, [pages, categoryId, searchQuery, isPlaceholderData]);
  const fallback = error && lastLoaded.current?.categoryId === categoryId ? lastLoaded.current : undefined;
  const displayedPages = pages ?? fallback?.pages;
  const data = displayedPages?.pages[0];
  const category = data?.category;
  const totalWords = data?.total ?? 0;
  const words = displayedPages?.pages.flatMap(page => page.words) ?? [];

  const setSearchQuery = (query: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (query) nextParams.set('q', query);
    else nextParams.delete('q');
    const nextSearch = nextParams.toString();
    navigate(currentAppPath(
      location.pathname,
      nextSearch ? `?${nextSearch}` : '',
      location.hash,
    ), { replace: true });
  };
  
  const hasMore = hasNextPage && !isPlaceholderData;
  const filteredWords = words;
  const returnTo = currentAppPath(location.pathname, location.search, location.hash);

  // Loading state
  if (isLoading) {
    return (
      <LearnerPageShell className="flex items-center justify-center">
        <div className="flex items-center gap-3 text-brown-600 dark:text-brown-100" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-coral-700" aria-hidden="true" />
          <span>Loading words…</span>
        </div>
      </LearnerPageShell>
    );
  }

  // Error or not found
  if (!category) {
    return (
      <LearnerPageShell className="flex items-center justify-center p-4">
        <div className="rounded-2xl border border-cream-200 bg-white p-6 text-center dark:border-brown-700 dark:bg-brown-900">
          <h1 className="mb-4 text-xl font-bold text-brown-950 dark:text-cream-100">{error ? 'Dictionary category is unavailable' : 'Category not found'}</h1>
          {error && <>
            <label className="mb-3 block text-left text-base text-brown-700 dark:text-cream-200">Search in this category
              <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-cream-300 bg-white px-3 text-base text-brown-900 dark:border-brown-600 dark:bg-brown-950 dark:text-cream-100" />
            </label>
            <RecordsError title="Dictionary words are unavailable" retrying={isFetching} onRetry={() => void refetch()} />
          </>}
          <button
            onClick={() => navigate('/vocabulary', { replace: true })}
            className="min-h-11 rounded-xl bg-action px-5 py-2.5 font-semibold text-white hover:bg-action-hover"
          >
            Back to Vocabulary
          </button>
        </div>
      </LearnerPageShell>
    );
  }

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title={category.title}
        subtitle="Dictionary category"
        icon={Library}
        backTo="/vocabulary"
        backLabel="Back to dictionary"
        trailing={(
          <span className="hidden rounded-full bg-cream-100 px-3 py-1.5 text-xs font-semibold text-brown-600 dark:bg-brown-900 dark:text-brown-100 sm:inline-flex">
            {error || isPlaceholderData ? 'Last loaded words' : `${totalWords} ${searchQuery ? 'matches' : 'words'}`}
          </span>
        )}
      />

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
        <ContentTrustNote trust={DICTIONARY_CONTENT_TRUST} className="mb-4" />

        {/* Search within category */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-500 dark:text-brown-300" />
            <input
              aria-label={`Search in ${category.title}`}
              type="text"
              maxLength={200}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${category.title}...`}
              className="min-h-12 w-full rounded-2xl border border-cream-300 bg-white py-3 pl-11 pr-11 text-base text-brown-900 placeholder-brown-500 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-500/30 dark:border-brown-700 dark:bg-brown-900 dark:text-cream-100 dark:placeholder-brown-300"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear category search"
                className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl hover:bg-cream-100 dark:hover:bg-brown-700"
              >
                <X className="w-3 h-3 text-brown-500 dark:text-brown-300" />
              </button>
            )}
          </div>
        </div>

        {error && <RecordsError title={isFetchNextPageError ? 'More dictionary words are unavailable' : 'Dictionary words are unavailable'} hasData={Boolean(displayedPages)} retrying={isFetching} onRetry={() => { if (isFetchNextPageError) void fetchNextPage(); else void refetch(); }} />}
        {fallback && !pages && <p className="mb-3 text-base text-brown-700 dark:text-cream-200">Last loaded results{fallback.query ? ` for “${fallback.query}”` : ''}.</p>}
        <h2 className="sr-only">Dictionary entries</h2>
        {isFetching && <p role="status" className="mb-3 text-sm text-brown-600 dark:text-brown-100">Searching…</p>}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-sm text-brown-600 dark:text-brown-100" aria-live="polite">{!isPlaceholderData && !error && `${words.length} of ${totalWords} ${searchQuery ? 'matches' : 'words'}`}</p>
          <TTSDisclaimer variant="inline" />
        </div>
        {/* Word List */}
        <DictionaryEntryList>
          {filteredWords.map((word, index) => (
            <DictionaryEntryRow
              key={word.word_id ?? word.source_id ?? `${word.chamorro}-${index}`}
              word={word}
              returnTo={returnTo}
            />
          ))}
        </DictionaryEntryList>

        {/* No Results */}
        {filteredWords.length === 0 && searchQuery && !isFetching && !error && (
          <div className="text-center py-12 text-brown-500 dark:text-brown-300">
            <p>No words found matching "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-coral-700 hover:underline mt-2 text-sm"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-6 py-3 bg-action text-white rounded-xl hover:bg-action-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              {isFetchingNextPage ? (
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
        {!hasMore && !error && words.length > PAGE_SIZE && !searchQuery && (
          <div className="mt-6 text-center text-brown-500 dark:text-brown-300 text-sm">
            All {totalWords} words loaded
          </div>
        )}

        {/* Back to Categories */}
        <div className="mt-8 text-center">
          <Link replace
            to="/vocabulary"
            className="pressable inline-flex items-center gap-2 px-4 py-2 text-coral-700 hover:bg-coral-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Categories
          </Link>
        </div>
      </main>
    </LearnerPageShell>
  );
}
