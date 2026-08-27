import { useId, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, Library, Lightbulb, Search, X, Loader2 } from 'lucide-react';
import { useVocabularyCategories, useVocabularySearch, VocabularyWord } from '../hooks/useVocabularyQuery';
import { appRoutes, currentAppPath } from '../lib/routes';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

export function VocabularyList() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  
  // Fetch categories from API
  const { data: categoriesData, isLoading: categoriesLoading } = useVocabularyCategories();
  
  // Search when query is 2+ characters
  const { data: searchData, isLoading: searchLoading } = useVocabularySearch(searchQuery);
  
  const isSearching = searchQuery.length >= 2;
  const searchResults = searchData?.results || [];

  const setSearchQuery = (query: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (query) nextParams.set('q', query);
    else nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  const returnTo = currentAppPath(location.pathname, location.search, location.hash);

  // Color mapping for category cards
  const colorClasses: Record<string, { bg: string; text: string; border: string; hover: string }> = {
    greetings: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
    },
    family: {
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-800',
      hover: 'hover:bg-rose-100 dark:hover:bg-rose-900/30'
    },
    numbers: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
    },
    colors: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-700 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
    },
    food: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30'
    },
    animals: {
      bg: 'bg-teal-50 dark:bg-teal-900/20',
      text: 'text-teal-700 dark:text-teal-400',
      border: 'border-teal-200 dark:border-teal-800',
      hover: 'hover:bg-teal-100 dark:hover:bg-teal-900/30'
    },
    body: {
      bg: 'bg-pink-50 dark:bg-pink-900/20',
      text: 'text-pink-700 dark:text-pink-400',
      border: 'border-pink-200 dark:border-pink-800',
      hover: 'hover:bg-pink-100 dark:hover:bg-pink-900/30'
    },
    verbs: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
      hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30'
    },
    phrases: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      text: 'text-indigo-700 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-800',
      hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
    },
    nature: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
      hover: 'hover:bg-green-100 dark:hover:bg-green-900/30'
    },
    places: {
      bg: 'bg-slate-50 dark:bg-slate-800/50',
      text: 'text-slate-700 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-700',
      hover: 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
    },
    time: {
      bg: 'bg-cyan-50 dark:bg-cyan-900/20',
      text: 'text-cyan-700 dark:text-cyan-400',
      border: 'border-cyan-200 dark:border-cyan-800',
      hover: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/30'
    }
  };

  const getColorClasses = (categoryId: string) => {
    return colorClasses[categoryId] || colorClasses.places;
  };

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title="Dictionary"
        subtitle="Search or browse Chamorro words"
        icon={Library}
        trailing={(
          <span className="hidden rounded-full bg-cream-100 px-3 py-1.5 text-xs font-semibold text-brown-600 dark:bg-slate-800 dark:text-gray-300 sm:inline-flex">
            {categoriesLoading ? '...' : `${categoriesData?.total_words?.toLocaleString() || 0} words`}
          </span>
        )}
      />

      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brown-400 dark:text-gray-500" />
            <input
              aria-label="Search all Chamorro words"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all Chamorro words..."
              className="min-h-12 w-full rounded-2xl border border-cream-300 bg-white py-3 pl-11 pr-11 text-base text-brown-900 placeholder-brown-400 shadow-sm focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-ocean-400 dark:focus:ring-ocean-400/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear dictionary search"
                className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-brown-500 hover:bg-cream-100 dark:text-gray-400 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4 text-brown-400 dark:text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="mb-6">
            {searchLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-coral-500 dark:text-ocean-400" />
                <span className="ml-2 text-brown-600 dark:text-gray-400">Searching...</span>
              </div>
            ) : (
              <>
                <h2 className="text-sm font-medium text-brown-600 dark:text-gray-400 mb-3">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </h2>
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((word, index) => (
                      <SearchResultCard
                        key={word.word_id ?? word.source_id ?? `${word.chamorro}-${index}`}
                        word={word}
                        returnTo={returnTo}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-brown-500 dark:text-gray-400">
                    <p>No words found matching "{searchQuery}"</p>
                    <p className="text-sm mt-1">Try a different spelling or search term</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Category Grid - Hidden when searching */}
        {!isSearching && (
          <>
            {/* Intro */}
            <div className="mb-5">
              <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Browse by topic</p>
              <h2 className="mt-0.5 text-xl font-bold text-brown-950 dark:text-white">Find words you can use today</h2>
              <p className="mt-1 text-sm text-brown-600 dark:text-gray-400">Open a category for definitions, pronunciation, and examples.</p>
            </div>

            {/* Loading State */}
            {categoriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-coral-500 dark:text-ocean-400" />
              </div>
            ) : (
              <>
                {/* Category Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {categoriesData?.categories.map((category) => {
                    const colors = getColorClasses(category.id);
                    return (
                      <Link
                        key={category.id}
                        to={appRoutes.vocabularyCategory(category.id)}
                        className={`${colors.bg} ${colors.border} ${colors.hover} group min-h-32 rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500`}
                      >
                        <div className="text-center">
                          <div className="mb-2 text-3xl sm:text-4xl" aria-hidden="true">
                            {category.icon}
                          </div>
                          <h3 className={`font-bold ${colors.text} text-sm sm:text-base mb-1`}>
                            {category.title}
                          </h3>
                          <p className="text-xs text-brown-500 dark:text-gray-400">
                            {category.word_count} words
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Tip */}
                <div className="mt-8 rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      <Lightbulb className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-brown-900 dark:text-white">
                        Search the full dictionary
                      </h3>
                      <p className="text-sm text-brown-600 dark:text-gray-300">
                        Use the search bar to find any word in our dictionary of {categoriesData?.total_words?.toLocaleString()} words!
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </LearnerPageShell>
  );
}

// Search Result Card Component
function SearchResultCard({ word, returnTo }: { word: VocabularyWord; returnTo: string }) {
  const [expanded, setExpanded] = useState(false);
  const examplesId = useId();
  
  return (
    <article className="w-full rounded-2xl border border-cream-200 bg-white p-4 text-left dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            {word.word_id ? (
              <Link
                to={appRoutes.word(word.word_id, { returnTo })}
                className="rounded font-bold text-brown-800 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-white dark:hover:text-ocean-300 text-lg"
              >
                {word.chamorro}
              </Link>
            ) : (
              <h3 className="font-bold text-brown-800 dark:text-white text-lg">
                {word.chamorro}
              </h3>
            )}
            {word.part_of_speech && (
              <span className="text-xs text-brown-400 dark:text-gray-500 italic">
                {word.part_of_speech}
              </span>
            )}
          </div>
          <p className="text-brown-600 dark:text-gray-300 mt-1">
            {word.definition}
          </p>
          {word.word_id && (
            <Link
              to={appRoutes.word(word.word_id, { returnTo })}
              className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-xl text-sm font-semibold text-coral-700 hover:text-coral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-ocean-300"
            >
              Open dictionary entry
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
          
        </div>
        
        {word.examples && word.examples.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls={examplesId}
            className="inline-flex min-h-11 flex-none items-center gap-1 rounded-xl px-2 text-xs font-medium text-coral-600 hover:bg-coral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-ocean-300 dark:hover:bg-ocean-950/30"
          >
            {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
            {word.examples.length} example{word.examples.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>
      {expanded && word.examples && word.examples.length > 0 && (
        <div id={examplesId} className="mt-3 space-y-2 border-t border-cream-200 pt-3 dark:border-slate-700">
          {word.examples.map((example, index) => (
            <div key={index} className="rounded-xl bg-cream-50 p-3 dark:bg-slate-900/60">
              <p className="font-medium text-brown-800 dark:text-gray-100">{example.chamorro}</p>
              <p className="mt-1 text-sm text-brown-600 dark:text-gray-400">{example.english}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
