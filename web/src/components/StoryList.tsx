import { Link } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  ExternalLink,
  FileText,
  HelpCircle,
  Landmark,
  Library,
  Loader2,
  LockKeyhole,
  Music2,
  ShieldCheck,
  Sparkles,
  Theater,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { STORY_CATEGORIES, getStoryCount } from '../data/storyData';
import { useAvailableStories, AvailableStory } from '../hooks/useStoryQuery';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { useRestorableViewParam } from '../hooks/useRestorableViewParam';

type StoryMode = 'curated' | 'lengguahita';
const STORY_SOURCES: readonly StoryMode[] = ['curated', 'lengguahita'];

// Category icons
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  story: BookOpen,
  lesson: Library,
  legend: Landmark,
  folklore: Waves,
  cultural: Theater,
  song: Music2,
  beginner: BookOpen,
  intermediate: Library,
  advanced: Landmark,
};

function StoryCategoryIcon({ category, className = 'w-5 h-5' }: { category: string; className?: string }) {
  const Icon = CATEGORY_ICONS[category] || BookOpen;
  return <Icon className={className} aria-hidden="true" />;
}

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  story: 'Stories',
  lesson: 'Lessons',
  legend: 'Legends',
  folklore: 'Folklore',
  cultural: 'Cultural',
  song: 'Songs',
};

// Difficulty colors
const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  intermediate: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  advanced: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export function StoryList() {
  const [mode, setMode] = useRestorableViewParam('source', STORY_SOURCES, 'curated');
  const totalCuratedStories = getStoryCount();
  
  // Fetch pre-extracted stories from Lengguahi-ta
  const { data: lengguahitaData, isLoading } = useAvailableStories();
  const byCategory = lengguahitaData?.by_category || {};
  const externalAvailability = lengguahitaData?.availability;

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title="Chamorro stories"
        subtitle={mode === 'curated' ? `${totalCuratedStories} stories · Tap words to translate` : 'Original source access'}
        icon={BookOpen}
        iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5 sm:py-8">
        {/* Mode Toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-cream-200/70 p-1 dark:bg-slate-800" aria-label="Story source">
          <button
            type="button"
            onClick={() => setMode('curated')}
            aria-pressed={mode === 'curated'}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              mode === 'curated'
                ? 'bg-white text-amber-700 shadow-sm ring-1 ring-cream-300 dark:bg-slate-700 dark:text-amber-300 dark:ring-slate-600'
                : 'text-brown-600 dark:text-gray-400 hover:text-brown-800 dark:hover:text-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Curated ({totalCuratedStories})</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('lengguahita')}
            aria-pressed={mode === 'lengguahita'}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              mode === 'lengguahita'
                ? 'bg-white text-teal-700 shadow-sm ring-1 ring-cream-300 dark:bg-slate-700 dark:text-teal-300 dark:ring-slate-600'
                : 'text-brown-600 dark:text-gray-400 hover:text-brown-800 dark:hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>External source</span>
          </button>
        </div>

        {/* Introduction Card */}
        <div className={`rounded-2xl border bg-white p-5 dark:bg-slate-800 ${
          mode === 'curated'
            ? 'border-amber-200 dark:border-amber-800'
            : 'border-teal-200 dark:border-teal-800'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-xl ${mode === 'curated' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-teal-100 dark:bg-teal-900/30'}`}>
              {mode === 'curated' ? (
                <BookOpen className="w-6 h-6 text-amber-700 dark:text-amber-300" aria-hidden="true" />
              ) : (
                <LockKeyhole className="w-6 h-6 text-teal-700 dark:text-teal-300" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-brown-800 dark:text-white mb-1">
                {mode === 'curated' ? 'Learn by Reading' : 'Stories from Lengguahi-ta'}
              </h2>
              <p className="text-sm text-brown-600 dark:text-gray-300">
                {mode === 'curated' ? (
                  <>
                    Read Chamorro stories and <span className="font-semibold text-amber-600 dark:text-amber-400">tap any word</span> to see its translation. 
                    After each story, test your understanding with comprehension questions!
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">Lengguahi-ta</span> is an independent Chamorro learning resource.
                    HåfaGPT links to the original while copied stories are disabled pending written reuse permission and attribution review.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Curated Stories */}
        {mode === 'curated' && (
          <>
            {STORY_CATEGORIES.map((category) => (
              <div key={category.id} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center gap-2 px-1">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                    <StoryCategoryIcon category={category.id} />
                  </div>
                  <div>
                    <h3 className="font-bold text-brown-800 dark:text-white">
                      {category.title}
                    </h3>
                    <p className="text-xs text-brown-500 dark:text-gray-400">
                      {category.description}
                    </p>
                  </div>
                </div>

                {/* Story Cards */}
                <div className="space-y-2">
                  {category.stories.map((story) => (
                    <Link
                      key={story.id}
                      to={`/stories/${story.id}`}
                      className="group block rounded-2xl border border-cream-200 bg-white p-4 transition-colors hover:border-amber-300 hover:bg-amber-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-amber-700 dark:hover:bg-amber-950/10"
                    >
                      <div className="flex items-start gap-4">
                        {/* Story Icon */}
                        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950">
                          <StoryCategoryIcon category={category.id} className="w-6 h-6 text-amber-700 dark:text-amber-300" />
                        </div>

                        {/* Story Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-brown-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {story.title}
                              </h4>
                              <p className="text-xs text-brown-500 dark:text-gray-400 italic">
                                {story.titleEnglish}
                              </p>
                            </div>
                            
                            {/* Difficulty Badge */}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${DIFFICULTY_STYLES[story.difficulty]}`}>
                              {story.difficulty}
                            </span>
                          </div>

                          <p className="text-sm text-brown-600 dark:text-gray-300 mt-1 line-clamp-2">
                            {story.description}
                          </p>

                          {/* Meta Info */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-brown-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {story.readingTime} min
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {story.wordCount} words
                            </span>
                            <span className="flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" aria-hidden="true" />
                              {story.questions.length} questions
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Lengguahi-ta Stories */}
        {mode === 'lengguahita' && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                <span className="ml-3 text-brown-600 dark:text-gray-400">Loading stories...</span>
              </div>
            ) : externalAvailability?.enabled && Object.keys(byCategory).length > 0 ? (
              Object.entries(byCategory).map(([category, stories]) => (
                <div key={category} className="space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center gap-2 px-1">
                    <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
                      <StoryCategoryIcon category={category} />
                    </div>
                    <div>
                      <h3 className="font-bold text-brown-800 dark:text-white">
                        {CATEGORY_LABELS[category] || category}
                      </h3>
                      <p className="text-xs text-brown-500 dark:text-gray-400">
                        {(stories as AvailableStory[]).length} stories
                      </p>
                    </div>
                  </div>

                  {/* Story Cards */}
                  <div className="space-y-2">
                    {(stories as AvailableStory[]).map((story) => (
                      <Link
                        key={story.id}
                        to={`/stories/lengguahita/${story.id}`}
                        className="group block rounded-2xl border border-cream-200 bg-white p-4 transition-colors hover:border-teal-300 hover:bg-teal-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-700 dark:hover:bg-teal-950/10"
                      >
                        <div className="flex items-start gap-4">
                          {/* Story Icon */}
                          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950">
                            <StoryCategoryIcon category={story.category} className="w-6 h-6 text-teal-700 dark:text-teal-300" />
                          </div>

                          {/* Story Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-brown-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                  {story.title}
                                </h4>
                                {story.titleChamorro && (
                                  <p className="text-xs text-brown-500 dark:text-gray-400 italic">
                                    {story.titleChamorro}
                                  </p>
                                )}
                              </div>
                              
                              {/* Difficulty Badge */}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${DIFFICULTY_STYLES[story.difficulty]}`}>
                                {story.difficulty}
                              </span>
                            </div>

                            {story.author && (
                              <p className="text-xs text-brown-500 dark:text-gray-400 mt-1">
                                by {story.author}
                              </p>
                            )}

                            {/* Meta Info */}
                            <div className="flex items-center gap-4 mt-2 text-xs text-brown-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {story.paragraphCount} paragraphs
                              </span>
                              <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                                <ExternalLink className="w-3 h-3" />
                                {story.sourceName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-teal-200 dark:border-teal-800 p-6 text-center">
                <LockKeyhole className="w-8 h-8 mx-auto mb-3 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                <h3 className="font-semibold text-brown-800 dark:text-white mb-2">Original stories are available on Lengguahi-ta</h3>
                <p className="text-sm text-brown-600 dark:text-gray-400 max-w-xl mx-auto mb-4">
                  {externalAvailability?.message || 'Copied story content is unavailable while HåfaGPT confirms reuse permission and attribution.'}
                </p>
                <a
                  href={externalAvailability?.sourceUrl || 'https://lengguahita.com/resources/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 rounded-full bg-teal-700 text-white font-medium hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 transition-colors"
                >
                  Visit Lengguahi-ta
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            )}
          </>
        )}

        {/* Info Card */}
        <div className="rounded-2xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 mb-2">
            {mode === 'curated' ? (
              <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            )}
            <h3 className="font-semibold text-brown-800 dark:text-white">
              {mode === 'curated' ? 'More Stories Coming!' : 'About Lengguahi-ta Stories'}
            </h3>
          </div>
          <p className="text-sm text-brown-600 dark:text-gray-400">
            {mode === 'curated' ? (
              'We\'re adding more Chamorro legends, cultural stories, and beginner-friendly tales. Check back soon for new content!'
            ) : (
              <>
                HåfaGPT currently links to <a href="https://lengguahita.com/resources/" target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline">Lengguahi-ta</a> instead of reproducing its stories. Full-text access can return after written permission and attribution review are recorded.
              </>
            )}
          </p>
        </div>
      </main>
    </LearnerPageShell>
  );
}
