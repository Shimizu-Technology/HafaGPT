import { Loader2, Square, Volume2 } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';

interface PronunciationButtonProps {
  text: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export function PronunciationButton({
  text,
  label = 'Listen',
  showLabel = false,
  className = '',
}: PronunciationButtonProps) {
  const { speak, stop, isSpeaking, isPreloading, playbackSource, speechError } = useSpeech();
  const isBusy = isSpeaking || isPreloading;

  return (
    <div className="inline-flex min-w-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => isSpeaking ? stop() : void speak(text)}
        disabled={!text.trim()}
        aria-label={isSpeaking ? `Stop pronunciation for ${text}` : `${label}: ${text}`}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-teal-300 dark:hover:bg-teal-900/40 ${className}`}
      >
        {isPreloading ? (
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : isSpeaking ? (
          <Square className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Volume2 className="h-5 w-5" aria-hidden="true" />
        )}
        {showLabel && <span>{isSpeaking ? 'Stop' : isBusy ? 'Loading' : label}</span>}
      </button>
      <span className="max-w-48 text-right text-[11px] leading-tight text-brown-500 dark:text-gray-400" aria-live="polite">
        {playbackSource === 'device' && isSpeaking ? 'Device voice approximation' : speechError ?? ''}
      </span>
    </div>
  );
}
