import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { conversationScenarios, ConversationScenario } from '../data/conversationScenarios';

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

const difficultyLabels = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced'
};

function ScenarioCard({ scenario }: { scenario: ConversationScenario }) {
  return (
    <Link
      to={`/practice/${scenario.id}`}
      className="block bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-coral-300 dark:hover:border-coral-500 group"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform">
          {scenario.icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
              {scenario.title}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[scenario.difficulty]}`}>
              {difficultyLabels[scenario.difficulty]}
            </span>
          </div>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-2">
            {scenario.titleChamorro}
          </p>
          
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            {scenario.description}
          </p>
          
          {/* Character info */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
              🗣️ {scenario.characterName}
            </span>
            <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
              ~{scenario.estimatedTurns} turns
            </span>
          </div>
        </div>
        
        {/* Arrow */}
        <div className="text-slate-400 group-hover:text-coral-500 transition-colors flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export function ConversationList() {
  const { isSignedIn } = useUser();
  
  const beginnerScenarios = conversationScenarios.filter(s => s.difficulty === 'beginner');
  const intermediateScenarios = conversationScenarios.filter(s => s.difficulty === 'intermediate');
  const advancedScenarios = conversationScenarios.filter(s => s.difficulty === 'advanced');

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-2xl mx-auto pt-20 text-center">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Conversation Practice
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Sign in to practice real Chamorro conversations with AI characters
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                💬 Conversation Practice
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Practice real Chamorro conversations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-coral-50 to-ocean-50 dark:from-coral-900/20 dark:to-ocean-900/20 rounded-xl p-5 border border-coral-200 dark:border-coral-800">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-2">
            🎭 How It Works
          </h2>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <li>• Choose a scenario and practice with an AI character</li>
            <li>• Type your responses in Chamorro (hints available!)</li>
            <li>• Get gentle feedback on your spelling and grammar</li>
            <li>• Complete objectives to finish the conversation</li>
          </ul>
        </div>

        {/* Beginner Section */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Beginner
          </h2>
          <div className="space-y-3">
            {beginnerScenarios.map(scenario => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        </section>

        {/* Intermediate Section */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            Intermediate
          </h2>
          <div className="space-y-3">
            {intermediateScenarios.map(scenario => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        </section>

        {/* Advanced Section */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Advanced
          </h2>
          <div className="space-y-3">
            {advancedScenarios.map(scenario => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        </section>

        {/* Bottom padding */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}

