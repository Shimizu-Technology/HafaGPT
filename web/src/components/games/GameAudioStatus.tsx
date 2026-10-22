interface GameAudioStatusProps {
  audio: {
    speechError?: string | null;
    isSpeaking: boolean;
    loading: boolean;
    canAnswer: boolean;
    assisted: boolean;
    useReadingHelp: () => void;
  };
  onRetry: () => void;
}

export function GameAudioStatus({ audio, onRetry }: GameAudioStatusProps) {
  return (
    <div className="mb-4 rounded-xl border border-cream-300 bg-cream-50 p-4 text-brown-800 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200">
      {audio.speechError ? (
        <div role="alert">
          <p>We couldn’t play the prompt. Try again, or ask a grown-up to read it with you. Your round is waiting.</p>
          <button type="button" onClick={onRetry} disabled={audio.loading || audio.isSpeaking} className="mt-2 min-h-11 rounded-lg border border-brown-400 px-4 font-semibold dark:border-slate-500">Retry audio</button>
        </div>
      ) : (
        <p role="status">{audio.loading ? 'Getting the prompt ready…' : audio.isSpeaking ? 'Listen to the prompt…' : audio.canAnswer ? 'Ready? Choose your answer.' : 'Tap the speaker to hear the prompt, then choose your answer.'}</p>
      )}
      {audio.assisted && <p role="status" className="mt-2">A grown-up helped. Choose your answer.</p>}
      {!audio.assisted && <button type="button" onClick={audio.useReadingHelp} className="mt-2 min-h-11 rounded-lg border border-brown-400 px-3 text-left font-semibold dark:border-slate-500">A grown-up read it to me</button>}
    </div>
  );
}
