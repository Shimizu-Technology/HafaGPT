import { Clock3, Library, Lightbulb, Map as MapIcon, Trophy } from 'lucide-react';
import { LearningPathMap } from './LearningPathMap';
import { LearningProgressStats } from './LearningProgressStats';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

export function LearningPathPage() {
  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title="Learning path"
        subtitle="Build skills one short topic at a time"
        icon={MapIcon}
      />

      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
        <section className="mb-5 rounded-2xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:mb-7 sm:p-6" aria-labelledby="beginner-path-heading">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-coral-100 text-coral-700 dark:bg-ocean-950 dark:text-ocean-300">
              <Trophy className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-coral-700 dark:text-ocean-300">Beginner</p>
              <h2 id="beginner-path-heading" className="mt-0.5 text-xl font-bold text-brown-950 dark:text-white sm:text-2xl">Build your Chamorro foundation</h2>
              <p className="mt-1 max-w-2xl text-sm text-brown-600 dark:text-gray-300">Seven focused topics introduce the words and patterns you will use most often.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-brown-600 dark:text-gray-300">
                <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-cream-100 px-3 dark:bg-slate-700">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> About 35 minutes
                </span>
                <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-cream-100 px-3 dark:bg-slate-700">
                  <Library className="h-3.5 w-3.5" aria-hidden="true" /> 7 topics
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile: Stats first, then path map */}
        <div className="md:hidden space-y-4 mb-4">
          <LearningProgressStats />
        </div>

        {/* Desktop: Two-column layout */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {/* Learning Path Map - takes 2/3 on desktop, full width on mobile */}
          <div className="md:col-span-2">
            <LearningPathMap />
          </div>

          {/* Desktop only: Progress Stats sidebar */}
          <div className="hidden md:block md:col-span-1">
            <LearningProgressStats />
            
            {/* Tips Section - Desktop only */}
            <div className="mt-6 rounded-2xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-brown-900 dark:text-white">
                <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-300" aria-hidden="true" /> Learning tips
              </h3>
              <ul className="space-y-2 text-sm text-brown-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-coral-500 dark:text-ocean-400 mt-0.5">•</span>
                  <span>Complete flashcards before taking the quiz</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral-500 dark:text-ocean-400 mt-0.5">•</span>
                  <span>Score 90%+ on quizzes to earn 3 stars</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral-500 dark:text-ocean-400 mt-0.5">•</span>
                  <span>Review completed topics to improve your score</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral-500 dark:text-ocean-400 mt-0.5">•</span>
                  <span>Practice regularly to build a steady habit</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </LearnerPageShell>
  );
}
