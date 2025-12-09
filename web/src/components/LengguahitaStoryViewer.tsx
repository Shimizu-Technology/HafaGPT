import { useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2, ExternalLink, Loader2, BookOpen, X } from 'lucide-react';
import { useStory } from '../hooks/useStoryQuery';
import { useVocabularyWord } from '../hooks/useVocabularyQuery';

// TTS function
const speakText = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES'; // Spanish approximates Chamorro pronunciation
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }
};

// Word popup component with enhanced morphology support
function WordPopup({ 
  word, 
  chamorroContext,
  englishContext,
  onClose,
  onAskChatbot
}: { 
  word: string; 
  chamorroContext?: string;
  englishContext?: string;
  onClose: () => void;
  onAskChatbot?: (word: string, context?: string) => void;
}) {
  const { data: wordData, isLoading } = useVocabularyWord(word);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl font-bold text-brown-800 dark:text-white">{word}</h3>
            {/* Show root word if different */}
            {wordData?.rootWord && wordData.rootWord !== word && (
              <p className="text-sm text-teal-600 dark:text-teal-400">
                → root: <span className="font-medium">{wordData.rootWord}</span>
              </p>
            )}
            {wordData?.pronunciation && (
              <p className="text-sm text-brown-500 dark:text-gray-400">/{wordData.pronunciation}/</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => speakText(word)}
              className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors flex items-center justify-center"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
          </div>
        ) : wordData?.found ? (
          <div className="space-y-3">
            {/* Morphology note */}
            {wordData.morphologyNote && (
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {wordData.morphologyNote}
                </p>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium text-brown-500 dark:text-gray-400">Definition</p>
              <p className="text-brown-800 dark:text-white">{wordData.definition}</p>
            </div>
            {wordData.partOfSpeech && (
              <div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
                  {wordData.partOfSpeech}
                </span>
              </div>
            )}
            {wordData.examples && wordData.examples.length > 0 && (
              <div>
                <p className="text-sm font-medium text-brown-500 dark:text-gray-400">Example</p>
                <p className="text-sm text-brown-600 dark:text-gray-300 italic">
                  {wordData.examples[0]}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Morphology hint even when not found */}
            {wordData?.morphologyNote && (
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {wordData.morphologyNote}
                </p>
              </div>
            )}
            
            {/* Show English context as fallback */}
            {englishContext && (
              <div className="p-3 bg-cream-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-xs font-medium text-brown-500 dark:text-gray-400 mb-1">
                  From the English translation:
                </p>
                <p className="text-sm text-brown-700 dark:text-gray-300 italic">
                  "{englishContext}"
                </p>
              </div>
            )}
            
            {/* Suggestions */}
            {wordData?.suggestions && wordData.suggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-brown-500 dark:text-gray-400 mb-2">
                  Try looking up:
                </p>
                <div className="flex flex-wrap gap-2">
                  {wordData.suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        // Could trigger a new lookup
                      }}
                      className="text-xs px-2 py-1 rounded-full bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-brown-500 dark:text-gray-400 text-sm">
              This word isn't in our dictionary yet.
            </p>
            
            {/* Ask chatbot button */}
            {onAskChatbot && (
              <button
                onClick={() => onAskChatbot(word, chamorroContext)}
                className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:from-teal-600 hover:to-cyan-600 transition-colors text-sm"
              >
                Ask HåfaGPT about "{word}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Tappable text component
function TappableText({ 
  text, 
  onWordTap 
}: { 
  text: string; 
  onWordTap: (word: string) => void;
}) {
  const words = text.split(/(\s+)/);
  
  return (
    <span>
      {words.map((word, i) => {
        // Skip whitespace
        if (/^\s+$/.test(word)) {
          return <span key={i}>{word}</span>;
        }
        
        // Clean word for lookup (remove punctuation)
        const cleanWord = word.replace(/[.,!?;:'"()[\]{}]/g, '').toLowerCase();
        
        if (!cleanWord) {
          return <span key={i}>{word}</span>;
        }
        
        return (
          <span
            key={i}
            onClick={() => onWordTap(cleanWord)}
            className="cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-400 rounded px-0.5 transition-colors"
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}

export function LengguahitaStoryViewer() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const { data: story, isLoading, error } = useStory(storyId);

  const handleWordTap = useCallback((word: string) => {
    setSelectedWord(word);
  }, []);
  
  const handleAskChatbot = useCallback((word: string, chamorroContext?: string) => {
    // Navigate to chat with pre-filled message including context
    let message: string;
    
    if (chamorroContext) {
      // Truncate context if too long (keep first 150 chars)
      const truncatedContext = chamorroContext.length > 150 
        ? chamorroContext.substring(0, 150) + '...'
        : chamorroContext;
      message = `What does "${word}" mean in Chamorro? Here's the context it's used in: "${truncatedContext}"`;
    } else {
      message = `What does "${word}" mean in Chamorro?`;
    }
    
    navigate(`/chat?message=${encodeURIComponent(message)}`);
  }, [navigate]);

  const goToPrevious = () => {
    if (currentParagraph > 0) {
      setCurrentParagraph(currentParagraph - 1);
      setShowEnglish(false);
    }
  };

  const goToNext = () => {
    if (story && currentParagraph < story.paragraphs.length - 1) {
      setCurrentParagraph(currentParagraph + 1);
      setShowEnglish(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-brown-600 dark:text-gray-400">Loading story...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load story</p>
          <Link
            to="/stories"
            className="text-teal-600 dark:text-teal-400 hover:underline"
          >
            ← Back to stories
          </Link>
        </div>
      </div>
    );
  }

  const paragraph = story.paragraphs[currentParagraph];
  const progress = ((currentParagraph + 1) / story.paragraphs.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-teal-200/20 dark:border-teal-500/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/stories"
            className="p-2 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </Link>
          
          <div className="flex-1 mx-4">
            <h1 className="text-sm font-bold text-brown-800 dark:text-white truncate">
              {story.title}
            </h1>
            <p className="text-xs text-brown-500 dark:text-gray-400">
              {currentParagraph + 1} / {story.paragraphs.length} paragraphs
            </p>
          </div>

          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
            title="View original on Lengguahi-ta"
          >
            <ExternalLink className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </a>
        </div>
        
        {/* Progress bar */}
        <div className="h-1 bg-cream-200 dark:bg-slate-700">
          <div 
            className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Story Info Card */}
        {currentParagraph === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-cream-200 dark:border-slate-700">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 flex items-center justify-center text-3xl flex-shrink-0">
                <BookOpen className="w-7 h-7 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-brown-800 dark:text-white">
                  {story.titleEnglish}
                </h2>
                {story.titleChamorro && (
                  <p className="text-sm text-brown-500 dark:text-gray-400 italic">
                    {story.titleChamorro}
                  </p>
                )}
                {story.author && (
                  <p className="text-sm text-brown-500 dark:text-gray-400 mt-1">
                    by {story.author}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    story.difficulty === 'beginner'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : story.difficulty === 'intermediate'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {story.difficulty}
                  </span>
                  <span className="text-brown-500 dark:text-gray-400">
                    {story.paragraphCount} paragraphs • ~{story.readingTime} min
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Paragraph Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-cream-200 dark:border-slate-700">
          {/* Chamorro Text */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">
                Chamorro
              </span>
              <button
                onClick={() => speakText(paragraph.chamorro)}
                className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors flex items-center justify-center"
                title="Listen to pronunciation"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xl leading-relaxed text-brown-800 dark:text-white">
              <TappableText text={paragraph.chamorro} onWordTap={handleWordTap} />
            </p>
            <p className="text-xs text-brown-400 dark:text-gray-500 mt-2">
              Tap any word to see its translation
            </p>
          </div>

          {/* English Translation Toggle */}
          <div className="border-t border-cream-200 dark:border-slate-700 pt-4">
            <button
              onClick={() => setShowEnglish(!showEnglish)}
              className="w-full py-3 rounded-xl bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 font-medium hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors"
            >
              {showEnglish ? 'Hide Translation' : 'Show English Translation'}
            </button>
            
            {showEnglish && (
              <div className="mt-4 p-4 bg-cream-50 dark:bg-slate-700/50 rounded-xl">
                <span className="text-xs font-medium text-brown-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
                  English
                </span>
                <p className="text-brown-700 dark:text-gray-300 leading-relaxed">
                  {paragraph.english}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-4">
          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={goToPrevious}
              disabled={currentParagraph === 0}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-3 rounded-xl font-medium transition-all flex-shrink-0 ${
                currentParagraph === 0
                  ? 'bg-cream-100 dark:bg-slate-800 text-brown-400 dark:text-gray-600 cursor-not-allowed'
                  : 'bg-white dark:bg-slate-800 text-brown-700 dark:text-gray-300 hover:bg-cream-100 dark:hover:bg-slate-700 shadow-sm border border-cream-200 dark:border-slate-700'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Page indicator - text only on mobile */}
            <div className="flex-1 text-center">
              <span className="text-sm text-brown-600 dark:text-gray-400">
                {currentParagraph + 1} / {story.paragraphs.length}
              </span>
            </div>

            <button
              onClick={goToNext}
              disabled={currentParagraph === story.paragraphs.length - 1}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-3 rounded-xl font-medium transition-all flex-shrink-0 ${
                currentParagraph === story.paragraphs.length - 1
                  ? 'bg-cream-100 dark:bg-slate-800 text-brown-400 dark:text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 shadow-md'
              }`}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Pagination dots - hidden on mobile, shown on tablet+ */}
          <div className="hidden sm:flex justify-center gap-1.5">
            {story.paragraphs.slice(0, 15).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentParagraph(i);
                  setShowEnglish(false);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === currentParagraph
                    ? 'bg-teal-500 w-6'
                    : i < currentParagraph
                    ? 'bg-teal-300 dark:bg-teal-700'
                    : 'bg-cream-300 dark:bg-slate-600'
                }`}
                title={`Go to paragraph ${i + 1}`}
              />
            ))}
            {story.paragraphs.length > 15 && (
              <span className="text-xs text-brown-400 dark:text-gray-500 ml-1 self-center">
                +{story.paragraphs.length - 15}
              </span>
            )}
          </div>
        </div>

        {/* Attribution */}
        <div className="text-center text-xs text-brown-500 dark:text-gray-400 pt-4">
          <p>{story.attribution}</p>
          <a 
            href={story.sourceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-teal-600 dark:text-teal-400 hover:underline"
          >
            View original on {story.sourceName}
          </a>
        </div>
      </div>

      {/* Word Popup */}
      {selectedWord && (
        <WordPopup 
          word={selectedWord}
          chamorroContext={paragraph?.chamorro}
          englishContext={paragraph?.english}
          onClose={() => setSelectedWord(null)}
          onAskChatbot={handleAskChatbot}
        />
      )}
    </div>
  );
}

