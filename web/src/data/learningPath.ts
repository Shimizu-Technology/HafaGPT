// Learning Paths - Beginner & Intermediate
// Each topic maps to flashcards, quizzes, and games

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LearningTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
  estimatedMinutes: number;
  level: LearningLevel;
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

export interface LearningPath {
  level: LearningLevel;
  title: string;
  description: string;
  icon: string;
  topics: LearningTopic[];
}

export const BEGINNER_PATH: LearningTopic[] = [
  {
    id: 'greetings',
    title: 'Greetings & Basics',
    description: 'Learn "Håfa Adai" and how to introduce yourself',
    icon: '👋',
    estimatedMinutes: 5,
    level: 'beginner',
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
    level: 'beginner',
    flashcardCategory: 'numbers',
    quizCategory: 'numbers',
    intro: {
      culturalContext: 'This lesson teaches the modern Chamorro number forms used in everyday counting, including Unu, Dos, and Tres. Guåhan also has a distinct traditional counting system with forms such as Håcha and Hugua.',
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
    level: 'beginner',
    flashcardCategory: 'colors',
    quizCategory: 'colors',
    intro: {
      culturalContext: 'Colors in Chamorro often connect to nature — the blue of the Pacific Ocean (asut), the green of the jungle (betde), and the red of the flame tree flowers (agaga\').',
      keyPhrases: ['Agaga\' — Red', 'Asut — Blue', 'Betde — Green'],
      tip: 'Look around you and try to name colors in Chamorro. The sunset has many: agaga\' (red), amariyu (yellow), and kulot kåhet (orange)!',
    },
    suggestedGames: ['memory', 'sound-match'],
  },
  {
    id: 'family',
    title: 'Family Members',
    description: 'Words for mother, father, siblings, and more',
    icon: '👨‍👩‍👧‍👦',
    estimatedMinutes: 5,
    level: 'beginner',
    flashcardCategory: 'family',
    quizCategory: 'family',
    intro: {
      culturalContext: 'Family (familia) is central to Chamorro society. Extended-family gatherings bring together multiple generations, while village fiestas are community celebrations commonly connected to a patron saint. Respect for elders (manamko\') is deeply valued.',
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
    level: 'beginner',
    flashcardCategory: 'food',
    quizCategory: 'food',
    intro: {
      culturalContext: 'Chamorro cuisine reflects the island\'s history — a blend of indigenous, Spanish, Filipino, and American influences. Rice (hineksa\') is a staple at every meal, and fresh seafood from the Pacific is treasured.',
      keyPhrases: ['Hineksa\' — Cooked rice', 'Guihan — Fish', 'Niyok — Coconut palm'],
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
    level: 'beginner',
    flashcardCategory: 'animals',
    quizCategory: 'animals',
    intro: {
      culturalContext: 'Guam is home to unique wildlife. The ko\'ko\' (Guam rail) is an endemic bird that nearly went extinct. Carabao (water buffalo) are symbols of Chamorro heritage, once used for farming.',
      keyPhrases: ['Ga\'lågu — Dog', 'Guihan — Fish', 'Paluma — Bird'],
      tip: 'The ko\'ko\' is the Guam rail, an endemic bird brought back from the edge of extinction. The totot is a different native bird: the Mariana fruit dove.',
    },
    suggestedGames: ['memory', 'sound-match'],
  },
  {
    id: 'phrases',
    title: 'Common Phrases',
    description: 'Everyday expressions and useful phrases',
    icon: '💬',
    estimatedMinutes: 5,
    level: 'beginner',
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

// Intermediate Learning Path - 7 Topics
// Builds on beginner knowledge with grammar patterns and more vocabulary
export const INTERMEDIATE_PATH: LearningTopic[] = [
  {
    id: 'questions',
    title: 'Question Words',
    description: 'Learn to ask who, what, where, when, why, how',
    icon: '❓',
    estimatedMinutes: 6,
    level: 'intermediate',
    flashcardCategory: 'questions',
    quizCategory: 'questions',
    intro: {
      culturalContext: 'Asking questions is essential for conversation. Chamorro question words often introduce the information being requested, but sentence structure and agreement do not simply follow English patterns.',
      keyPhrases: ['Håfa — What', 'Hayi — Who', 'Manu — Where'],
      tip: 'Notice how "Håfa" appears in "Håfa Adai" — the full phrase is the source-backed everyday greeting for hello/hi.',
    },
    suggestedGames: ['scramble', 'hangman'],
  },
  {
    id: 'body-parts',
    title: 'Body Parts',
    description: 'Learn words for parts of the body',
    icon: '🫀',
    estimatedMinutes: 6,
    level: 'intermediate',
    flashcardCategory: 'body',
    quizCategory: 'body-parts',
    intro: {
      culturalContext: 'Knowing body part words is practical for health, descriptions, and everyday life. These words are also used in traditional Chamorro songs and dances that celebrate the human form.',
      keyPhrases: ['Ulu — Head', 'Åtadok — Eye', 'Kannai — Hand'],
      tip: 'Body-part words often appear with possessive endings in practice, such as “-mu” for “your” in Simon Says commands.',
    },
    suggestedGames: ['memory', 'sound-match'],
  },
  {
    id: 'days',
    title: 'Days of the Week',
    description: 'Learn to say the days in Chamorro',
    icon: '📅',
    estimatedMinutes: 5,
    level: 'intermediate',
    flashcardCategory: 'days',
    quizCategory: 'days',
    intro: {
      culturalContext: 'Current Guåhan references record both traditional and modern day names. This lesson starts with modern forms such as Damenggo and Lunes, while keeping traditional forms such as Hachåni and Huguåni visible as part of the language\'s history.',
      keyPhrases: ['Lunes — Monday', 'Betnes — Friday', 'Damenggo — Sunday'],
      tip: 'The Kumisión list pairs each traditional form with a modern form: Hachåni/Damenggo for Sunday, Huguåni/Lunes for Monday, and so on.',
    },
    suggestedGames: ['memory', 'falling'],
  },
  {
    id: 'months',
    title: 'Months & Seasons',
    description: 'Learn the months of the year',
    icon: '🗓️',
    estimatedMinutes: 6,
    level: 'intermediate',
    flashcardCategory: 'months',
    quizCategory: 'months',
    intro: {
      culturalContext: 'Guåhan has two broad seasons: fañomnåkan (dry season) and fanuchånan (wet season). The modern month names reflect Spanish influence and the forms in this lesson follow the Kumisión\'s current Guåhan list.',
      keyPhrases: ['Ineru — January', 'Hulio — July', 'Disiembre — December'],
      tip: 'Guam\'s festive season peaks in December (Disiembre) with fiestas, Christmas celebrations, and community gatherings.',
    },
    suggestedGames: ['memory', 'scramble'],
  },
  {
    id: 'verbs',
    title: 'Common Verbs',
    description: 'Action words for everyday activities',
    icon: '🏃',
    estimatedMinutes: 7,
    level: 'intermediate',
    flashcardCategory: 'verbs',
    quizCategory: 'verbs',
    intro: {
      culturalContext: 'Chamorro verbs work differently from English. Many beginner transitive phrases use "Hu" before the verb, as in "Hu li\'e\'" (I see) and "Hu hungok" (I hear). Movement, sleep, and object-required verbs need more context, so practice them with reviewed examples.',
      keyPhrases: ['Hu li\'e\' — I see', 'Hu hungok — I hear', 'Hu sångan — I say / I tell'],
      tip: 'Start by learning each verb with a reviewed example phrase; Chamorro verb forms can change depending on focus, tense/aspect, and whether the verb takes an object.',
    },
    suggestedGames: ['scramble', 'falling'],
  },
  {
    id: 'adjectives',
    title: 'Describing Things',
    description: 'Adjectives for size, quality, and feelings',
    icon: '✨',
    estimatedMinutes: 6,
    level: 'intermediate',
    flashcardCategory: 'adjectives',
    quizCategory: 'adjectives',
    intro: {
      culturalContext: 'Descriptive words in Chamorro help you express opinions, describe people and places, and share your feelings. Many adjectives can also function as verbs!',
      keyPhrases: ['Maolek — Good', 'Bunitu — Beautiful', 'Dånkolo — Big'],
      tip: '"Maolek" is one of the most useful words — it means "good," "fine," "okay," and is used constantly in conversation!',
    },
    suggestedGames: ['memory', 'hangman'],
  },
  {
    id: 'sentences',
    title: 'Simple Sentences',
    description: 'Put words together to make sentences',
    icon: '📝',
    estimatedMinutes: 8,
    level: 'intermediate',
    flashcardCategory: 'sentences',
    quizCategory: 'sentences',
    intro: {
      culturalContext: 'Now it\'s time to combine vocabulary into short sentences. Chamorro commonly uses predicate-first patterns and has agreement and focus features that differ from English. Modal words like "siña" (can) and "malago\'" (want) are useful starting points.',
      keyPhrases: ['Guahu si... — I am...', 'Malago\' yu\' — I want', 'Ti siña — Cannot'],
      tip: 'Practice saying "Malago\' yu\' + noun" for "I want (something)." It\'s one of the most practical patterns!',
    },
    suggestedGames: ['scramble', 'hangman'],
  },
];

// Advanced Level Topics (7 topics)
export const ADVANCED_PATH: LearningTopic[] = [
  {
    id: 'places',
    title: 'Places & Locations',
    description: 'Buildings, landmarks, and location phrases',
    icon: '🏠',
    estimatedMinutes: 8,
    level: 'advanced',
    flashcardCategory: 'places',
    quizCategory: 'places',
    intro: {
      culturalContext: 'Knowing place names helps you navigate Guam and the Marianas. Many place names have Spanish influence while keeping their Chamorro roots.',
      keyPhrases: ['Guma\' — House', 'Eskuela — School', 'Tenda — Store'],
      tip: 'Practice saying "Gaige gi..." (It\'s at...) to describe locations!',
    },
    suggestedGames: ['memory', 'scramble'],
  },
  {
    id: 'weather',
    title: 'Weather & Nature',
    description: 'Weather conditions and natural environment',
    icon: '🌞',
    estimatedMinutes: 8,
    level: 'advanced',
    flashcardCategory: 'weather',
    quizCategory: 'weather',
    intro: {
      culturalContext: 'Weather is a constant topic on island! Guam has two broad seasons: dry season (fañomnåkan) and wet season (fanuchånan). Typhoons are also part of island life.',
      keyPhrases: ['Atdao — Sun', 'Uchan — Rain', 'Manglo\' — Wind'],
      tip: 'Start conversations about weather: "Maolek i tiempo!" (The weather is nice!)',
    },
    suggestedGames: ['memory', 'falling'],
  },
  {
    id: 'household',
    title: 'Home & Household',
    description: 'Rooms, furniture, and household items',
    icon: '🛋️',
    estimatedMinutes: 8,
    level: 'advanced',
    flashcardCategory: 'household',
    quizCategory: 'household',
    intro: {
      culturalContext: 'The Chamorro home (guma\') is central to family life. Traditional homes had specific areas for different activities, and hospitality is a core value.',
      keyPhrases: ['Kusina — Kitchen', 'Kuåtto — Room', 'Lamasa — Table'],
      tip: 'Invite someone to your home: "Hanao magi para i guma\'-hu!" (Come to my house!)',
    },
    suggestedGames: ['memory', 'scramble'],
  },
  {
    id: 'directions',
    title: 'Directions & Travel',
    description: 'Directions, movement, and transportation',
    icon: '🧭',
    estimatedMinutes: 8,
    level: 'advanced',
    flashcardCategory: 'directions',
    quizCategory: 'directions',
    intro: {
      culturalContext: 'Giving directions is essential for island navigation. Chamorros often use landmarks rather than street addresses. Know your left (akague) from your right (agapa\')!',
      keyPhrases: ['Agapa\' — Right', 'Akague — Left', 'Magi — Here'],
      tip: 'When giving directions, combine with landmarks: "Bira agapa\' gi tenda" (Turn right at the store)',
    },
    suggestedGames: ['scramble', 'falling'],
  },
  {
    id: 'shopping',
    title: 'Shopping & Money',
    description: 'Buying, selling, and money vocabulary',
    icon: '💰',
    estimatedMinutes: 8,
    level: 'advanced',
    flashcardCategory: 'shopping',
    quizCategory: 'shopping',
    intro: {
      culturalContext: 'Shopping and bargaining are social activities in Chamorro culture. Village markets and fiestas are great places to practice these phrases!',
      keyPhrases: ['Salåpe\' — Money', 'Fåhan — Buy', 'Presiu — Price'],
      tip: 'Ask "Kuåntu i presiu?" (How much?) when shopping at markets or flea markets!',
    },
    suggestedGames: ['scramble', 'wordle'],
  },
  {
    id: 'daily-life',
    title: 'Work & Daily Life',
    description: 'Jobs, school, and daily activities',
    icon: '💼',
    estimatedMinutes: 8,
    level: 'advanced',
    flashcardCategory: 'daily-life',
    quizCategory: 'daily-life',
    intro: {
      culturalContext: 'Understanding daily life vocabulary helps you connect with the community. Education and work are important topics in everyday conversation.',
      keyPhrases: ['Emplehu — Job', 'Estudiånte — Student', 'Tutuhon — Begin'],
      tip: 'Describe your day: "Hu tutuhon i cho\'cho\'-hu gi alas ocho" (I start my work at 8 o\'clock)',
    },
    suggestedGames: ['scramble', 'memory'],
  },
  {
    id: 'culture',
    title: 'Culture & Celebrations',
    description: 'Traditions, fiestas, and respect language',
    icon: '🎉',
    estimatedMinutes: 10,
    level: 'advanced',
    flashcardCategory: 'culture',
    quizCategory: 'culture',
    intro: {
      culturalContext: 'Chamorro culture is rich with traditions! Understanding values like rispetu (respect), inafa\'maolek (harmony), and chenchule\' (reciprocity) is key to connecting with the community.',
      keyPhrases: ['Gupot — Party', 'Fiesta — Festival', 'Rispetu — Respect'],
      tip: 'Show rispetu to manamko\' (elders) — it\'s one of the most important Chamorro values!',
    },
    suggestedGames: ['memory', 'wordle'],
  },
];

// Combined paths for easy access
export const ALL_PATHS: LearningPath[] = [
  {
    level: 'beginner',
    title: 'Beginner',
    description: 'Build your foundation with essential vocabulary',
    icon: '🌱',
    topics: BEGINNER_PATH,
  },
  {
    level: 'intermediate',
    title: 'Intermediate',
    description: 'Expand with grammar patterns and more vocabulary',
    icon: '🌿',
    topics: INTERMEDIATE_PATH,
  },
  {
    level: 'advanced',
    title: 'Advanced',
    description: 'Master practical skills for real-world conversations',
    icon: '🌳',
    topics: ADVANCED_PATH,
  },
];

// All topics from all paths (for lookups)
export const ALL_TOPICS: LearningTopic[] = [...BEGINNER_PATH, ...INTERMEDIATE_PATH, ...ADVANCED_PATH];

// Helper to get topic by ID (searches all paths)
export function getTopic(id: string): LearningTopic | undefined {
  return ALL_TOPICS.find(t => t.id === id);
}

// Helper to get the path array for a level
function getPathForLevel(level: LearningLevel): LearningTopic[] {
  switch (level) {
    case 'beginner': return BEGINNER_PATH;
    case 'intermediate': return INTERMEDIATE_PATH;
    case 'advanced': return ADVANCED_PATH;
    default: return BEGINNER_PATH;
  }
}

// Helper to get next topic after a given ID (within same level)
export function getNextTopic(currentId: string): LearningTopic | undefined {
  const topic = getTopic(currentId);
  if (!topic) return undefined;
  
  const path = getPathForLevel(topic.level);
  const currentIndex = path.findIndex(t => t.id === currentId);
  
  if (currentIndex === -1 || currentIndex === path.length - 1) {
    return undefined;
  }
  return path[currentIndex + 1];
}

// Helper to get topic index within its level (1-based for display)
export function getTopicIndex(id: string): number {
  const topic = getTopic(id);
  if (!topic) return -1;

  const path = getPathForLevel(topic.level);
  return path.findIndex(t => t.id === id) + 1;
}

// Helper to get path by level
export function getPath(level: LearningLevel): LearningTopic[] {
  switch (level) {
    case 'beginner': return BEGINNER_PATH;
    case 'intermediate': return INTERMEDIATE_PATH;
    case 'advanced': return ADVANCED_PATH;
    default: return BEGINNER_PATH;
  }
}

// Helper to check if user has completed a level (all topics done)
export function isLevelComplete(level: LearningLevel, completedTopicIds: string[]): boolean {
  const path = getPath(level);
  return path.every(topic => completedTopicIds.includes(topic.id));
}

// Helper to get next level after completing current
export function getNextLevel(currentLevel: LearningLevel): LearningLevel | undefined {
  if (currentLevel === 'beginner') return 'intermediate';
  if (currentLevel === 'intermediate') return 'advanced';
  return undefined;
}
