// Conversation Practice Scenarios for Chamorro Language Learning

export interface UsefulPhrase {
  chamorro: string;
  english: string;
  pronunciation?: string;
}

export interface ConversationScenario {
  id: string;
  title: string;
  titleChamorro: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string;
  setting: string; // Scene description for the AI
  characterName: string;
  characterRole: string;
  objectives: string[]; // What the user should accomplish
  usefulPhrases: UsefulPhrase[];
  openingLine: {
    chamorro: string;
    english: string;
  };
  estimatedTurns: number; // Expected conversation length
}

export const conversationScenarios: ConversationScenario[] = [
  // BEGINNER SCENARIOS
  {
    id: 'meeting-someone',
    title: 'Meeting Someone New',
    titleChamorro: 'Ineyak Taotao',
    description: 'Practice introductions and basic greetings at a fiesta',
    difficulty: 'beginner',
    icon: '👋',
    setting: 'You are at a village fiesta in Guam. You meet a friendly local named Maria who wants to get to know you.',
    characterName: 'Maria',
    characterRole: 'A friendly woman from the village',
    objectives: [
      'Greet Maria properly',
      'Introduce yourself (name)',
      'Ask how she is doing',
      'Tell her where you are from'
    ],
    usefulPhrases: [
      { chamorro: 'Håfa Adai!', english: 'Hello!', pronunciation: 'HAH-fah ah-DYE' },
      { chamorro: 'I na\'ån-hu si...', english: 'My name is...', pronunciation: 'ee NAH-an-hoo see' },
      { chamorro: 'Kao maolek hao?', english: 'How are you?', pronunciation: 'kow mow-LECK how' },
      { chamorro: 'Maolek yu\'', english: 'I am fine', pronunciation: 'mow-LECK dzoo' },
      { chamorro: 'Ginen manu hao?', english: 'Where are you from?', pronunciation: 'GEE-nen MAH-noo how' },
    ],
    openingLine: {
      chamorro: 'Håfa Adai! Bunitu na ha\'åni på\'go, no? Håyi hao?',
      english: 'Hello! Beautiful day today, right? Who are you?'
    },
    estimatedTurns: 5
  },
  {
    id: 'ordering-food',
    title: 'At a Restaurant',
    titleChamorro: 'Gi Restorån',
    description: 'Order food and drinks at a local Chamorro restaurant',
    difficulty: 'beginner',
    icon: '🍽️',
    setting: 'You are at a small Chamorro restaurant. The waiter, Tun Jose, comes to take your order.',
    characterName: 'Tun Jose',
    characterRole: 'A friendly elderly waiter',
    objectives: [
      'Greet the waiter',
      'Ask what food is available',
      'Order something to eat',
      'Order something to drink',
      'Say thank you'
    ],
    usefulPhrases: [
      { chamorro: 'Håfa tatatmånu?', english: 'What do you have?', pronunciation: 'HAH-fah tah-taht-MAH-noo' },
      { chamorro: 'Malago\' yu\'...', english: 'I want...', pronunciation: 'mah-LAH-go dzoo' },
      { chamorro: 'kelaguen', english: 'kelaguen (meat dish)', pronunciation: 'keh-lah-GWEN' },
      { chamorro: 'hineksa\' agaga\'', english: 'red rice', pronunciation: 'hee-NECK-sah ah-GAH-gah' },
      { chamorro: 'hånom', english: 'water', pronunciation: 'HAH-nom' },
      { chamorro: 'Si Yu\'os Ma\'åse\'', english: 'Thank you', pronunciation: 'see DZOOS mah-AH-seh' },
    ],
    openingLine: {
      chamorro: 'Håfa Adai! Bienbenidu gi restorån-måmi. Håfa malago\'-mu på\'go?',
      english: 'Hello! Welcome to our restaurant. What would you like today?'
    },
    estimatedTurns: 6
  },
  {
    id: 'market-shopping',
    title: 'Shopping at the Market',
    titleChamorro: 'Mamåhan gi Merkådu',
    description: 'Buy fruits and vegetables at a local market',
    difficulty: 'beginner',
    icon: '🛒',
    setting: 'You are at the Dededo Flea Market. A vendor named Tan Maria is selling fresh fruits and vegetables.',
    characterName: 'Tan Maria',
    characterRole: 'A market vendor selling produce',
    objectives: [
      'Greet the vendor',
      'Ask about prices',
      'Buy some fruit or vegetables',
      'Use numbers for quantities',
      'Pay and say goodbye'
    ],
    usefulPhrases: [
      { chamorro: 'Kuånto este?', english: 'How much is this?', pronunciation: 'KWAN-toh ES-teh' },
      { chamorro: 'Dos', english: 'Two', pronunciation: 'dohs' },
      { chamorro: 'Tres', english: 'Three', pronunciation: 'trehs' },
      { chamorro: 'mångga', english: 'mango', pronunciation: 'MAHNG-gah' },
      { chamorro: 'papåya', english: 'papaya', pronunciation: 'pah-PAH-yah' },
      { chamorro: 'Båsta', english: 'Enough/That\'s all', pronunciation: 'BAH-stah' },
    ],
    openingLine: {
      chamorro: 'Håfa Adai! Månnge\' i fruta siha på\'go. Håfa un nesesita?',
      english: 'Hello! The fruits are delicious today. What do you need?'
    },
    estimatedTurns: 6
  },

  // INTERMEDIATE SCENARIOS
  {
    id: 'visiting-family',
    title: 'Visiting Grandparents',
    titleChamorro: 'Bisita i Bihu yan Biha',
    description: 'Have a conversation with your grandparents at their home',
    difficulty: 'intermediate',
    icon: '👴',
    setting: 'You are visiting your grandmother (Biha) at her home in the village. She is happy to see you and wants to catch up.',
    characterName: 'Biha',
    characterRole: 'Your grandmother',
    objectives: [
      'Greet your grandmother respectfully',
      'Ask how she is feeling',
      'Talk about your family',
      'Accept an offer of food',
      'Show respect and gratitude'
    ],
    usefulPhrases: [
      { chamorro: 'Buenas tåtdes, Biha', english: 'Good afternoon, Grandmother', pronunciation: 'BWEH-nahs TAHT-dehs BEE-hah' },
      { chamorro: 'Kao maolek hamyo?', english: 'Are you well? (respectful)', pronunciation: 'kow mow-LECK HAM-dzoh' },
      { chamorro: 'Hunggan', english: 'Yes', pronunciation: 'HOONG-gahn' },
      { chamorro: 'Åhe\'', english: 'No', pronunciation: 'AH-heh' },
      { chamorro: 'Gof månnge\'!', english: 'Very delicious!', pronunciation: 'gof MAHNG-eh' },
      { chamorro: 'Hu guaiya hao', english: 'I love you', pronunciation: 'hoo GWAI-dzah how' },
    ],
    openingLine: {
      chamorro: 'Ai, hågu guihi! Håfa Adai, neni! Måtto hao! Kao ñålang hao? Guaha nengkånno\'.',
      english: 'Oh, there you are! Hello, dear! You came! Are you hungry? There\'s food.'
    },
    estimatedTurns: 7
  },
  {
    id: 'asking-directions',
    title: 'Asking for Directions',
    titleChamorro: 'Faisen Direksion',
    description: 'Ask a local for directions to a place in the village',
    difficulty: 'intermediate',
    icon: '🗺️',
    setting: 'You are lost in Hagåtña and need to find the church. You ask a local man named Tun Pedro for help.',
    characterName: 'Tun Pedro',
    characterRole: 'A helpful local elder',
    objectives: [
      'Politely ask for help',
      'Explain where you want to go',
      'Understand basic directions',
      'Thank them for their help'
    ],
    usefulPhrases: [
      { chamorro: 'Dispensa yu\'', english: 'Excuse me', pronunciation: 'dees-PEN-sah dzoo' },
      { chamorro: 'Manu nai gaigi...?', english: 'Where is...?', pronunciation: 'MAH-noo nai GYE-gee' },
      { chamorro: 'i guma\' Yu\'os', english: 'the church', pronunciation: 'ee GOO-mah DZOOS' },
      { chamorro: 'agupa\'', english: 'right', pronunciation: 'ah-GOO-pah' },
      { chamorro: 'akague\'', english: 'left', pronunciation: 'ah-kah-GWAY' },
      { chamorro: 'tuhu', english: 'straight', pronunciation: 'TOO-hoo' },
    ],
    openingLine: {
      chamorro: 'Håfa Adai! Kao siña hu ayuda hao? Manli\'e\' hao palaoan.',
      english: 'Hello! Can I help you? You look lost.'
    },
    estimatedTurns: 6
  },

  // ADVANCED SCENARIOS
  {
    id: 'fiesta-conversation',
    title: 'At a Village Fiesta',
    titleChamorro: 'Gi Gipot',
    description: 'Have a cultural conversation at a traditional Chamorro fiesta',
    difficulty: 'advanced',
    icon: '🎉',
    setting: 'You are at a village fiesta celebrating a patron saint day. You meet Tun Antonio, an elder who loves to share stories about Chamorro culture.',
    characterName: 'Tun Antonio',
    characterRole: 'A village elder and storyteller',
    objectives: [
      'Engage in cultural small talk',
      'Ask about Chamorro traditions',
      'Share something about yourself',
      'Use respectful language with an elder',
      'Express appreciation for the culture'
    ],
    usefulPhrases: [
      { chamorro: 'Bunitu i gipot', english: 'The fiesta is beautiful', pronunciation: 'boo-NEE-too ee GEE-pot' },
      { chamorro: 'Håfa i kustumbren Chamorro?', english: 'What is the Chamorro custom?', pronunciation: 'HAH-fah ee koos-TOOM-bren chah-MOH-roh' },
      { chamorro: 'Hu tungo\' didide\'', english: 'I know a little', pronunciation: 'hoo TOONG-oh dee-DEE-deh' },
      { chamorro: 'Fa\'nå\'gue yu\'', english: 'Teach me', pronunciation: 'fah-NAH-gweh dzoo' },
      { chamorro: 'Gof interesånte', english: 'Very interesting', pronunciation: 'gof een-teh-reh-SAHN-teh' },
    ],
    openingLine: {
      chamorro: 'Håfa Adai, patgon! Maolek na un bisita i gipot. Esta un chagi i kelaguen? Gof månnge\'!',
      english: 'Hello, young one! Good that you visited the fiesta. Have you tried the kelaguen yet? It\'s very delicious!'
    },
    estimatedTurns: 8
  },
  {
    id: 'phone-call',
    title: 'Phone Conversation',
    titleChamorro: 'Kombetsasion gi Telefon',
    description: 'Practice a phone conversation with a family member',
    difficulty: 'advanced',
    icon: '📞',
    setting: 'Your aunt (Tia Rosa) calls you on the phone to check in and invite you to a family gathering.',
    characterName: 'Tia Rosa',
    characterRole: 'Your aunt calling on the phone',
    objectives: [
      'Answer the phone properly',
      'Engage in phone small talk',
      'Understand an invitation',
      'Respond to the invitation',
      'End the call politely'
    ],
    usefulPhrases: [
      { chamorro: 'Hålu', english: 'Hello (on phone)', pronunciation: 'HAH-loo' },
      { chamorro: 'Håyi este?', english: 'Who is this?', pronunciation: 'HAH-yee ES-teh' },
      { chamorro: 'Kao siña hao måtto?', english: 'Can you come?', pronunciation: 'kow SEE-nyah how MAHT-toh' },
      { chamorro: 'Hunggan, bai hu hanao', english: 'Yes, I will go', pronunciation: 'HOONG-gahn, bye hoo HAH-now' },
      { chamorro: 'Asta agupa\'', english: 'See you tomorrow', pronunciation: 'AHS-tah ah-GOO-pah' },
      { chamorro: 'Adios', english: 'Goodbye', pronunciation: 'ah-DYOHS' },
    ],
    openingLine: {
      chamorro: 'Hålu? Hågu guihi? Este si Tia Rosa. Kao maolek hao, neni?',
      english: 'Hello? Is that you? This is Aunt Rosa. Are you well, dear?'
    },
    estimatedTurns: 7
  }
];

export const getScenarioById = (id: string): ConversationScenario | undefined => {
  return conversationScenarios.find(s => s.id === id);
};

export const getScenariosByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): ConversationScenario[] => {
  return conversationScenarios.filter(s => s.difficulty === difficulty);
};

