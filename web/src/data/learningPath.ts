// Beginner Learning Path - 7 Topics
// Each topic maps to existing flashcards, quizzes, and games

export interface LearningTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
  estimatedMinutes: number;
  // Maps to existing content
  flashcardCategory: string;
  quizCategory: string;
  // Intro content for the lesson
  intro: {
    culturalContext: string;
    keyPhrases: string[];
    tip: string;
  };
  // Optional: specific game suggestions
  suggestedGames?: string[];
}

export const BEGINNER_PATH: LearningTopic[] = [
  {
    id: 'greetings',
    title: 'Greetings & Basics',
    description: 'Learn "Håfa Adai" and how to introduce yourself',
    icon: '👋',
    estimatedMinutes: 5,
    flashcardCategory: 'greetings',
    quizCategory: 'greetings',
    intro: {
      culturalContext: 'In Chamorro culture, greetings are more than just words — they\'re a way of showing respect and building connection. "Håfa Adai" is the heart of Chamorro hospitality, used to welcome everyone from friends to strangers.',
      keyPhrases: ['Håfa Adai — Hello/Hi', 'Si Yu\'os Ma\'åse\' — Thank you', 'Adios — Goodbye'],
      tip: 'When greeting elders, it\'s respectful to use "Ñot" (Mr.) or "Ñora" (Mrs.) before their name.',
    },
    suggestedGames: ['memory', 'scramble'],
  },
  {
    id: 'numbers',
    title: 'Numbers (1-10)',
    description: 'Learn to count in Chamorro',
    icon: '🔢',
    estimatedMinutes: 5,
    flashcardCategory: 'numbers',
    quizCategory: 'numbers',
    intro: {
      culturalContext: 'Chamorro numbers have roots in the ancient counting system used by the CHamoru people. While Spanish numbers are also used in daily life, learning the traditional Chamorro numbers connects you to the island\'s heritage.',
      keyPhrases: ['Unu — One', 'Dos — Two', 'Tres — Three'],
      tip: 'Practice counting everyday objects around you — mangga (mangoes), niyok (coconuts), or palao\'an (women)!',
    },
    suggestedGames: ['memory', 'falling'],
  },
  {
    id: 'colors',
    title: 'Colors',
    description: 'Learn the colors of the rainbow',
    icon: '🎨',
    estimatedMinutes: 5,
    flashcardCategory: 'colors',
    quizCategory: 'colors',
    intro: {
      culturalContext: 'Colors in Chamorro often connect to nature — the blue of the Pacific Ocean (asut), the green of the jungle (betde), and the red of the flame tree flowers (agaga\').',
      keyPhrases: ['Agaga\' — Red', 'Asut — Blue', 'Betde — Green'],
      tip: 'Look around you and try to name colors in Chamorro. The sunset has many: agaga\' (red), amariyu (yellow), and kulot kahel (orange)!',
    },
    suggestedGames: ['memory', 'sound-match'],
  },
  {
    id: 'family',
    title: 'Family Members',
    description: 'Words for mother, father, siblings, and more',
    icon: '👨‍👩‍👧‍👦',
    estimatedMinutes: 5,
    flashcardCategory: 'family',
    quizCategory: 'family',
    intro: {
      culturalContext: 'Family (familia) is the foundation of Chamorro society. Extended family gatherings, called "fiestas," bring together multiple generations. Respect for elders (manamko\') is deeply valued.',
      keyPhrases: ['Nåna — Mother', 'Tåta — Father', 'Che\'lu — Sibling'],
      tip: 'In Chamorro culture, cousins are often called "che\'lu" (sibling) because family bonds are so close!',
    },
    suggestedGames: ['memory', 'scramble'],
  },
  {
    id: 'food',
    title: 'Food & Drinks',
    description: 'Common foods and island favorites',
    icon: '🍚',
    estimatedMinutes: 5,
    flashcardCategory: 'food',
    quizCategory: 'food',
    intro: {
      culturalContext: 'Chamorro cuisine reflects the island\'s history — a blend of indigenous, Spanish, Filipino, and American influences. Rice (hineksa\') is a staple at every meal, and fresh seafood from the Pacific is treasured.',
      keyPhrases: ['Hineksa\' — Rice', 'Guihan — Fish', 'Niyok — Coconut'],
      tip: 'Try ordering at a local restaurant in Chamorro! "Kao guaha hineksa\'?" means "Do you have rice?"',
    },
    suggestedGames: ['memory', 'sound-match'],
  },
  {
    id: 'animals',
    title: 'Animals',
    description: 'Learn about island creatures and pets',
    icon: '🐠',
    estimatedMinutes: 5,
    flashcardCategory: 'animals',
    quizCategory: 'animals',
    intro: {
      culturalContext: 'Guam is home to unique wildlife. The ko\'ko\' (Guam rail) is an endemic bird that nearly went extinct. Carabao (water buffalo) are symbols of CHamoru heritage, once used for farming.',
      keyPhrases: ['Ga\'lågu — Dog', 'Guihan — Fish', 'Paluma — Bird'],
      tip: 'The ko\'ko\' bird is so special to Guam that it\'s featured on the island\'s seal. It\'s called "totot" in Chamorro after its call!',
    },
    suggestedGames: ['memory', 'sound-match'],
  },
  {
    id: 'phrases',
    title: 'Common Phrases',
    description: 'Everyday expressions and useful phrases',
    icon: '💬',
    estimatedMinutes: 5,
    flashcardCategory: 'phrases',
    quizCategory: 'common-phrases',
    intro: {
      culturalContext: 'These everyday phrases will help you navigate daily life on Guam. Chamorros appreciate when visitors try to speak the language — even a few words show respect for the culture.',
      keyPhrases: ['Kao siña? — Can I?/May I?', 'Hunggan — Yes', 'Åhe\' — No'],
      tip: 'Don\'t be shy! Chamorros love hearing their language spoken. Even if you make mistakes, your effort will be appreciated.',
    },
    suggestedGames: ['scramble', 'hangman'],
  },
];

// Helper to get topic by ID
export function getTopic(id: string): LearningTopic | undefined {
  return BEGINNER_PATH.find(t => t.id === id);
}

// Helper to get next topic after a given ID
export function getNextTopic(currentId: string): LearningTopic | undefined {
  const currentIndex = BEGINNER_PATH.findIndex(t => t.id === currentId);
  if (currentIndex === -1 || currentIndex === BEGINNER_PATH.length - 1) {
    return undefined;
  }
  return BEGINNER_PATH[currentIndex + 1];
}

// Helper to get topic index (1-based for display)
export function getTopicIndex(id: string): number {
  return BEGINNER_PATH.findIndex(t => t.id === id) + 1;
}
