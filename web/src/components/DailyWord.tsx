import { useState } from 'react';
import { Volume2, Plus, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { useWordOfTheDay, WordOfTheDay } from '../hooks/useVocabularyQuery';
import { useSpeech } from '../hooks/useSpeech';

interface DailyWordProps {
  onAddToFlashcards?: (word: WordOfTheDay) => void;
  compactOnMobile?: boolean;
}

export function DailyWord({ onAddToFlashcards, compactOnMobile = false }: DailyWordProps) {
  const { data: word, isLoading, error } = useWordOfTheDay();
  const { speak, isSpeaking, isSupported } = useSpeech();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [added, setAdded] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-coral-50 to-coral-100 dark:from-slate-800 dark:to-slate-700/50 rounded-2xl border-2 border-coral-200/50 dark:border-ocean-500/40 p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-coral-500 dark:text-ocean-400" />
      </div>
    );
  }

  // Error or no data
  if (error || !word) {
    return null; // Silently fail - don't show broken widget
  }

  const handleSpeak = () => {
    if (!isSpeaking) {
      speak(word.chamorro);
    }
  };

  const handleAddToFlashcards = () => {
    if (onAddToFlashcards && word) {
      onAddToFlashcards(word);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // Get category badge color based on category name
  const getCategoryColor = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('greeting') || categoryLower.includes('basic')) {
      return 'bg-green-100 dark:bg-green-800/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700';
    }
    if (categoryLower.includes('family')) {
      return 'bg-pink-100 dark:bg-pink-800/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-700';
    }
    if (categoryLower.includes('food') || categoryLower.includes('drink')) {
      return 'bg-amber-100 dark:bg-amber-800/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700';
    }
    if (categoryLower.includes('nature') || categoryLower.includes('weather')) {
      return 'bg-emerald-100 dark:bg-emerald-800/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700';
    }
    return 'bg-coral-100 dark:bg-ocean-800/60 text-coral-700 dark:text-ocean-300 border border-coral-200 dark:border-ocean-700';
  };

  // Compact mobile view (collapsed by default)
  if (compactOnMobile) {
    return (
      <>
        {/* Mobile: Compact collapsible view */}
        <div className="sm:hidden">
          <button
            onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            className="w-full bg-gradient-to-r from-coral-50 to-coral-100 dark:from-slate-800 dark:to-slate-700/50 rounded-xl border border-coral-200/50 dark:border-ocean-500/40 p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-coral-500 dark:text-ocean-400" />
              <div className="text-left">
                <span className="text-xs text-coral-600 dark:text-ocean-400 font-medium">Word of the Day</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brown-800 dark:text-white">{word.chamorro}</span>
                  <span className="text-brown-500 dark:text-gray-400">•</span>
                  <span className="text-sm text-brown-600 dark:text-gray-300">{word.english}</span>
                </div>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-coral-500 dark:text-ocean-400 transition-transform ${isMobileExpanded ? 'rotate-90' : ''}`} />
          </button>
          
          {isMobileExpanded && (
            <div className="mt-2 bg-gradient-to-br from-coral-50 to-coral-100 dark:from-slate-800 dark:to-slate-700/50 rounded-xl border border-coral-200/50 dark:border-ocean-500/40 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  {word.part_of_speech && (
                    <p className="text-sm text-brown-500 dark:text-gray-400 italic mb-1">{word.part_of_speech}</p>
                  )}
                  <p className="text-xs text-brown-500 dark:text-gray-400">{word.category}</p>
                </div>
                {isSupported && (
                  <button
                    onClick={handleSpeak}
                    className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                      isSpeaking
                        ? 'bg-coral-500 dark:bg-ocean-500 text-white animate-pulse'
                        : 'bg-white dark:bg-slate-700 text-coral-600 dark:text-ocean-300 border border-coral-200 dark:border-ocean-500/50'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {word.example && (
                <div className="p-3 bg-white/60 dark:bg-slate-700/60 rounded-lg text-sm">
                  <p className="text-brown-800 dark:text-white font-medium">"{word.example.chamorro}"</p>
                  <p className="text-brown-600 dark:text-gray-300 italic">"{word.example.english}"</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Desktop: Full view */}
        <div className="hidden sm:block bg-gradient-to-br from-coral-50 to-coral-100 dark:from-slate-800 dark:to-slate-700/50 rounded-2xl border-2 border-coral-200/50 dark:border-ocean-500/40 overflow-hidden shadow-md dark:shadow-xl dark:shadow-black/20">
          {/* Header */}
          <div className="px-4 py-3 bg-coral-100/50 dark:bg-ocean-900/50 border-b border-coral-200/30 dark:border-ocean-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-coral-500 dark:text-ocean-400" />
                <span className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Word of the Day</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(word.category)}`}>
                {word.category}
              </span>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-3xl font-bold text-brown-800 dark:text-white mb-1 break-words">{word.chamorro}</h3>
                {word.part_of_speech && (
                  <p className="text-sm text-brown-500 dark:text-gray-400 italic">{word.part_of_speech}</p>
                )}
              </div>
              {isSupported && (
                <button
                  onClick={handleSpeak}
                  className={`p-3 rounded-xl transition-all flex-shrink-0 flex items-center justify-center ${
                    isSpeaking
                      ? 'bg-coral-500 dark:bg-ocean-500 text-white animate-pulse'
                      : 'bg-white dark:bg-slate-700 text-coral-600 dark:text-ocean-300 hover:bg-coral-50 dark:hover:bg-slate-600 border border-coral-200 dark:border-ocean-500/50'
                  }`}
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="mb-3">
              <p className="text-lg text-brown-700 dark:text-white font-medium">{word.english}</p>
            </div>
            {word.example && (
              <div className="mb-4">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 text-sm text-coral-600 dark:text-ocean-300 hover:underline"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  {isExpanded ? 'Hide example' : 'Show example'}
                </button>
                {isExpanded && (
                  <div className="mt-2 p-3 bg-white/60 dark:bg-slate-700/60 rounded-xl border border-coral-200/30 dark:border-ocean-500/30">
                    <p className="text-brown-800 dark:text-white font-medium mb-1">"{word.example.chamorro}"</p>
                    <p className="text-sm text-brown-600 dark:text-gray-300 italic">"{word.example.english}"</p>
                  </div>
                )}
              </div>
            )}
            {onAddToFlashcards && (
              <button
                onClick={handleAddToFlashcards}
                disabled={added}
                className={`w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  added
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                    : 'bg-coral-500 dark:bg-ocean-500 text-white hover:bg-coral-600 dark:hover:bg-ocean-600 active:scale-98'
                }`}
              >
                {added ? (<><span>✓</span>Added!</>) : (<><Plus className="w-4 h-4" />Add to Flashcards</>)}
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // Default full view (original behavior)
  return (
    <div className="bg-gradient-to-br from-coral-50 to-coral-100 dark:from-slate-800 dark:to-slate-700/50 rounded-2xl border-2 border-coral-200/50 dark:border-ocean-500/40 overflow-hidden shadow-md dark:shadow-xl dark:shadow-black/20">
      {/* Header */}
      <div className="px-4 py-3 bg-coral-100/50 dark:bg-ocean-900/50 border-b border-coral-200/30 dark:border-ocean-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-coral-500 dark:text-ocean-400" />
            <span className="text-sm font-semibold text-coral-700 dark:text-ocean-300">
              Word of the Day
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(word.category)}`}>
            {word.category}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Word */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl sm:text-3xl font-bold text-brown-800 dark:text-white mb-1 break-words">
              {word.chamorro}
            </h3>
            {word.part_of_speech && (
              <p className="text-sm text-brown-500 dark:text-gray-400 italic">
                {word.part_of_speech}
              </p>
            )}
          </div>
          
          {/* Listen Button */}
          {isSupported && (
            <button
              onClick={handleSpeak}
              className={`p-3 rounded-xl transition-all flex-shrink-0 flex items-center justify-center ${
                isSpeaking
                  ? 'bg-coral-500 dark:bg-ocean-500 text-white animate-pulse'
                  : 'bg-white dark:bg-slate-700 text-coral-600 dark:text-ocean-300 hover:bg-coral-50 dark:hover:bg-slate-600 border border-coral-200 dark:border-ocean-500/50'
              }`}
              aria-label="Listen to pronunciation"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Meaning */}
        <div className="mb-3">
          <p className="text-lg text-brown-700 dark:text-white font-medium">
            {word.english}
          </p>
        </div>

        {/* Example (expandable) */}
        {word.example && (
          <div className="mb-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-sm text-coral-600 dark:text-ocean-300 hover:underline"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              {isExpanded ? 'Hide example' : 'Show example'}
            </button>
            
            {isExpanded && (
              <div className="mt-2 p-3 bg-white/60 dark:bg-slate-700/60 rounded-xl border border-coral-200/30 dark:border-ocean-500/30">
                <p className="text-brown-800 dark:text-white font-medium mb-1">
                  "{word.example.chamorro}"
                </p>
                <p className="text-sm text-brown-600 dark:text-gray-300 italic">
                  "{word.example.english}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Add to Flashcards Button */}
        {onAddToFlashcards && (
          <button
            onClick={handleAddToFlashcards}
            disabled={added}
            className={`w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              added
                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                : 'bg-coral-500 dark:bg-ocean-500 text-white hover:bg-coral-600 dark:hover:bg-ocean-600 active:scale-98'
            }`}
          >
            {added ? (
              <>
                <span>✓</span>
                Added!
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add to Flashcards
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

