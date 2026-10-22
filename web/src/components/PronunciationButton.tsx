import { useRef, useState } from 'react';
import { Loader2, Square, Volume2 } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';

interface PronunciationButtonProps {
  text: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export function PronunciationButton(props: PronunciationButtonProps) {
  return <PronunciationPlayback key={props.text} {...props} />;
}

function PronunciationPlayback({
  text,
  label = 'Listen',
  showLabel = false,
  className = '',
}: PronunciationButtonProps) {
  const { speak, stop, isSpeaking, isPreloading, playbackSource, speechError } = useSpeech();
  const [requesting, setRequesting] = useState(false);
  const isBusy = requesting || isSpeaking || isPreloading;
  const requestId = useRef(0);
  const handleListen = async () => {
    if (isSpeaking || requesting) { requestId.current += 1; stop(); setRequesting(false); return; }
    const id = ++requestId.current;
    setRequesting(true);
    try { await speak(text); } finally { if (id === requestId.current) setRequesting(false); }
  };

  return (
    <div className="inline-flex min-w-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleListen()}
        aria-busy={isBusy}
        disabled={!text.trim()}
        aria-label={isBusy ? `Stop pronunciation for ${text}` : `${label}: ${text}`}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-teal-300 dark:hover:bg-teal-900/40 ${className}`}
      >
        {(requesting || isPreloading) && !isSpeaking ? (
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : isSpeaking ? (
          <Square className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Volume2 className="h-5 w-5" aria-hidden="true" />
        )}
        {showLabel && <span>{isSpeaking ? 'Stop' : isBusy ? 'Stop loading' : label}</span>}
      </button>
      <span className="max-w-64 break-words text-right text-xs leading-snug text-brown-600 dark:text-gray-400" aria-live="polite">
        {speechError ? `${speechError} Ask a grown-up to read this with you.` : playbackSource === 'device' ? 'Device voice approximation' : playbackSource === 'reviewed' ? 'Reviewed speaker audio' : playbackSource === 'generated' ? 'AI-generated audio · pronunciation may vary' : ''}
      </span>
    </div>
  );
}
