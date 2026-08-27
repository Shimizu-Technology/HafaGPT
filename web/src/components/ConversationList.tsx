import { ArrowRight, Check, Clock3, MessageCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { conversationScenarios, type ConversationScenario } from '../data/conversationScenarios';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { ContentTrustNote } from './ContentTrustNote';
import { CONVERSATION_CONTENT_TRUST } from '../data/contentTrust';

const difficultyStyles = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  intermediate: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  advanced: 'bg-coral-100 text-coral-800 dark:bg-coral-950 dark:text-coral-300',
};

const difficultyLabels = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

function ScenarioCard({ scenario }: { scenario: ConversationScenario }) {
  return (
    <Link
      to={`/practice/${scenario.id}`}
      className="group flex min-h-36 items-start gap-4 rounded-2xl border border-cream-200 bg-white p-5 transition-colors hover:border-coral-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-ocean-600"
    >
      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-coral-100 text-2xl dark:bg-ocean-950" aria-hidden="true">
        {scenario.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold text-brown-950 dark:text-white">{scenario.title}</span>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${difficultyStyles[scenario.difficulty]}`}>
            {difficultyLabels[scenario.difficulty]}
          </span>
        </span>
        <span className="mt-0.5 block text-sm font-medium text-coral-700 dark:text-ocean-300">{scenario.titleChamorro}</span>
        <span className="mt-2 block text-sm text-brown-600 dark:text-gray-300">{scenario.description}</span>
        <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-brown-500 dark:text-gray-400">
          <span>Talk with {scenario.characterName}</span>
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />About {scenario.estimatedTurns} turns</span>
        </span>
      </span>

      <ArrowRight className="mt-1 h-5 w-5 flex-none text-brown-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

function ScenarioSection({ title, description, scenarios }: { title: string; description: string; scenarios: ConversationScenario[] }) {
  if (!scenarios.length) return null;
  const headingId = `scenario-${title.toLowerCase()}`;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-3">
        <h3 id={headingId} className="text-lg font-bold text-brown-950 dark:text-white">{title}</h3>
        <p className="text-sm text-brown-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {scenarios.map((scenario) => <ScenarioCard key={scenario.id} scenario={scenario} />)}
      </div>
    </section>
  );
}

export function ConversationList() {
  const beginnerScenarios = conversationScenarios.filter((scenario) => scenario.difficulty === 'beginner');
  const intermediateScenarios = conversationScenarios.filter((scenario) => scenario.difficulty === 'intermediate');
  const advancedScenarios = conversationScenarios.filter((scenario) => scenario.difficulty === 'advanced');

  return (
    <LearnerPageShell>
      <LearnerPageHeader title="Conversation practice" subtitle="Use Chamorro in guided, everyday situations" icon={MessageCircle} />

      <main className="mx-auto max-w-5xl space-y-9 px-4 py-6 sm:py-8">
        <div className="max-w-2xl">
          <p className="mb-1 text-sm font-bold text-coral-700 dark:text-coral-300">Speak with confidence</p>
          <h2 className="text-2xl font-bold tracking-tight text-brown-950 dark:text-white sm:text-3xl">Practice a real-life moment</h2>
          <p className="mt-2 text-brown-600 dark:text-gray-300">Pick a scene, respond in Chamorro, and use a hint whenever you need one.</p>
        </div>

        <section aria-labelledby="how-practice-works" className="rounded-2xl border border-coral-200 bg-coral-50 p-5 dark:border-ocean-800 dark:bg-ocean-950/40">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white text-coral-700 dark:bg-slate-800 dark:text-ocean-300"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h3 id="how-practice-works" className="font-bold text-brown-950 dark:text-white">A safe place to try</h3>
              <div className="mt-3 grid gap-2 text-sm text-brown-700 dark:text-gray-300 sm:grid-cols-3">
                <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-coral-700 dark:text-ocean-300" aria-hidden="true" />Follow one clear goal.</p>
                <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-coral-700 dark:text-ocean-300" aria-hidden="true" />Open hints when needed.</p>
                <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-coral-700 dark:text-ocean-300" aria-hidden="true" />Get gentle AI suggestions.</p>
              </div>
            </div>
          </div>
        </section>

        <ContentTrustNote trust={CONVERSATION_CONTENT_TRUST} />

        <ScenarioSection title="Beginner" description="Start with greetings, introductions, and familiar exchanges." scenarios={beginnerScenarios} />
        <ScenarioSection title="Intermediate" description="Handle longer exchanges with less guidance." scenarios={intermediateScenarios} />
        <ScenarioSection title="Advanced" description="Practice more detailed and open-ended situations." scenarios={advancedScenarios} />
      </main>
    </LearnerPageShell>
  );
}
