import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Users, Utensils, Hash, Activity, MessageCircle, Zap, Sparkles, Library } from 'lucide-react';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { useVocabularyCategories } from '../hooks/useVocabularyQuery';

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

  // Dictionary categories for flashcards
  const dictionaryCategories = vocabCategories?.categories || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-coral-500 dark:text-ocean-400" />
              <h1 className="text-xl font-semibold text-brown-800 dark:text-white">
                Study Chamorro
              </h1>
            </div>
          </div>

          {/* My Decks Button */}
          <Link
            to="/flashcards/my-decks"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-coral-100 dark:bg-ocean-900/30 text-coral-700 dark:text-ocean-300 hover:bg-coral-200 dark:hover:bg-ocean-800/50 transition-colors font-medium"
          >
            <Library className="w-4 h-4" />
            <span className="hidden sm:inline">My Decks</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 animate-page-enter">
        {/* Card Type Toggle */}
        <div className="mb-6">
          <p className="text-brown-700 dark:text-gray-200 mb-4 font-medium">
            Choose a topic to start studying flashcards
          </p>
          
          <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-xl border-2 border-coral-200/30 dark:border-ocean-500/30 shadow-sm w-fit">
            <button
              onClick={() => setCardType('curated')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                cardType === 'curated'
                  ? 'bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white shadow-md scale-105'
                  : 'text-brown-600 dark:text-gray-300 hover:bg-coral-50 dark:hover:bg-ocean-900/20'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Curated</span>
              {cardType === 'curated' && <span className="text-xs opacity-90">(Handpicked)</span>}
            </button>
            
            <button
              onClick={() => setCardType('dictionary')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                cardType === 'dictionary'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-105'
                  : 'text-brown-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Dictionary</span>
              {cardType === 'dictionary' && <span className="text-xs opacity-90">(10,350 words)</span>}
            </button>
          </div>
          <p className="text-xs text-brown-500 dark:text-gray-400 mt-2">
            {cardType === 'curated' 
              ? 'Handpicked cards with pronunciations for beginners'
              : 'Random cards from our full dictionary for variety'}
          </p>
        </div>

        {/* Curated Deck Grid */}
        {cardType === 'curated' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {curatedDecks.map((deck) => (
              <Link
                key={deck.topic}
                to={`/flashcards/${deck.topic}?type=curated`}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 hover:shadow-xl transition-all duration-200 group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-ocean-900/40 dark:to-ocean-800/40 text-coral-600 dark:text-ocean-400 group-hover:scale-110 transition-transform shadow-sm">
                    {deck.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-brown-800 dark:text-white mb-1 text-lg">
                      {deck.title}
                    </h3>
                    <p className="text-sm text-brown-600 dark:text-gray-300 mb-3">
                      {deck.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs font-medium text-brown-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {deck.cardCount} cards
                      </span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        deck.difficulty === 'Beginner' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      }`}>
                        {deck.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Dictionary Deck Grid */}
        {cardType === 'dictionary' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dictionaryCategories.map((category) => (
              <Link
                key={category.id}
                to={`/flashcards/${category.id}?type=dictionary`}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 hover:shadow-xl transition-all duration-200 group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform shadow-sm">
                    {categoryIcons[category.id] || <BookOpen className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-brown-800 dark:text-white mb-1 text-lg">
                      {category.title}
                    </h3>
                    <p className="text-sm text-brown-600 dark:text-gray-300 mb-3">
                      {category.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs font-medium text-brown-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {category.word_count} words
                      </span>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                        Random
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

