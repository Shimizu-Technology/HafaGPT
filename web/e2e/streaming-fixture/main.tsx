import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Message } from '../../src/components/Message';
import { useChatAutoScroll } from '../../src/hooks/useChatAutoScroll';
import { useChatbot, type ChatMessage } from '../../src/hooks/useChatbot';
import '../../src/index.css';

// Synthetic SSE only: no model calls, authentication, account data, or production writes.
let chunkDelay = 150;
window.fetch = async (input, options) => {
  if (!String(input).endsWith('/api/chat/stream')) return new Response('{}', { status: 200 });
  const encoder = new TextEncoder();
  const chunks = Array.from({ length: 3 }, (_, page) => [
    `\n\n## Page ${page + 1}\n\nRead this page while the remaining answer arrives.\n\n| Item | Source | Translation |\n| --- | --- | --- |\n`,
    ...Array.from({ length: 24 }, (_, row) => `| ${row + 1} | Synthetic worksheet line | Complete translation for item ${row + 1} |\n`),
  ]).flat();
  let timer: ReturnType<typeof setTimeout>;
  const body = new ReadableStream({
    start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      const abort = () => { clearTimeout(timer); controller.error(new DOMException('Cancelled', 'AbortError')); };
      options?.signal?.addEventListener('abort', abort, { once: true });
      let index = 0;
      const tick = () => {
        if (index < chunks.length) {
          send({ type: 'chunk', content: chunks[index++] });
          timer = setTimeout(tick, chunkDelay);
        } else {
          send({ type: 'metadata', sources: [], used_rag: false, used_web_search: false });
          send({ type: 'done', response_time: 12 });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          options?.signal?.removeEventListener('abort', abort);
          controller.close();
        }
      };
      timer = setTimeout(tick, chunkDelay);
    },
    cancel() { clearTimeout(timer); },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
};

export function StreamingFixture() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [delay, setDelay] = useState(chunkDelay);
  const ref = useRef<HTMLDivElement>(null);
  const { sendMessageStream, cancelMessage, loading } = useChatbot();
  const { showScrollButton, resumeFollowing, resetScrollTracking } = useChatAutoScroll(ref, messages);
  const send = async () => {
    resetScrollTracking();
    const key = crypto.randomUUID();
    setMessages(previous => [...previous,
      { role: 'user', content: 'Please translate all three synthetic pages.', renderKey: `${key}-user` },
      { role: 'assistant', content: '', renderKey: key, isStreaming: true },
    ]);
    const update = (patch: Partial<ChatMessage>) => setMessages(previous => previous.map(message => message.renderKey === key ? { ...message, ...patch } : message));
    try {
      await sendMessageStream('Synthetic worksheet', 'english', null, {
        onChunk: (_chunk, content) => update({ content }),
        onMetadata: metadata => update(metadata),
        onDone: response_time => update({ isStreaming: false, response_time }),
        onError: content => update({ isStreaming: false, content }),
        onCancelled: () => update({ isStreaming: false, content: 'Message cancelled' }),
      });
    } catch { /* Cancellation is displayed in the conversation. */ }
  };
  return <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#fff8f0' }}>
    <header style={{ padding: '12px 16px', borderBottom: '1px solid #ddd' }}>
      <strong>Streaming regression fixture</strong><span role="status"> — {loading ? 'Streaming' : 'Ready'}</span>
    </header>
    <div ref={ref} data-testid="chat-messages" tabIndex={0} style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '16px 16px 140px' }}>
      <div style={{ maxWidth: 850, margin: 'auto' }}>
        {messages.map(message => <Message key={message.renderKey} {...message} />)}
      </div>
    </div>
    <footer style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 12, background: 'white' }}>
      <button onClick={() => void send()} disabled={loading}>Send worksheet</button>
      <button disabled={loading} onClick={() => { setMessages([]); resetScrollTracking(); }}>New chat</button>
      <button disabled={loading} onClick={() => {
        setMessages([
          { role: 'user', content: 'An earlier homework question', renderKey: 'history-user' },
          { role: 'assistant', content: Array.from({ length: 12 }, (_, index) => `History paragraph ${index + 1}. Read this earlier explanation while the next answer streams.`).join('\n\n'), renderKey: 'history-answer' },
        ]);
        resetScrollTracking();
      }}>Load history</button>
      <button onClick={() => void cancelMessage()} disabled={!loading}>Cancel response</button>
      {showScrollButton && <button onClick={resumeFollowing}>Scroll to bottom</button>}
      <label>Chunk delay <input aria-label="Chunk delay" type="number" value={delay} min={10} onChange={event => { setDelay(Number(event.target.value)); chunkDelay = Number(event.target.value); }} style={{ width: 65 }} /></label>
      <textarea aria-label="Composer" placeholder="Focus to open the keyboard" rows={1} />
    </footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<StreamingFixture />);
