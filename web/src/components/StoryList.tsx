import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink, Loader2, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { STORY_CATEGORIES, getStoryCount } from '../data/storyData';
import { useAvailableStories, AvailableStory } from '../hooks/useStoryQuery';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { useRestorableViewParam } from '../hooks/useRestorableViewParam';

type StoryMode = 'curated' | 'lengguahita';
const STORY_SOURCES: readonly StoryMode[] = ['curated', 'lengguahita'];

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  story: 'Stories',
  lesson: 'Lessons',
  legend: 'Legends',
  folklore: 'Folklore',
  cultural: 'Cultural',
  song: 'Songs',
};

// One bordered list per category; rows carry text only, so a screen shows several stories.
const storyListClass = 'overflow-hidden rounded-2xl border border-cream-200 bg-white dark:border-brown-700 dark:bg-brown-900';
const storyRowClass = 'block min-h-14 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset';
const storyMetaClass = 'mt-1 block text-sm text-brown-600 first-letter:uppercase dark:text-brown-100';

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
        iconClassName="bg-cream-100 text-brown-700 dark:bg-brown-700 dark:text-brown-100"
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5 sm:py-8">
        {/* Mode Toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-cream-200/70 p-1 dark:bg-brown-900" aria-label="Story source">
          <button
            type="button"
            onClick={() => setMode('curated')}
            aria-pressed={mode === 'curated'}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              mode === 'curated'
                ? 'bg-action text-white'
                : 'text-brown-600 dark:text-brown-300 hover:text-brown-800 dark:hover:text-cream-200'
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
                ? 'bg-action text-white'
                : 'text-brown-600 dark:text-brown-300 hover:text-brown-800 dark:hover:text-cream-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>External source</span>
          </button>
        </div>

        {/* Introduction Card */}
        <div className={`rounded-2xl border bg-white p-5 dark:bg-brown-900 ${
          mode === 'curated'
            ? 'border-cream-200 dark:border-cream-800'
            : 'border-teal-200 dark:border-teal-800'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-xl ${mode === 'curated' ? 'bg-cream-100 dark:bg-brown-700' : 'bg-teal-100 dark:bg-teal-900/30'}`}>
              {mode === 'curated' ? (
                <BookOpen className="w-6 h-6 text-brown-700 dark:text-brown-100" aria-hidden="true" />
              ) : (
                <LockKeyhole className="w-6 h-6 text-teal-700 dark:text-teal-300" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-brown-800 dark:text-cream-100 mb-1">
                {mode === 'curated' ? 'Learn by Reading' : 'Stories from Lengguahi-ta'}
              </h2>
              <p className="text-sm text-brown-600 dark:text-brown-100">
                {mode === 'curated' ? (
                  <>
                    Read Chamorro stories and <span className="font-semibold text-brown-700 dark:text-brown-100">tap any word</span> to see its translation.
                    After each story, test your understanding with comprehension questions!
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">Lengguahi-ta</span> is an independent Chamorro learning resource.

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
                <div className="px-1">
                  <h3 className="font-bold text-brown-800 dark:text-cream-100">
                    {category.title}
                  </h3>
                  <p className="text-sm text-brown-600 dark:text-brown-100">
                    {category.description}
                  </p>
                </div>

                {/* Story Rows */}
                <ul className={storyListClass}>
                  {category.stories.map((story) => (
                    <li key={story.id} className="border-t border-cream-200 first:border-t-0 dark:border-brown-700">
                      <Link
                        to={`/stories/${story.id}`}
                        className={`group ${storyRowClass} hover:bg-cream-50 dark:hover:bg-brown-700 focus-visible:ring-coral-500`}
                      >
                        <span className="block min-w-0 break-words font-bold text-brown-800 dark:text-cream-100">
                          <span className="font-chamorro">{story.title}</span>
                          <span className="ml-2 text-sm font-normal italic text-brown-600 dark:text-brown-100">{story.titleEnglish}</span>
                        </span>
                        <span className="mt-0.5 block text-sm text-brown-600 line-clamp-2 dark:text-brown-100">
                          {story.description}
                        </span>
                        <span className={storyMetaClass}>
                          {[story.difficulty, `${story.readingTime} min`, `${story.wordCount} words`, `${story.questions.length} questions`].join(' · ')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
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
                <span className="ml-3 text-brown-600 dark:text-brown-300">Loading stories...</span>
              </div>
            ) : externalAvailability?.enabled && Object.keys(byCategory).length > 0 ? (
              Object.entries(byCategory).map(([category, stories]) => (
                <div key={category} className="space-y-3">
                  {/* Category Header */}
                  <div className="px-1">
                    <h3 className="font-bold text-brown-800 dark:text-cream-100">
                      {CATEGORY_LABELS[category] || category}
                    </h3>
                    <p className="text-sm text-brown-600 dark:text-brown-100">
                      {(stories as AvailableStory[]).length} stories
                    </p>
                  </div>

                  {/* Story Rows */}
                  <ul className={storyListClass}>
                    {(stories as AvailableStory[]).map((story) => (
                      <li key={story.id} className="border-t border-cream-200 first:border-t-0 dark:border-brown-700">
                        <Link
                          to={`/stories/lengguahita/${story.id}`}
                          className={`group ${storyRowClass} hover:bg-teal-50/50 dark:hover:bg-teal-950/20 focus-visible:ring-teal-500`}
                        >
                          <span className="block min-w-0 break-words font-bold text-brown-800 dark:text-cream-100">
                            {story.title}
                            {story.titleChamorro && (
                              <span className="ml-2 font-chamorro text-sm font-normal italic text-brown-600 dark:text-brown-100">{story.titleChamorro}</span>
                            )}
                          </span>
                          {story.author && (
                            <span className="mt-0.5 block text-sm text-brown-600 dark:text-brown-100">by {story.author}</span>
                          )}
                          <span className={storyMetaClass}>
                            {[story.difficulty, `${story.paragraphCount} paragraphs`, story.sourceName].join(' · ')}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-brown-900 rounded-2xl border border-teal-200 dark:border-teal-800 p-6 text-center">
                <LockKeyhole className="w-8 h-8 mx-auto mb-3 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                <h3 className="font-semibold text-brown-800 dark:text-cream-100 mb-2">Original stories are available on Lengguahi-ta</h3>
                <p className="text-sm text-brown-600 dark:text-brown-300 max-w-xl mx-auto mb-4">
                  {externalAvailability?.message || 'Copied story content is unavailable while HåfaGPT confirms reuse permission and attribution.'}
                </p>
                <a
                  href={externalAvailability?.sourceUrl || 'https://lengguahita.com/resources/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pressable inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 rounded-full bg-teal-700 text-white font-medium hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 transition-colors"
                >
                  Visit Lengguahi-ta
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            )}
          </>
        )}

        {/* Info Card */}
        {mode === 'curated' && <div className="rounded-2xl border border-cream-200 bg-white p-5 dark:border-brown-700 dark:bg-brown-900">
          <div className="flex items-center gap-3 mb-2">
            {mode === 'curated' ? (
              <Sparkles className="w-5 h-5 text-brown-700 dark:text-brown-100" aria-hidden="true" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            )}
            <h3 className="font-semibold text-brown-800 dark:text-cream-100">
              {mode === 'curated' ? 'More Stories Coming!' : 'About Lengguahi-ta Stories'}
            </h3>
          </div>
          <p className="text-sm text-brown-600 dark:text-brown-300">
            {mode === 'curated' ? (
              'We\'re adding more Chamorro legends, cultural stories, and beginner-friendly tales. Check back soon for new content!'
            ) : (
              <>
                HåfaGPT currently links to <a href="https://lengguahita.com/resources/" target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline">Lengguahi-ta</a> instead of reproducing its stories. Full-text access can return after written permission and attribution review are recorded.
              </>
            )}
          </p>
        </div>}
      </main>
    </LearnerPageShell>
  );
}
