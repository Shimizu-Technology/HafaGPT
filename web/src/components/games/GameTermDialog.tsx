import { useEffect, useRef } from 'react';
import { useSpeech } from '../../hooks/useSpeech';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

export function GameTermDialog({ term, onClose }: { term: { content: string; speak?: string } | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { speak, stop, isSpeaking, speechError } = useSpeech();
  useEffect(() => { if (!term) stop(); }, [term, stop]);
  useModalAccessibility({ isOpen: !!term, onClose, dialogRef });
  if (!term) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="card-term-title" className="max-h-[85dvh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 text-brown-950 dark:bg-slate-800 dark:text-white">
      <h2 id="card-term-title" className="text-xl font-bold">Read the full card</h2>
      <p className="my-5 break-words text-lg">{term.content}</p>
      {term.speak ? <button type="button" disabled={isSpeaking} onClick={() => { void speak(term.speak!); }} className="min-h-12 rounded-xl border border-brown-400 px-4 font-semibold dark:border-slate-500">{isSpeaking ? 'Playing…' : speechError ? 'Retry audio' : 'Hear it'}</button> : <p>Ask a grown-up to read this with you.</p>}
      {speechError && <p role="alert" className="mt-3">Audio couldn’t play. Try again, or ask a grown-up to read it with you.</p>}
      <button type="button" onClick={onClose} className="ml-3 min-h-12 rounded-xl bg-coral-700 px-4 font-semibold text-white dark:bg-teal-700">Keep playing</button>
    </div>
  </div>;
}
