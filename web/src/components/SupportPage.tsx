import { ArrowRight, BookOpen, ExternalLink, HelpCircle, Mail, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicPage } from './PublicPage';

const faqs = [
  {
    question: 'Is HåfaGPT free to use?',
    answer: 'A free plan is available. Visit the plans page for the current limits and options; those details may change as the service and its operating costs evolve.',
  },
  {
    question: 'How accurate is the AI tutor?',
    answer: 'HåfaGPT retrieves from governed Chamorro references and shows citations when sources are available, but AI can still misunderstand a phrase or make a mistake. Check important school, cultural, medical, legal, or official information with the cited source or a knowledgeable speaker.',
  },
  {
    question: 'Can I use HåfaGPT offline?',
    answer: 'Some pages and assets may remain available after you load them, but AI chat, account syncing, and any content that has not already loaded require an internet connection.',
  },
  {
    question: 'How do I request account deletion?',
    answer: 'Email support@shimizutechnology.com from the address connected to your account. We will confirm the request and explain the next steps.',
  },
];

const resourceLinkClass = 'flex min-h-14 items-center justify-between gap-3 rounded-xl border border-cream-200 px-4 py-3 font-semibold text-brown-700 hover:border-coral-300 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-700 dark:text-gray-200 dark:hover:border-teal-700 dark:hover:bg-slate-700/50';

export default function SupportPage() {
  return (
    <PublicPage title="Support" subtitle="Answers, account help, and a direct way to reach us" icon={HelpCircle}>
      <section className="rounded-3xl border border-coral-200 bg-coral-50 p-6 dark:border-teal-900 dark:bg-teal-950/20 sm:p-8">
        <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">A real person will read your message</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-brown-950 dark:text-white">How can we help?</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-brown-600 dark:text-gray-300">
          Ask about a school message, report something that did not work, suggest a feature, or request help with your account.
        </p>
        <a href="mailto:support@shimizutechnology.com" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-coral-600 px-5 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-700">
          <Mail className="h-5 w-5" aria-hidden="true" />
          Email support
        </a>
        <p className="mt-3 break-all text-sm text-brown-500 dark:text-gray-400">support@shimizutechnology.com</p>
      </section>

      <section className="mt-6 rounded-3xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-100 text-coral-700 dark:bg-slate-700 dark:text-teal-300">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">Quick answers</p>
            <h2 className="text-xl font-bold text-brown-950 dark:text-white">Frequently asked questions</h2>
          </div>
        </div>
        <div className="mt-5 divide-y divide-cream-200 border-y border-cream-200 dark:divide-slate-700 dark:border-slate-700">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-brown-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-white [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span className="text-xl font-normal text-coral-600 transition-transform group-open:rotate-45 dark:text-teal-300" aria-hidden="true">+</span>
              </summary>
              <p className="pb-4 pr-8 text-sm leading-relaxed text-brown-600 dark:text-gray-300">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-7">
        <div className="mb-4 flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-coral-600 dark:text-teal-300" aria-hidden="true" />
          <h2 className="text-xl font-bold text-brown-950 dark:text-white">Helpful links</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/about" className={resourceLinkClass}>About HåfaGPT <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <Link to="/privacy" className={resourceLinkClass}>Privacy policy <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <Link to="/pricing" className={resourceLinkClass}>Plans and limits <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <a href="https://shimizutechnology.com" target="_blank" rel="noopener noreferrer" className={resourceLinkClass}>
            Shimizu Technology <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>
    </PublicPage>
  );
}
