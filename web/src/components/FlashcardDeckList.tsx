import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, BookOpen, Hash, Layers3, Library, MessageCircle, Sparkles, Users, Utensils, Zap } from 'lucide-react';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';

interface Deck {
  topic: string;
  title: string;
  description: string;
  cardCount: number;
  difficulty: string;
  icon: React.ReactNode;
}

// Curated decks - handpicked beginner-friendly cards with pronunciations
const curatedDecks: Deck[] = [
  {
    topic: 'greetings',
    title: 'Greetings & Basics',
    description: 'Hello, goodbye, how are you',
    cardCount: DEFAULT_FLASHCARD_DECKS.greetings?.cards.length || 10,
    difficulty: 'Beginner',
    icon: <MessageCircle className="w-6 h-6" />
  },
  {
    topic: 'family',
    title: 'Family Members',
    description: 'Mother, father, siblings, relatives',
    cardCount: DEFAULT_FLASHCARD_DECKS.family?.cards.length || 10,
    difficulty: 'Beginner',
    icon: <Users className="w-6 h-6" />
  },
  {
    topic: 'numbers',
    title: 'Numbers 1-10',
    description: 'Counting and basic numbers',
    cardCount: DEFAULT_FLASHCARD_DECKS.numbers?.cards.length || 10,
    difficulty: 'Beginner',
    icon: <Hash className="w-6 h-6" />
  },
  {
    topic: 'colors',
    title: 'Colors',
    description: 'Basic color words',
    cardCount: DEFAULT_FLASHCARD_DECKS.colors?.cards.length || 10,
    difficulty: 'Beginner',
    icon: <Sparkles className="w-6 h-6" />
  },
  {
    topic: 'food',
    title: 'Food & Cooking',
    description: 'Meals, ingredients, cooking terms',
    cardCount: DEFAULT_FLASHCARD_DECKS.food?.cards.length || 10,
    difficulty: 'Intermediate',
    icon: <Utensils className="w-6 h-6" />
  },
  {
    topic: 'body',
    title: 'Body Parts',
    description: 'Parts of the body',
    cardCount: DEFAULT_FLASHCARD_DECKS.body?.cards.length || 10,
    difficulty: 'Beginner',
    icon: <Activity className="w-6 h-6" />
  },
  {
    topic: 'verbs',
    title: 'Common Verbs',
    description: 'Action words and doing words',
    cardCount: DEFAULT_FLASHCARD_DECKS.verbs?.cards.length || 10,
    difficulty: 'Intermediate',
    icon: <Activity className="w-6 h-6" />
  },
  {
    topic: 'phrases',
    title: 'Common Phrases',
    description: 'Useful everyday expressions',
    cardCount: DEFAULT_FLASHCARD_DECKS.phrases?.cards.length || 10,
    difficulty: 'Beginner',
    icon: <MessageCircle className="w-6 h-6" />
  }
];

// Icon mapping for dictionary categories
const categoryIcons: Record<string, React.ReactNode> = {
  greetings: <MessageCircle className="w-6 h-6" />,
  family: <Users className="w-6 h-6" />,
  numbers: <Hash className="w-6 h-6" />,
  colors: <Sparkles className="w-6 h-6" />,
  food: <Utensils className="w-6 h-6" />,
  animals: <Activity className="w-6 h-6" />,
  body: <Activity className="w-6 h-6" />,
  nature: <Sparkles className="w-6 h-6" />,
  places: <BookOpen className="w-6 h-6" />,
  time: <Hash className="w-6 h-6" />,
  verbs: <Activity className="w-6 h-6" />,
  phrases: <MessageCircle className="w-6 h-6" />
};

export function FlashcardDeckList() {
  const [cardType, setCardType] = useState<'curated' | 'dictionary'>('curated');
  const { data: vocabCategories } = useVocabularyCategories();
  const dictionaryCategories = vocabCategories?.categories || [];
  const dictionaryWordCount = vocabCategories?.total_words?.toLocaleString() || '10,000+';
  const decks = cardType === 'curated' ? curatedDecks : dictionaryCategories;

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title="Flashcards"
        subtitle="Build recall with short, focused decks"
        icon={Layers3}
        trailing={(
          <Link
            to="/flashcards/my-decks"
            aria-label="Open my decks"
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-coral-700 hover:bg-coral-100 dark:text-ocean-300 dark:hover:bg-ocean-950"
          >
            <Library className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">My decks</span>
          </Link>
        )}
      />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <div className="mb-6 max-w-2xl">
          <p className="mb-1 text-sm font-bold text-coral-700 dark:text-coral-300">Practice</p>
          <h2 className="text-2xl font-bold tracking-tight text-brown-950 dark:text-white sm:text-3xl">Build recall one card at a time</h2>
          <p className="mt-2 text-brown-600 dark:text-gray-300">Choose a ready-made beginner deck or practice words from the full dictionary.</p>
        </div>

        <div className="mb-7">
          <div className="grid max-w-xl grid-cols-2 gap-1 rounded-2xl border border-cream-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" aria-label="Flashcard source">
            <button
              type="button"
              onClick={() => setCardType('curated')}
              aria-pressed={cardType === 'curated'}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${
                cardType === 'curated'
                  ? 'bg-coral-600 text-white'
                  : 'text-brown-600 hover:bg-cream-100 dark:text-gray-300 dark:hover:bg-slate-700'
              }`}
            >
              <Zap className="h-4 w-4" aria-hidden="true" />
              Guided decks
            </button>
            <button
              type="button"
              onClick={() => setCardType('dictionary')}
              aria-pressed={cardType === 'dictionary'}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${
                cardType === 'dictionary'
                  ? 'bg-coral-600 text-white'
                  : 'text-brown-600 hover:bg-cream-100 dark:text-gray-300 dark:hover:bg-slate-700'
              }`}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Dictionary
            </button>
          </div>
          <p className="mt-2 text-sm text-brown-500 dark:text-gray-400">
            {cardType === 'curated'
              ? 'Handpicked vocabulary with beginner-friendly pronunciations.'
              : `Random practice from ${dictionaryWordCount} dictionary words.`}
          </p>
        </div>

        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-brown-950 dark:text-white">{cardType === 'curated' ? 'Choose a guided deck' : 'Choose a dictionary topic'}</h3>
            <p className="text-sm text-brown-500 dark:text-gray-400">Each session is short enough to finish in a few minutes.</p>
          </div>
          <span className="hidden rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-brown-600 dark:bg-slate-800 dark:text-gray-300 sm:inline">{decks.length} topics</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {cardType === 'curated'
            ? curatedDecks.map((deck) => (
              <Link key={deck.topic} to={`/flashcards/${deck.topic}?type=curated`} className="group flex min-h-32 items-start gap-4 rounded-2xl border border-cream-200 bg-white p-5 transition-colors hover:border-coral-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-ocean-600">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-coral-100 text-coral-700 dark:bg-ocean-950 dark:text-ocean-300">{deck.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-brown-950 dark:text-white">{deck.title}</span>
                  <span className="mt-1 block text-sm text-brown-600 dark:text-gray-300">{deck.description}</span>
                  <span className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-brown-500 dark:text-gray-400">
                    <span>{deck.cardCount} cards</span><span aria-hidden="true">•</span><span>{deck.difficulty}</span>
                  </span>
                </span>
                <ArrowRight className="mt-1 h-5 w-5 flex-none text-brown-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))
            : dictionaryCategories.map((category) => (
              <Link key={category.id} to={`/flashcards/${category.id}?type=dictionary`} className="group flex min-h-32 items-start gap-4 rounded-2xl border border-cream-200 bg-white p-5 transition-colors hover:border-coral-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-ocean-600">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-ocean-100 text-ocean-700 dark:bg-ocean-950 dark:text-ocean-300">{categoryIcons[category.id] || <BookOpen className="h-6 w-6" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-brown-950 dark:text-white">{category.title}</span>
                  <span className="mt-1 block text-sm text-brown-600 dark:text-gray-300">{category.description}</span>
                  <span className="mt-3 block text-xs font-semibold text-brown-500 dark:text-gray-400">{category.word_count} words • Random practice</span>
                </span>
                <ArrowRight className="mt-1 h-5 w-5 flex-none text-brown-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
        </div>
      </main>
    </LearnerPageShell>
  );
}
