import { ArrowRight, Lightbulb, Volume2 } from 'lucide-react';
import { LearningTopic } from '../data/learningPath';
import { useSpeech } from '../hooks/useSpeech';

interface LessonIntroProps {
  topic: LearningTopic;
  onComplete: () => void;
}

export function LessonIntro({ topic, onComplete }: LessonIntroProps) {
  const { speak, isSpeaking } = useSpeech();

  const handleSpeak = (text: string) => {
    // Extract just the Chamorro word (before the —)
    const chamorroWord = text.split('—')[0].trim();
    speak(chamorroWord);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Welcome card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-cream-200/50 dark:border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 dark:from-ocean-400 dark:to-ocean-600 flex items-center justify-center text-3xl shadow-lg">
            {topic.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-brown-800 dark:text-white">
              {topic.title}
            </h2>
            <p className="text-sm text-brown-600 dark:text-gray-400">
              ~{topic.estimatedMinutes} min lesson
            </p>
          </div>
        </div>
        
        <p className="text-brown-700 dark:text-gray-300 leading-relaxed">
          {topic.description}
        </p>
      </div>

      {/* Cultural context */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-amber-200/50 dark:border-amber-700/30">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🌺</span>
          </div>
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
              Cultural Context
            </h3>
            <p className="text-amber-800 dark:text-amber-100/80 text-sm leading-relaxed">
              {topic.intro.culturalContext}
            </p>
          </div>
        </div>
      </div>

      {/* Key phrases preview */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-cream-200/50 dark:border-slate-700/50">
        <h3 className="font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-lg">📚</span>
          Key Phrases You'll Learn
        </h3>
        
        <div className="space-y-3">
          {topic.intro.keyPhrases.map((phrase, index) => {
            const [chamorro, english] = phrase.split('—').map(s => s.trim());
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-cream-50 dark:bg-slate-700/50 rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-coral-700 dark:text-ocean-300">
                    {chamorro}
                  </p>
                  <p className="text-sm text-brown-600 dark:text-gray-400">
                    {english}
                  </p>
                </div>
                <button
                  onClick={() => handleSpeak(phrase)}
                  disabled={isSpeaking}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-coral-100 dark:bg-ocean-900/40 text-coral-600 dark:text-ocean-400 
                           hover:bg-coral-200 dark:hover:bg-ocean-800/40 transition-colors disabled:opacity-50"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tip */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-2xl p-5 border border-teal-200/50 dark:border-teal-700/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="font-semibold text-teal-900 dark:text-teal-200 mb-1">
              Pro Tip
            </h3>
            <p className="text-teal-800 dark:text-teal-100/80 text-sm leading-relaxed">
              {topic.intro.tip}
            </p>
          </div>
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={onComplete}
        className="w-full py-4 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 
                   text-white font-semibold rounded-2xl shadow-lg
                   hover:from-coral-600 hover:to-coral-700 dark:hover:from-ocean-600 dark:hover:to-ocean-700
                   transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        Start Flashcards
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

