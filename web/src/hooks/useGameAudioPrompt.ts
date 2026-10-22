import { useCallback, useRef, useState } from 'react';
import { useSpeech } from './useSpeech';

/** Deliberate listening, or explicit reading help, before an audio-first answer. */
export function useGameAudioPrompt() {
  const speech = useSpeech();
  const [listened, setListened] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const resetPrompt = useCallback(() => {
    generation.current += 1;
    setListened(false);
    setAssisted(false);
    setLoading(false);
  }, []);
  const listen = async (text: string) => {
    const started = ++generation.current;
    setLoading(true);
    setListened(false);
    try {
      await speech.speak(text);
      if (started === generation.current) setListened(true);
    } finally {
      if (started === generation.current) setLoading(false);
    }
  };
  return {
    ...speech, listen, resetPrompt, loading,
    canAnswer: assisted || (listened && !speech.speechError && !speech.isSpeaking && !loading),
    assisted,
    useReadingHelp: () => setAssisted(true),
  };
}
