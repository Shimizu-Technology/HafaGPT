import { useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, BookOpen, X } from 'lucide-react';
import { useStory } from '../hooks/useStoryQuery';
import { useVocabularyWord } from '../hooks/useVocabularyQuery';
import { PronunciationButton } from './PronunciationButton';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-word-heading"
        className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 id="story-word-heading" className="text-xl font-bold text-brown-800 dark:text-white">{word}</h3>
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
            <PronunciationButton text={word} className="bg-teal-100 dark:bg-teal-900/30" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close word details"
              className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"
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
                    <span
                      key={i}
                      className="rounded-full bg-cream-100 px-2 py-1 text-xs text-brown-600 dark:bg-slate-700 dark:text-gray-300"
                    >
                      {suggestion}
                    </span>
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
                type="button"
                onClick={() => onAskChatbot(word, chamorroContext)}
                className="min-h-11 w-full rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
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
          <button
            type="button"
            key={i}
            onClick={() => onWordTap(cleanWord)}
            className="inline min-h-9 rounded bg-transparent px-0.5 py-1 text-left transition-colors hover:bg-teal-100 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-teal-900/30 dark:hover:text-teal-400"
          >
            {word}
          </button>
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
      <LearnerPageShell className="flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-brown-600 dark:text-gray-400">Loading story...</p>
        </div>
      </LearnerPageShell>
    );
  }

  if (error || !story) {
    return (
      <LearnerPageShell className="flex items-center justify-center p-4">
        <div className="rounded-2xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-red-500 mb-4">Failed to load story</p>
          <Link
            to="/stories"
            className="text-teal-600 dark:text-teal-400 hover:underline"
          >
            ← Back to stories
          </Link>
        </div>
      </LearnerPageShell>
    );
  }

  const paragraph = story.paragraphs[currentParagraph];
  const progress = ((currentParagraph + 1) / story.paragraphs.length) * 100;

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title={story.title}
        subtitle={`${currentParagraph + 1} of ${story.paragraphs.length} paragraphs`}
        icon={BookOpen}
        backTo="/stories"
        backLabel="Back to stories"
        iconClassName="bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
        trailing={(
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View original on Lengguahi-ta"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-teal-700 hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-950"
          >
            <ExternalLink className="h-5 w-5" aria-hidden="true" />
          </a>
        )}
        below={(
          <div className="h-1 overflow-hidden rounded-full bg-cream-200 dark:bg-slate-700" role="progressbar" aria-label="Story progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      />

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-5 sm:py-8">
        {/* Story Info Card */}
        {currentParagraph === 0 && (
          <div className="rounded-2xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950">
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
        <div className="rounded-2xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          {/* Chamorro Text */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">
                Chamorro
              </span>
              <PronunciationButton text={paragraph.chamorro} className="bg-teal-100 dark:bg-teal-900/30" />
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
                  : 'bg-teal-600 text-white hover:bg-teal-700'
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
      </main>

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
    </LearnerPageShell>
  );
}
