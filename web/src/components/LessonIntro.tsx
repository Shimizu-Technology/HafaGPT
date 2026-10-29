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
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200/50 dark:border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-coral-400 dark:bg-ocean-400 flex items-center justify-center text-3xl">
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
      <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-6 border border-teal-200/50 dark:border-teal-700/30">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="h-4 w-4 text-teal-700 dark:text-teal-300" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-teal-900 dark:text-teal-200 mb-1">
              Cultural Context
            </h3>
            <p className="text-teal-800 dark:text-teal-100/80 text-sm leading-relaxed">
              {topic.intro.culturalContext}
            </p>
          </div>
        </div>
      </div>

      {/* Key phrases preview */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200/50 dark:border-slate-700/50">
        <h3 className="font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
          Key phrases you'll learn
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
                  <p className="font-chamorro text-lg font-semibold text-coral-700 dark:text-ocean-300">
                    {chamorro}
                  </p>
                  <p className="text-sm text-brown-600 dark:text-gray-400">
                    {english}
                  </p>
                </div>
                <button
                  onClick={() => handleSpeak(phrase)}
                  aria-label={`Play pronunciation for ${chamorro}`}
                  disabled={isSpeaking}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-coral-100 dark:bg-ocean-900/40 text-coral-700 dark:text-ocean-400
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
      <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-5 border border-teal-200/50 dark:border-teal-700/30">
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
        className="w-full py-4 bg-coral-700 dark:bg-teal-700
                   text-white font-semibold rounded-2xl
                   hover:bg-coral-800 dark:hover:bg-teal-800
                   transition-colors flex items-center justify-center gap-2"
      >
        Start Flashcards
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

