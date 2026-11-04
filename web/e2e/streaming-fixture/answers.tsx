import { createRoot } from 'react-dom/client';
import { Message } from '../../src/components/Message';
import '../../src/index.css';

// Signed-in answer states with synthetic English content: no accounts, model calls or production data.
if (new URLSearchParams(location.search).get('theme') === 'dark') document.documentElement.classList.add('dark');
window.fetch = async () => Response.json({});
const now = Date.now() - 60_000;
const chung = { name: 'Chamorro Grammar by Sandra Chung', page: null };
const answer = [
  'A greeting changes with the time of day, and most families also use a general greeting at any hour.',
  'When you write a reply for a school notice, keep it short and friendly, then add the details the teacher asked for. The tutor can check individual words against the dictionary, but have a fluent speaker review anything official before you send it.',
  '- Use the general greeting when you are unsure.\n- Add the person’s name after the greeting.\n- Close with thanks.',
].join('\n\n');

function AnswersFixture() {
  return <main style={{ minHeight: '100dvh' }} className="bg-cream-100 px-4 py-5 dark:bg-brown-950">
    <div className="mx-auto w-full max-w-4xl">
      <Message role="user" content="How do I greet my child’s teacher in a note?" timestamp={now} />
      <Message role="assistant" content={answer} timestamp={now} sources={[
        { name: 'Revised dictionary', source_id: 'local_revised_dictionary_snapshot', page: 12, content_role: 'reviewed_lexicon', locator: 'entry 1' },
        { name: 'Revised dictionary', source_id: 'local_revised_dictionary_snapshot', page: 40, content_role: 'reviewed_lexicon', locator: 'entry 2' },
        { name: 'Chamoru.info', source_id: 'chamoru_info_dictionary', page: null, content_role: 'lexical_reference' },
      ]} />
      <Message role="user" content="Why do some words change at the start?" timestamp={now} />
      <Message role="assistant" content="Some words change their first sound after certain small words. The grammar reference describes the pattern in detail." timestamp={now} sources={[chung, chung, chung, chung]} />
      <Message role="user" content="Can you write the whole reply for me?" timestamp={now} />
      <Message role="assistant" content="Here is a short draft you can adapt. Check the wording with a fluent speaker before sending it to school." timestamp={now} />
      <Message role="user" content="And one more question" timestamp={now} />
      <Message role="assistant" content="" isStreaming statusText="Checking the dictionary…" />
    </div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<AnswersFixture />);
