import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Library, Lightbulb, Search, X, Loader2 } from 'lucide-react';
import { useVocabularyCategories, useVocabularySearch } from '../hooks/useVocabularyQuery';
import { appRoutes, currentAppPath } from '../lib/routes';
import { DictionaryEntryList, DictionaryEntryRow } from './DictionaryEntryRow';
import { RecordsError } from './RecordsError';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

export function VocabularyList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  
  // Fetch categories from API
  const { data: categoriesData, isLoading: categoriesLoading, isError: categoriesError, isFetching: categoriesFetching, refetch: retryCategories } = useVocabularyCategories();
  
  // Search when query is 2+ characters
  const { data: searchData, isLoading: searchLoading, isPlaceholderData: searchUpdating, isError: searchError, isFetching: searchFetching, refetch: retrySearch } = useVocabularySearch(searchQuery);
  
  const lastSearch = useRef<typeof searchData>();
  useEffect(() => { if (searchData) lastSearch.current = searchData; }, [searchData]);
  const displayedSearch = searchData ?? (searchError ? lastSearch.current : undefined);
  const isSearching = searchQuery.length >= 2;
  const searchResults = displayedSearch?.results || [];

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

  const returnTo = currentAppPath(location.pathname, location.search, location.hash);


  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title="Dictionary"
        subtitle="Search or browse Chamorro words"
        icon={Library}
        trailing={(
          <span className="hidden rounded-full bg-cream-100 px-3 py-1.5 text-xs font-semibold text-brown-600 dark:bg-brown-900 dark:text-brown-100 sm:inline-flex">
            {categoriesLoading ? 'Loading…' : categoriesData ? `${categoriesData.total_words.toLocaleString()} words${categoriesError ? ' (last loaded)' : ''}` : 'Word count unavailable'}
          </span>
        )}
      />

      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brown-500 dark:text-brown-300" />
            <input
              aria-label="Search all Chamorro words"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all Chamorro words..."
              className="min-h-12 w-full rounded-2xl border border-cream-300 bg-white py-3 pl-11 pr-11 text-base text-brown-900 placeholder-brown-500 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-500/30 dark:border-brown-700 dark:bg-brown-900 dark:text-cream-100 dark:placeholder-brown-300"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear dictionary search"
                className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-brown-500 hover:bg-cream-100 dark:text-brown-300 dark:hover:bg-brown-700"
              >
                <X className="w-4 h-4 text-brown-500 dark:text-brown-300" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="mb-6">
            {searchError && <RecordsError title="Dictionary search is unavailable" hasData={Boolean(displayedSearch)} retrying={searchFetching} onRetry={() => void retrySearch()} />}
            {searchLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-coral-700" />
                <span aria-live="polite" className="ml-2 text-brown-600 dark:text-brown-300">Searching...</span>
              </div>
            ) : displayedSearch ? (
              <>
                <h2 aria-live="polite" className="text-sm font-medium text-brown-600 dark:text-brown-300 mb-3">
                  {searchUpdating ? 'Searching...' : <>{displayedSearch.query !== searchQuery ? `Last loaded results for “${displayedSearch.query}”: ` : ''}{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</>}
                </h2>
                {searchUpdating && displayedSearch.query !== searchQuery && <p className="mb-3 text-base text-brown-600 dark:text-brown-300">Showing the last loaded results while this search finishes.</p>}
                {searchResults.length > 0 ? (
                  <DictionaryEntryList>
                    {searchResults.map((word, index) => (
                      <DictionaryEntryRow
                        key={word.word_id ?? word.source_id ?? `${word.chamorro}-${index}`}
                        word={word}
                        returnTo={returnTo}
                        showAudio={false}
                      />
                    ))}
                  </DictionaryEntryList>
                ) : !searchError ? (
                  <div className="min-h-28 text-center py-8 text-brown-500 dark:text-brown-300">
                    {!searchUpdating && <>
                      <p>No words found matching "{searchQuery}"</p>
                      <p className="text-sm mt-1">Try a different spelling or search term</p>
                    </>}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        )}

        {/* Category Grid - Hidden when searching */}
        {!isSearching && (
          <>
            {/* Intro */}
            <div className="mb-5">
              <h2 className="mt-0.5 text-xl font-bold text-brown-950 dark:text-cream-100">Find words you can use today</h2>
              <p className="mt-1 text-sm text-brown-600 dark:text-brown-300">Open a category for definitions, pronunciation, and examples.</p>
            </div>

            {categoriesError && <RecordsError title="Dictionary categories are unavailable" hasData={Boolean(categoriesData)} retrying={categoriesFetching} onRetry={() => void retryCategories()} />}
            {/* Loading State */}
            {categoriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-coral-700" />
              </div>
            ) : categoriesData ? (
              <>
                {/* Category Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {categoriesData?.categories.map((category) => {
                    return (
                      <Link
                        key={category.id}
                        to={appRoutes.vocabularyCategory(category.id)}
                        className={`bg-white dark:bg-brown-900 border-cream-200 dark:border-brown-700 hover:border-coral-300 hover:bg-cream-50 dark:hover:bg-brown-700 group min-h-32 rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500`}
                      >
                        <div className="text-center">
                          <div className="mb-2 text-3xl sm:text-4xl" aria-hidden="true">
                            {category.icon}
                          </div>
                          <h3 className={`font-bold text-brown-800 dark:text-cream-100 text-sm sm:text-base mb-1`}>
                            {category.title}
                          </h3>
                          <p className="text-xs text-brown-500 dark:text-brown-300">
                            {category.word_count} words
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Tip */}
                <div className="mt-8 rounded-2xl border border-cream-200 bg-white p-4 dark:border-brown-700 dark:bg-brown-900">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      <Lightbulb className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-brown-900 dark:text-cream-100">
                        Search the full dictionary
                      </h3>
                      <p className="text-sm text-brown-600 dark:text-brown-100">
                        Use the search bar to find any word in our dictionary of {categoriesData?.total_words?.toLocaleString()} words!
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}
      </main>
    </LearnerPageShell>
  );
}
