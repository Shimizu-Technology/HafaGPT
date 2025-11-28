/**
 * Story Mode - Curated Chamorro stories for reading practice
 * 
 * Stories are organized by difficulty level and include:
 * - Chamorro text with word-by-word translations
 * - Comprehension questions
 * - Cultural context
 */

export interface StoryWord {
  chamorro: string;
  english: string;
  pronunciation?: string;
}

export interface StoryParagraph {
  id: string;
  chamorro: string;           // Full Chamorro text
  english: string;            // English translation
  words: StoryWord[];         // Word-by-word breakdown
}

export interface ComprehensionQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;      // Index of correct option
  explanation: string;
}

export interface Story {
  id: string;
  title: string;
  titleEnglish: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readingTime: number;        // Minutes
  wordCount: number;
  icon: string;
  culturalNote?: string;
  paragraphs: StoryParagraph[];
  questions: ComprehensionQuestion[];
}

export interface StoryCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  stories: Story[];
}

// ============================================
// BEGINNER STORIES
// ============================================

const beginnerStories: Story[] = [
  {
    id: 'hafa-adai-maria',
    title: 'Håfa Adai, Maria!',
    titleEnglish: 'Hello, Maria!',
    description: 'A simple greeting conversation between two friends',
    difficulty: 'beginner',
    readingTime: 2,
    wordCount: 28,
    icon: '👋',
    culturalNote: '"Håfa Adai" is the traditional Chamorro greeting, similar to "Aloha" in Hawaiian. It literally means "What\'s up?" but is used as a friendly hello.',
    paragraphs: [
      {
        id: 'p1',
        chamorro: 'Håfa Adai! Kao maolek hao?',
        english: 'Hello! Are you well?',
        words: [
          { chamorro: 'Håfa', english: 'what', pronunciation: 'HAH-fah' },
          { chamorro: 'Adai', english: 'hey/hi (greeting particle)', pronunciation: 'ah-DYE' },
          { chamorro: 'Kao', english: 'question marker (are/is)', pronunciation: 'kow' },
          { chamorro: 'maolek', english: 'good, well', pronunciation: 'mow-LEK' },
          { chamorro: 'hao', english: 'you', pronunciation: 'how' },
        ]
      },
      {
        id: 'p2',
        chamorro: 'Håfa Adai! Hunggan, maolek yu\'. Hågu?',
        english: 'Hello! Yes, I\'m well. And you?',
        words: [
          { chamorro: 'Håfa', english: 'what', pronunciation: 'HAH-fah' },
          { chamorro: 'Adai', english: 'hey/hi', pronunciation: 'ah-DYE' },
          { chamorro: 'Hunggan', english: 'yes', pronunciation: 'HOONG-gahn' },
          { chamorro: 'maolek', english: 'good, well', pronunciation: 'mow-LEK' },
          { chamorro: 'yu\'', english: 'I/me', pronunciation: 'dzoo' },
          { chamorro: 'Hågu', english: 'you (and you?)', pronunciation: 'HAH-goo' },
        ]
      },
      {
        id: 'p3',
        chamorro: 'Maolek yu\' lokkue\'. Si Yu\'us ma\'åse\'!',
        english: 'I\'m well too. Thank you!',
        words: [
          { chamorro: 'Maolek', english: 'good, well', pronunciation: 'mow-LEK' },
          { chamorro: 'yu\'', english: 'I/me', pronunciation: 'dzoo' },
          { chamorro: 'lokkue\'', english: 'also, too', pronunciation: 'lok-KWAY' },
          { chamorro: 'Si', english: '(name marker)', pronunciation: 'see' },
          { chamorro: 'Yu\'us', english: 'God', pronunciation: 'DZOO-us' },
          { chamorro: 'ma\'åse\'', english: 'have mercy (thank you)', pronunciation: 'mah-AH-say' },
        ]
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'What does "Håfa Adai" mean?',
        options: ['Goodbye', 'Hello/How are you', 'Thank you', 'Good night'],
        correctAnswer: 1,
        explanation: '"Håfa Adai" is the traditional Chamorro greeting, similar to "Hello" or "How are you?"'
      },
      {
        id: 'q2',
        question: 'How do you say "I\'m well" in Chamorro?',
        options: ['Maolek hao', 'Maolek yu\'', 'Håfa Adai', 'Si Yu\'us ma\'åse\''],
        correctAnswer: 1,
        explanation: '"Maolek yu\'" means "I\'m well" - "maolek" means good/well and "yu\'" means I/me.'
      },
      {
        id: 'q3',
        question: 'What does "Si Yu\'us ma\'åse\'" mean?',
        options: ['Hello', 'Goodbye', 'Thank you', 'You\'re welcome'],
        correctAnswer: 2,
        explanation: '"Si Yu\'us ma\'åse\'" literally means "May God have mercy" and is used to say "Thank you."'
      },
    ]
  },
  {
    id: 'i-familia-hu',
    title: 'I Familia-hu',
    titleEnglish: 'My Family',
    description: 'Learn family words through a simple introduction',
    difficulty: 'beginner',
    readingTime: 3,
    wordCount: 42,
    icon: '👨‍👩‍👧‍👦',
    culturalNote: 'Family is central to Chamorro culture. Extended family (familian) often live together or nearby, and respect for elders is paramount.',
    paragraphs: [
      {
        id: 'p1',
        chamorro: 'Hu na\'an-hu si Juan. Guåhu ginen Guåhan.',
        english: 'My name is Juan. I am from Guam.',
        words: [
          { chamorro: 'Hu', english: 'my (possessive)', pronunciation: 'hoo' },
          { chamorro: 'na\'an-hu', english: 'my name', pronunciation: 'nah-AHN-hoo' },
          { chamorro: 'si', english: '(name marker)', pronunciation: 'see' },
          { chamorro: 'Juan', english: 'Juan (name)', pronunciation: 'HWAHN' },
          { chamorro: 'Guåhu', english: 'I/me', pronunciation: 'GWAH-hoo' },
          { chamorro: 'ginen', english: 'from', pronunciation: 'GEE-nen' },
          { chamorro: 'Guåhan', english: 'Guam', pronunciation: 'GWAH-hahn' },
        ]
      },
      {
        id: 'p2',
        chamorro: 'I tata-hu si Pedro. I nana-hu si Rosa.',
        english: 'My father is Pedro. My mother is Rosa.',
        words: [
          { chamorro: 'I', english: 'the', pronunciation: 'ee' },
          { chamorro: 'tata-hu', english: 'my father', pronunciation: 'TAH-tah-hoo' },
          { chamorro: 'si', english: '(name marker)', pronunciation: 'see' },
          { chamorro: 'Pedro', english: 'Pedro (name)', pronunciation: 'PEH-droh' },
          { chamorro: 'nana-hu', english: 'my mother', pronunciation: 'NAH-nah-hoo' },
          { chamorro: 'Rosa', english: 'Rosa (name)', pronunciation: 'ROH-sah' },
        ]
      },
      {
        id: 'p3',
        chamorro: 'Guaha un che\'lu-hu palao\'an yan un che\'lu-hu låhi.',
        english: 'I have one sister and one brother.',
        words: [
          { chamorro: 'Guaha', english: 'there is/I have', pronunciation: 'GWAH-hah' },
          { chamorro: 'un', english: 'one/a', pronunciation: 'oon' },
          { chamorro: 'che\'lu-hu', english: 'my sibling', pronunciation: 'CHEH-loo-hoo' },
          { chamorro: 'palao\'an', english: 'woman/female', pronunciation: 'pah-lah-OH-ahn' },
          { chamorro: 'yan', english: 'and', pronunciation: 'dzahn' },
          { chamorro: 'låhi', english: 'man/male', pronunciation: 'LAH-hee' },
        ]
      },
      {
        id: 'p4',
        chamorro: 'Hu guaiya i familia-hu!',
        english: 'I love my family!',
        words: [
          { chamorro: 'Hu', english: 'I (subject)', pronunciation: 'hoo' },
          { chamorro: 'guaiya', english: 'love', pronunciation: 'GWAI-dzah' },
          { chamorro: 'i', english: 'the', pronunciation: 'ee' },
          { chamorro: 'familia-hu', english: 'my family', pronunciation: 'fah-MEE-lee-ah-hoo' },
        ]
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'How do you say "my father" in Chamorro?',
        options: ['nana-hu', 'tata-hu', 'che\'lu-hu', 'familia-hu'],
        correctAnswer: 1,
        explanation: '"Tata-hu" means "my father." "Tata" is father, and "-hu" is the possessive suffix meaning "my."'
      },
      {
        id: 'q2',
        question: 'What does "che\'lu-hu palao\'an" mean?',
        options: ['My brother', 'My sister', 'My mother', 'My family'],
        correctAnswer: 1,
        explanation: '"Che\'lu" means sibling, and "palao\'an" means woman/female. Together they mean "my sister."'
      },
      {
        id: 'q3',
        question: 'How do you say "I love" in Chamorro?',
        options: ['Guaha', 'Ginen', 'Hu guaiya', 'Si Yu\'us ma\'åse\''],
        correctAnswer: 2,
        explanation: '"Hu guaiya" means "I love." "Hu" is the subject marker for "I" and "guaiya" means love.'
      },
    ]
  },
  {
    id: 'i-gima-hu',
    title: 'I Gima\'-hu',
    titleEnglish: 'My House',
    description: 'Learn words for rooms and household items',
    difficulty: 'beginner',
    readingTime: 3,
    wordCount: 38,
    icon: '🏠',
    culturalNote: 'Traditional Chamorro houses were built with thatched roofs and open sides to allow airflow in the tropical climate.',
    paragraphs: [
      {
        id: 'p1',
        chamorro: 'Este i gima\'-hu. Dånkolo i gima\'-hu.',
        english: 'This is my house. My house is big.',
        words: [
          { chamorro: 'Este', english: 'this', pronunciation: 'ES-teh' },
          { chamorro: 'i', english: 'the', pronunciation: 'ee' },
          { chamorro: 'gima\'-hu', english: 'my house', pronunciation: 'GEE-mah-hoo' },
          { chamorro: 'Dånkolo', english: 'big', pronunciation: 'DAHN-koh-loh' },
        ]
      },
      {
        id: 'p2',
        chamorro: 'Guaha tres kuåtto. Guaha un kusina yan un sala.',
        english: 'There are three bedrooms. There is one kitchen and one living room.',
        words: [
          { chamorro: 'Guaha', english: 'there is/are', pronunciation: 'GWAH-hah' },
          { chamorro: 'tres', english: 'three', pronunciation: 'tres' },
          { chamorro: 'kuåtto', english: 'room/bedroom', pronunciation: 'KWAH-toh' },
          { chamorro: 'un', english: 'one/a', pronunciation: 'oon' },
          { chamorro: 'kusina', english: 'kitchen', pronunciation: 'koo-SEE-nah' },
          { chamorro: 'yan', english: 'and', pronunciation: 'dzahn' },
          { chamorro: 'sala', english: 'living room', pronunciation: 'SAH-lah' },
        ]
      },
      {
        id: 'p3',
        chamorro: 'I kuåtto-hu dikike\'. Lila i kulot-ña.',
        english: 'My room is small. Its color is purple.',
        words: [
          { chamorro: 'kuåtto-hu', english: 'my room', pronunciation: 'KWAH-toh-hoo' },
          { chamorro: 'dikike\'', english: 'small', pronunciation: 'dee-KEE-kay' },
          { chamorro: 'Lila', english: 'purple', pronunciation: 'LEE-lah' },
          { chamorro: 'kulot-ña', english: 'its color', pronunciation: 'KOO-loht-nyah' },
        ]
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'What does "gima\'" mean?',
        options: ['Room', 'House', 'Kitchen', 'Family'],
        correctAnswer: 1,
        explanation: '"Gima\'" means house. "Gima\'-hu" means "my house."'
      },
      {
        id: 'q2',
        question: 'How many bedrooms does the house have?',
        options: ['One', 'Two', 'Three', 'Four'],
        correctAnswer: 2,
        explanation: 'The story says "Guaha tres kuåtto" - there are three bedrooms.'
      },
      {
        id: 'q3',
        question: 'What does "dikike\'" mean?',
        options: ['Big', 'Small', 'Purple', 'Beautiful'],
        correctAnswer: 1,
        explanation: '"Dikike\'" means small. The opposite is "dånkolo" (big).'
      },
    ]
  },
];

// ============================================
// INTERMEDIATE STORIES
// ============================================

const intermediateStories: Story[] = [
  {
    id: 'i-taotaomona',
    title: 'I Taotao Mo\'na',
    titleEnglish: 'The Ancestral Spirits',
    description: 'Learn about the spirits of Chamorro ancestors',
    difficulty: 'intermediate',
    readingTime: 5,
    wordCount: 65,
    icon: '👻',
    culturalNote: 'Taotao Mo\'na are believed to be the spirits of ancient Chamorros. They are said to live in the jungle and can be helpful or harmful depending on how you treat their land.',
    paragraphs: [
      {
        id: 'p1',
        chamorro: 'I Taotao Mo\'na siha mañainå-ta ni\' mañåsaga gi halom tåno\'.',
        english: 'The Taotao Mo\'na are our ancestors who live in the jungle.',
        words: [
          { chamorro: 'I', english: 'the', pronunciation: 'ee' },
          { chamorro: 'Taotao', english: 'people/person', pronunciation: 'tow-TOW' },
          { chamorro: 'Mo\'na', english: 'before/ancient', pronunciation: 'MOH-nah' },
          { chamorro: 'siha', english: 'they (plural)', pronunciation: 'SEE-hah' },
          { chamorro: 'mañainå-ta', english: 'our parents/ancestors', pronunciation: 'mah-nyai-NAH-tah' },
          { chamorro: 'ni\'', english: 'who/which', pronunciation: 'nee' },
          { chamorro: 'mañåsaga', english: 'live/reside', pronunciation: 'mah-NYAH-sah-gah' },
          { chamorro: 'gi', english: 'at/in', pronunciation: 'gee' },
          { chamorro: 'halom', english: 'inside', pronunciation: 'HAH-lom' },
          { chamorro: 'tåno\'', english: 'land/jungle', pronunciation: 'TAH-noh' },
        ]
      },
      {
        id: 'p2',
        chamorro: 'Yanggen un hånao para i halom tåno\', debi di un fangågao lisensa.',
        english: 'When you go to the jungle, you must ask permission.',
        words: [
          { chamorro: 'Yanggen', english: 'if/when', pronunciation: 'DZAHNG-gen' },
          { chamorro: 'un', english: 'you', pronunciation: 'oon' },
          { chamorro: 'hånao', english: 'go', pronunciation: 'HAH-now' },
          { chamorro: 'para', english: 'to/for', pronunciation: 'PAH-rah' },
          { chamorro: 'halom', english: 'inside', pronunciation: 'HAH-lom' },
          { chamorro: 'tåno\'', english: 'land/jungle', pronunciation: 'TAH-noh' },
          { chamorro: 'debi', english: 'must/should', pronunciation: 'DEH-bee' },
          { chamorro: 'di', english: '(linking particle)', pronunciation: 'dee' },
          { chamorro: 'fangågao', english: 'ask for', pronunciation: 'fahn-GAH-gow' },
          { chamorro: 'lisensa', english: 'permission', pronunciation: 'lee-SEN-sah' },
        ]
      },
      {
        id: 'p3',
        chamorro: 'Sångan: "Guella yan Guello, dispensa yu\'. Malago\' yu\' humanao."',
        english: 'Say: "Grandmother and Grandfather, excuse me. I want to pass through."',
        words: [
          { chamorro: 'Sångan', english: 'say/speak', pronunciation: 'SAHNG-ahn' },
          { chamorro: 'Guella', english: 'grandmother', pronunciation: 'GWELL-ah' },
          { chamorro: 'yan', english: 'and', pronunciation: 'dzahn' },
          { chamorro: 'Guello', english: 'grandfather', pronunciation: 'GWELL-oh' },
          { chamorro: 'dispensa', english: 'excuse/pardon', pronunciation: 'dees-PEN-sah' },
          { chamorro: 'yu\'', english: 'me', pronunciation: 'dzoo' },
          { chamorro: 'Malago\'', english: 'want', pronunciation: 'mah-LAH-goh' },
          { chamorro: 'humanao', english: 'to go/pass', pronunciation: 'hoo-MAH-now' },
        ]
      },
      {
        id: 'p4',
        chamorro: 'Yanggen un rispeta siha, siha para u protehiyi hao.',
        english: 'If you respect them, they will protect you.',
        words: [
          { chamorro: 'Yanggen', english: 'if/when', pronunciation: 'DZAHNG-gen' },
          { chamorro: 'un', english: 'you', pronunciation: 'oon' },
          { chamorro: 'rispeta', english: 'respect', pronunciation: 'rees-PEH-tah' },
          { chamorro: 'siha', english: 'them', pronunciation: 'SEE-hah' },
          { chamorro: 'para', english: 'will', pronunciation: 'PAH-rah' },
          { chamorro: 'u', english: '(future marker)', pronunciation: 'oo' },
          { chamorro: 'protehiyi', english: 'protect', pronunciation: 'proh-teh-HEE-dzee' },
          { chamorro: 'hao', english: 'you', pronunciation: 'how' },
        ]
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Who are the Taotao Mo\'na?',
        options: ['Modern Chamorros', 'Ancestral spirits', 'Forest animals', 'Ocean spirits'],
        correctAnswer: 1,
        explanation: 'Taotao Mo\'na are the spirits of ancient Chamorro ancestors who are believed to live in the jungle.'
      },
      {
        id: 'q2',
        question: 'What should you do before entering the jungle?',
        options: ['Bring food', 'Ask permission', 'Make noise', 'Run quickly'],
        correctAnswer: 1,
        explanation: 'You should ask permission by saying "Guella yan Guello, dispensa yu\'" - addressing the ancestral spirits.'
      },
      {
        id: 'q3',
        question: 'What does "rispeta" mean?',
        options: ['Protect', 'Love', 'Respect', 'Fear'],
        correctAnswer: 2,
        explanation: '"Rispeta" means respect. The story teaches that respecting the Taotao Mo\'na will bring their protection.'
      },
    ]
  },
  {
    id: 'i-fiesta',
    title: 'I Fiestas Chamorro',
    titleEnglish: 'Chamorro Fiestas',
    description: 'Learn about traditional Chamorro village celebrations',
    difficulty: 'intermediate',
    readingTime: 5,
    wordCount: 72,
    icon: '🎉',
    culturalNote: 'Village fiestas are annual celebrations honoring patron saints. They feature traditional food, music, and bring the community together.',
    paragraphs: [
      {
        id: 'p1',
        chamorro: 'I fiestas Chamorro un impottånte na tradision.',
        english: 'Chamorro fiestas are an important tradition.',
        words: [
          { chamorro: 'I', english: 'the', pronunciation: 'ee' },
          { chamorro: 'fiestas', english: 'fiestas/celebrations', pronunciation: 'fee-ES-tahs' },
          { chamorro: 'Chamorro', english: 'Chamorro', pronunciation: 'chah-MOH-roh' },
          { chamorro: 'un', english: 'a/an', pronunciation: 'oon' },
          { chamorro: 'impottånte', english: 'important', pronunciation: 'eem-poh-TAHN-teh' },
          { chamorro: 'na', english: '(linking particle)', pronunciation: 'nah' },
          { chamorro: 'tradision', english: 'tradition', pronunciation: 'trah-dee-see-OHN' },
        ]
      },
      {
        id: 'p2',
        chamorro: 'Kada songsong gai patron santos-ña. Kada såkkan, manelebra i fiestas.',
        english: 'Every village has its patron saint. Every year, they celebrate the fiesta.',
        words: [
          { chamorro: 'Kada', english: 'every/each', pronunciation: 'KAH-dah' },
          { chamorro: 'songsong', english: 'village', pronunciation: 'SONG-song' },
          { chamorro: 'gai', english: 'has/have', pronunciation: 'gai' },
          { chamorro: 'patron', english: 'patron', pronunciation: 'PAH-trohn' },
          { chamorro: 'santos-ña', english: 'its saint', pronunciation: 'SAHN-tohs-nyah' },
          { chamorro: 'såkkan', english: 'year', pronunciation: 'SAHK-kahn' },
          { chamorro: 'manelebra', english: 'celebrate', pronunciation: 'mah-neh-LEH-brah' },
        ]
      },
      {
        id: 'p3',
        chamorro: 'Gi fiesta, guaha meggai na nengkånno\': kelaguen, red rice, yan kåddo.',
        english: 'At the fiesta, there is a lot of food: kelaguen, red rice, and soup.',
        words: [
          { chamorro: 'Gi', english: 'at/in', pronunciation: 'gee' },
          { chamorro: 'fiesta', english: 'fiesta', pronunciation: 'fee-ES-tah' },
          { chamorro: 'guaha', english: 'there is', pronunciation: 'GWAH-hah' },
          { chamorro: 'meggai', english: 'many/a lot', pronunciation: 'MEG-gai' },
          { chamorro: 'na', english: '(linking)', pronunciation: 'nah' },
          { chamorro: 'nengkånno\'', english: 'food', pronunciation: 'neng-KAHN-noh' },
          { chamorro: 'kelaguen', english: 'kelaguen (citrus-cured meat)', pronunciation: 'keh-lah-GWEN' },
          { chamorro: 'red rice', english: 'red rice', pronunciation: 'red rice' },
          { chamorro: 'yan', english: 'and', pronunciation: 'dzahn' },
          { chamorro: 'kåddo', english: 'soup/stew', pronunciation: 'KAHD-doh' },
        ]
      },
      {
        id: 'p4',
        chamorro: 'I familia yan amigo siha mañetne gi lamasa. Magof i taotao siha!',
        english: 'Family and friends sit at the table. The people are happy!',
        words: [
          { chamorro: 'familia', english: 'family', pronunciation: 'fah-MEE-lee-ah' },
          { chamorro: 'amigo', english: 'friend', pronunciation: 'ah-MEE-goh' },
          { chamorro: 'siha', english: 'they (plural)', pronunciation: 'SEE-hah' },
          { chamorro: 'mañetne', english: 'sit (plural)', pronunciation: 'mah-NYET-neh' },
          { chamorro: 'gi', english: 'at', pronunciation: 'gee' },
          { chamorro: 'lamasa', english: 'table', pronunciation: 'lah-MAH-sah' },
          { chamorro: 'Magof', english: 'happy', pronunciation: 'MAH-gof' },
          { chamorro: 'taotao', english: 'people', pronunciation: 'tow-TOW' },
        ]
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'What does each village have?',
        options: ['A beach', 'A patron saint', 'A school', 'A market'],
        correctAnswer: 1,
        explanation: 'Each village (songsong) has its own patron saint (patron santos), and the fiesta celebrates that saint.'
      },
      {
        id: 'q2',
        question: 'What is "kelaguen"?',
        options: ['A drink', 'A dance', 'A citrus-cured meat dish', 'A type of rice'],
        correctAnswer: 2,
        explanation: 'Kelaguen is a traditional Chamorro dish made with citrus-cured meat (usually chicken, beef, or seafood).'
      },
      {
        id: 'q3',
        question: 'What does "magof" mean?',
        options: ['Hungry', 'Tired', 'Happy', 'Full'],
        correctAnswer: 2,
        explanation: '"Magof" means happy. At fiestas, people are happy (magof) celebrating together.'
      },
    ]
  },
];

// ============================================
// ADVANCED STORIES
// ============================================

const advancedStories: Story[] = [
  {
    id: 'i-latte-stones',
    title: 'I Haligi yan i Tasa',
    titleEnglish: 'The Latte Stones',
    description: 'Learn about the ancient stone pillars of the Mariana Islands',
    difficulty: 'advanced',
    readingTime: 6,
    wordCount: 85,
    icon: '🗿',
    culturalNote: 'Latte stones are ancient stone pillars that supported the houses of high-ranking Chamorros. They are a symbol of Chamorro heritage and can be found throughout the Mariana Islands.',
    paragraphs: [
      {
        id: 'p1',
        chamorro: 'I Latte siha un antigu na estuktutå gi Islas Mariånas. Manmafa\'tinas ni\' i mañainå-ta.',
        english: 'Latte stones are ancient structures in the Mariana Islands. They were made by our ancestors.',
        words: [
          { chamorro: 'Latte', english: 'latte stones', pronunciation: 'LAH-teh' },
          { chamorro: 'siha', english: 'they (plural marker)', pronunciation: 'SEE-hah' },
          { chamorro: 'un', english: 'a/an', pronunciation: 'oon' },
          { chamorro: 'antigu', english: 'ancient', pronunciation: 'ahn-TEE-goo' },
          { chamorro: 'na', english: '(linking)', pronunciation: 'nah' },
          { chamorro: 'estuktutå', english: 'structure', pronunciation: 'es-took-TOO-tah' },
          { chamorro: 'gi', english: 'in/at', pronunciation: 'gee' },
          { chamorro: 'Islas', english: 'islands', pronunciation: 'EES-lahs' },
          { chamorro: 'Mariånas', english: 'Marianas', pronunciation: 'mah-ree-AH-nahs' },
          { chamorro: 'Manmafa\'tinas', english: 'were made', pronunciation: 'mahn-mah-fah-TEE-nahs' },
          { chamorro: 'ni\'', english: 'by', pronunciation: 'nee' },
          { chamorro: 'mañainå-ta', english: 'our ancestors', pronunciation: 'mah-nyai-NAH-tah' },
        ]
      },
      {
        id: 'p2',
        chamorro: 'Dos påtte gi Latte: i haligi yan i tasa. I haligi i pilon. I tasa i ulo.',
        english: 'There are two parts to the Latte: the pillar and the capstone. The haligi is the pillar. The tasa is the head.',
        words: [
          { chamorro: 'Dos', english: 'two', pronunciation: 'dohs' },
          { chamorro: 'påtte', english: 'part', pronunciation: 'PAHT-teh' },
          { chamorro: 'haligi', english: 'pillar/post', pronunciation: 'hah-LEE-gee' },
          { chamorro: 'tasa', english: 'cup/capstone', pronunciation: 'TAH-sah' },
          { chamorro: 'pilon', english: 'pillar', pronunciation: 'pee-LOHN' },
          { chamorro: 'ulo', english: 'head', pronunciation: 'OO-loh' },
        ]
      },
      {
        id: 'p3',
        chamorro: 'I Latte siha manggågaige gi halom tåno\' yan gi kånton tåsi.',
        english: 'Latte stones are found in the jungle and by the seashore.',
        words: [
          { chamorro: 'manggågaige', english: 'are located/found', pronunciation: 'mahng-gah-GAI-geh' },
          { chamorro: 'halom', english: 'inside', pronunciation: 'HAH-lom' },
          { chamorro: 'tåno\'', english: 'land/jungle', pronunciation: 'TAH-noh' },
          { chamorro: 'kånton', english: 'edge/shore', pronunciation: 'KAHN-tohn' },
          { chamorro: 'tåsi', english: 'sea/ocean', pronunciation: 'TAH-see' },
        ]
      },
      {
        id: 'p4',
        chamorro: 'I Latte un simbolo para i Chamorro siha. Manrespeta hit i kutturå-ta.',
        english: 'The Latte is a symbol for the Chamorro people. We respect our culture.',
        words: [
          { chamorro: 'simbolo', english: 'symbol', pronunciation: 'seem-BOH-loh' },
          { chamorro: 'para', english: 'for', pronunciation: 'PAH-rah' },
          { chamorro: 'Chamorro', english: 'Chamorro', pronunciation: 'chah-MOH-roh' },
          { chamorro: 'Manrespeta', english: 'respect (we)', pronunciation: 'mahn-res-PEH-tah' },
          { chamorro: 'hit', english: 'we', pronunciation: 'hit' },
          { chamorro: 'kutturå-ta', english: 'our culture', pronunciation: 'koo-too-RAH-tah' },
        ]
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'What are the two parts of a Latte stone?',
        options: ['Head and body', 'Haligi and tasa', 'Top and bottom', 'Stone and wood'],
        correctAnswer: 1,
        explanation: 'A Latte stone has two parts: the haligi (pillar) and the tasa (capstone/head).'
      },
      {
        id: 'q2',
        question: 'Where can Latte stones be found?',
        options: ['Only in museums', 'In the jungle and by the sea', 'Only in Guam', 'Underground'],
        correctAnswer: 1,
        explanation: 'Latte stones are found in the jungle (halom tåno\') and by the seashore (kånton tåsi).'
      },
      {
        id: 'q3',
        question: 'What do Latte stones represent?',
        options: ['Modern buildings', 'A symbol of Chamorro heritage', 'Spanish colonization', 'American influence'],
        correctAnswer: 1,
        explanation: 'Latte stones are a symbol (simbolo) of Chamorro culture and heritage.'
      },
    ]
  },
];

// ============================================
// STORY CATEGORIES
// ============================================

export const STORY_CATEGORIES: StoryCategory[] = [
  {
    id: 'beginner',
    title: 'Beginner',
    description: 'Simple stories with common words',
    icon: '🌟',
    stories: beginnerStories,
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    description: 'Cultural stories with more vocabulary',
    icon: '📚',
    stories: intermediateStories,
  },
  {
    id: 'advanced',
    title: 'Advanced',
    description: 'Complex stories with rich vocabulary',
    icon: '🎓',
    stories: advancedStories,
  },
];

// Helper to get all stories
export function getAllStories(): Story[] {
  return STORY_CATEGORIES.flatMap(cat => cat.stories);
}

// Helper to get story by ID
export function getStoryById(id: string): Story | undefined {
  return getAllStories().find(story => story.id === id);
}

// Helper to get total story count
export function getStoryCount(): number {
  return getAllStories().length;
}

