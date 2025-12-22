import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Book, Search, X, Loader2 } from 'lucide-react';
import { useVocabularyCategories, useVocabularySearch, VocabularyWord } from '../hooks/useVocabularyQuery';

export function VocabularyList() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch categories from API
  const { data: categoriesData, isLoading: categoriesLoading } = useVocabularyCategories();
  
  // Search when query is 2+ characters
  const { data: searchData, isLoading: searchLoading } = useVocabularySearch(searchQuery);
  
  const isSearching = searchQuery.length >= 2;
  const searchResults = searchData?.results || [];

  const clearSearch = () => {
    setSearchQuery('');
  };

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
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between safe-area-top">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
            </Link>
            <div className="flex items-center gap-2">
              <Book className="w-6 h-6 text-coral-500 dark:text-ocean-400" />
              <h1 className="text-xl font-semibold text-brown-800 dark:text-white">
                Vocabulary
              </h1>
            </div>
          </div>
          <div className="text-sm text-brown-500 dark:text-gray-400">
            {categoriesLoading ? '...' : `${categoriesData?.total_words?.toLocaleString() || 0} words`}
          </div>
        </div>
      </div>

      {/* Content - extra bottom padding on mobile for bottom nav */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20 sm:pb-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brown-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all Chamorro words..."
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-cream-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-brown-800 dark:text-white placeholder-brown-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-coral-500 dark:focus:ring-ocean-500"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-cream-100 dark:hover:bg-slate-700 transition-colors"
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
                      <SearchResultCard key={`${word.chamorro}-${index}`} word={word} />
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
            <div className="mb-6">
              <p className="text-brown-700 dark:text-gray-200 mb-2 font-medium">
                Browse Chamorro vocabulary by category 📚
              </p>
              <p className="text-sm text-brown-600 dark:text-gray-400">
                Tap a category to see all words with definitions and examples.
              </p>
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
                        to={`/vocabulary/${category.id}`}
                        className={`${colors.bg} ${colors.border} ${colors.hover} border rounded-2xl p-4 transition-all duration-200 group`}
                      >
                        <div className="text-center">
                          <div className="text-3xl sm:text-4xl mb-2 group-hover:scale-110 transition-transform">
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
                <div className="mt-8 p-4 bg-gradient-to-r from-coral-100 to-ocean-100 dark:from-coral-900/20 dark:to-ocean-900/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <h3 className="font-semibold text-brown-800 dark:text-white">
                        Pro Tip
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
      </div>
    </div>
  );
}

// Search Result Card Component
function SearchResultCard({ word }: { word: VocabularyWord }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-cream-200 dark:border-slate-700 cursor-pointer hover:bg-cream-50 dark:hover:bg-slate-700/50 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-4">
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
          <p className="text-brown-600 dark:text-gray-300 mt-1">
            {word.definition}
          </p>
          
          {/* Expanded examples */}
          {expanded && word.examples && word.examples.length > 0 && (
            <div className="mt-3 space-y-2">
              {word.examples.map((example, idx) => (
                <div key={idx} className="bg-cream-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <p className="text-brown-800 dark:text-white font-medium text-sm">
                    {example.chamorro}
                  </p>
                  <p className="text-brown-600 dark:text-gray-300 text-sm mt-1">
                    {example.english}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {word.examples && word.examples.length > 0 && (
          <span className="text-xs text-coral-500 dark:text-ocean-400 whitespace-nowrap">
            {expanded ? '▲' : '▼'} {word.examples.length} example{word.examples.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
