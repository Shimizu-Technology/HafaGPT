import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  Brain,
  Gamepad2,
  Heart,
  Languages,
  Layers3,
  Lightbulb,
  MessageCircle,
  Mic2,
  Rocket,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicPage } from './PublicPage';
import { TRUST_LABELS, type ContentTrustLevel } from '../data/contentTrust';

const capabilities: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'AI chat', icon: MessageCircle },
  { label: 'Flashcards', icon: Layers3 },
  { label: 'Quizzes', icon: Brain },
  { label: 'Games', icon: Gamepad2 },
  { label: 'Stories', icon: BookOpen },
  { label: 'Practice', icon: Mic2 },
  { label: 'Dictionary', icon: Languages },
  { label: 'Progress', icon: BarChart3 },
];

const trustLevelClasses: Record<ContentTrustLevel, string> = {
  current_source: 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30',
  source_backed: 'border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30',
  developing: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
  ai_practice: 'border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30',
};

/** Render one consistently styled section of the public product story. */
function StorySection({
  title,
  icon: Icon,
  iconClassName,
  children,
}: {
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-7">
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${iconClassName}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold text-brown-950 dark:text-white">{title}</h2>
      </div>
      <div className="space-y-4 leading-relaxed text-brown-700 dark:text-gray-300">{children}</div>
    </section>
  );
}

/** Explain why HåfaGPT exists, how it works, and how content trust is labeled. */
export function AboutPage() {
  return (
    <PublicPage title="Our story" subtitle="Why HåfaGPT exists and who it is for" icon={Heart} maxWidthClassName="max-w-4xl">
      <section className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_18rem] sm:gap-9">
        <div>
          <p className="text-sm font-semibold text-coral-700 dark:text-teal-300">Built on Guam, for learning together</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-brown-950 dark:text-white sm:text-4xl">Why I built HåfaGPT</h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-brown-600 dark:text-gray-300">
            A family project that grew into a practical place to ask, translate, listen, practice, and learn Chamorro.
          </p>
          <Link to="/chat" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-700">
            Ask HåfaGPT
          </Link>
        </div>
        <img src="/stassie-kami-leon-japan.JPG" alt="Leon, Kami, and Stassie together in Japan" className="aspect-[4/3] w-full rounded-3xl border border-cream-200 object-cover dark:border-slate-700 sm:aspect-[4/5]" />
      </section>

      <div className="mt-8 space-y-5">
        <StorySection title="The problem" icon={Heart} iconClassName="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <p>I was born and raised in Guam, but I never really learned Chamorro. Like many Chamorros my age, I grew up speaking English at home, and the language slowly faded into the background.</p>
          <p>That changed when my daughter <strong>Stassie</strong>—whose Chamorro name is <strong>Tasi</strong>—started at <strong>Hurao Academy</strong>, a Chamorro immersion school. Homework, announcements, and parent messages arrived in Chamorro, and I often could not understand them.</p>
          <blockquote className="rounded-r-2xl border-l-4 border-coral-500 bg-cream-50 px-4 py-3 italic dark:bg-slate-700/50">
            ChatGPT and Google Translate helped sometimes, but the translations were not consistently reliable. As a software engineer, I started wondering whether I could build something more useful for our family.
          </blockquote>
        </StorySection>

        <StorySection title="The spark" icon={Lightbulb} iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <p>
            I am a software engineer and teach software engineering at{' '}
            <a href="https://codeschoolofguam.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-coral-700 underline underline-offset-2 dark:text-teal-300">Code School of Guam</a>. I began experimenting with AI tools both for this project and to better understand what I could teach my students.
          </p>
          <p>The first version was a small command-line tool. The turning point was retrieval-augmented generation: giving the tutor relevant passages from dictionaries, grammar research, and educational materials instead of asking a general model to answer from memory alone.</p>
          <p className="font-semibold text-coral-700 dark:text-teal-300">That is when the answers became meaningfully more useful.</p>
        </StorySection>

        <StorySection title="How it grew" icon={Rocket} iconClassName="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
          <p>
            HåfaGPT&apos;s source registry includes Chamorro dictionaries, grammar guides, and learning resources that can support retrieval, comparison, and citations when their usage policy allows it. Registered sources include{' '}
            <a href="https://www.guampedia.com" target="_blank" rel="noopener noreferrer" className="text-coral-700 underline underline-offset-2 dark:text-teal-300">Guampedia</a>,{' '}
            <a href="https://lengguahita.com" target="_blank" rel="noopener noreferrer" className="text-coral-700 underline underline-offset-2 dark:text-teal-300">Lengguahi-ta</a>,{' '}
            <a href="https://www.guampdn.com" target="_blank" rel="noopener noreferrer" className="text-coral-700 underline underline-offset-2 dark:text-teal-300">Pacific Daily News</a>,{' '}
            <a href="http://www.chamoru.info" target="_blank" rel="noopener noreferrer" className="text-coral-700 underline underline-offset-2 dark:text-teal-300">Chamoru.info</a>, the{' '}
            <a href="https://natibunmarianas.org/dictionary-introduction/" target="_blank" rel="noopener noreferrer" className="text-coral-700 underline underline-offset-2 dark:text-teal-300">Natibu Marianas Revised Chamorro-English Dictionary</a>, Dr. Sandra Chung&apos;s grammar and orthography research, and Topping&apos;s dictionary.
          </p>
          <p>The translator became a broader learning platform with stories, vocabulary, flashcards, quizzes, games, conversation practice, and progress tools. Each source is still treated as a reference with its own context—not as interchangeable proof.</p>
          <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
            {capabilities.map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl bg-cream-50 p-3 text-center dark:bg-slate-700/60">
                <Icon className="h-5 w-5 text-coral-600 dark:text-teal-300" aria-hidden="true" />
                <span className="text-xs font-semibold text-brown-700 dark:text-gray-200">{label}</span>
              </div>
            ))}
          </div>
        </StorySection>

        <StorySection title="How to read our content labels" icon={ShieldCheck} iconClassName="bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
          <p>HåfaGPT keeps useful material available while showing how strongly each learning surface is supported. A source-backed label does not mean a person has independently approved every example.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.entries(TRUST_LABELS) as Array<[ContentTrustLevel, (typeof TRUST_LABELS)[ContentTrustLevel]]>).map(([level, details]) => (
              <div key={level} className={`rounded-2xl border p-4 ${trustLevelClasses[level]}`}>
                <h3 className="font-bold text-brown-950 dark:text-white">{details.label}</h3>
                <p className="mt-1 text-sm leading-relaxed text-brown-700 dark:text-gray-300">{details.description}</p>
              </div>
            ))}
          </div>
          <p>Confirmed errors are corrected. Regional variants remain discoverable and are labeled instead of being treated as mistakes. Human review can be added later without withholding the rest of the learning library.</p>
        </StorySection>

        <StorySection title="Built for every kind of learner" icon={Users} iconClassName="bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
          <p>HåfaGPT began for Stassie, Kami, and me, but it is for anyone who wants to learn about the Chamorro language, Guam, its people, and its history: children learning with a caregiver, students, teens, adults reconnecting with family, and curious visitors.</p>
          <p>It can be a quick reference for one school message or a place to build a daily learning habit. The goal is the same: make it easier to begin, while staying honest about sources and the limits of AI.</p>
          <p className="pt-2 text-center text-lg font-semibold text-coral-700 dark:text-teal-300">Si Yu&apos;os Ma&apos;åse&apos; for being here.</p>
        </StorySection>
      </div>

      <section className="mt-8 rounded-3xl border border-coral-200 bg-coral-50 p-6 text-center dark:border-teal-900 dark:bg-teal-950/20 sm:p-8">
        <h2 className="text-2xl font-bold text-brown-950 dark:text-white">Start with whatever you need today</h2>
        <p className="mx-auto mt-2 max-w-xl text-brown-600 dark:text-gray-300">Ask a question, translate a message, or choose a guided learning activity.</p>
        <Link to="/" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700">Explore HåfaGPT</Link>
        <p className="mt-4 text-xs text-brown-500 dark:text-gray-400">
          Built by <a href="https://shimizutechnology.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">Shimizu Technology</a>
        </p>
      </section>
    </PublicPage>
  );
}

export default AboutPage;
