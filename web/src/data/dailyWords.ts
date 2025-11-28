// Daily Word/Phrase data
// Rotates based on day of year (365 days coverage)

export interface DailyWord {
  chamorro: string;
  english: string;
  pronunciation: string;
  example?: {
    chamorro: string;
    english: string;
  };
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const DAILY_WORDS: DailyWord[] = [
  // === GREETINGS (Days 1-10) ===
  {
    chamorro: 'Håfa Adai',
    english: 'Hello / Hi',
    pronunciation: 'HAH-fah ah-DIE',
    example: {
      chamorro: 'Håfa Adai! Håfa tatatmanu hao?',
      english: 'Hello! How are you?'
    },
    category: 'Greetings',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Si Yu\'os Ma\'åse\'',
    english: 'Thank you',
    pronunciation: 'see YOO-os mah-AH-seh',
    example: {
      chamorro: 'Si Yu\'os Ma\'åse\' para i ayudu.',
      english: 'Thank you for the help.'
    },
    category: 'Greetings',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Buenas dias',
    english: 'Good morning',
    pronunciation: 'BWAY-nahs DEE-ahs',
    example: {
      chamorro: 'Buenas dias, nåna!',
      english: 'Good morning, mom!'
    },
    category: 'Greetings',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Buenas tåtdes',
    english: 'Good afternoon',
    pronunciation: 'BWAY-nahs TAHT-des',
    category: 'Greetings',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Buenas noches',
    english: 'Good evening / Good night',
    pronunciation: 'BWAY-nahs NOH-ches',
    category: 'Greetings',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Adios',
    english: 'Goodbye',
    pronunciation: 'ah-dee-OHS',
    example: {
      chamorro: 'Adios, asta agupa\'!',
      english: 'Goodbye, see you tomorrow!'
    },
    category: 'Greetings',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Håfa tatatmånu hao?',
    english: 'How are you?',
    pronunciation: 'HAH-fah tah-taht-MAH-noo how',
    example: {
      chamorro: 'Håfa tatatmånu hao på\'go?',
      english: 'How are you today?'
    },
    category: 'Greetings',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Maolek ha\' yu\'',
    english: 'I\'m fine / I\'m good',
    pronunciation: 'mah-OH-lek hah yoo',
    category: 'Greetings',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Dispensa yu\'',
    english: 'Excuse me / Sorry',
    pronunciation: 'dis-PEN-sah yoo',
    example: {
      chamorro: 'Dispensa yu\', siña hu mamaisen?',
      english: 'Excuse me, may I ask?'
    },
    category: 'Greetings',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Pot fabot',
    english: 'Please',
    pronunciation: 'poht fah-BOHT',
    example: {
      chamorro: 'Pot fabot, na\'i yu\' hånom.',
      english: 'Please, give me water.'
    },
    category: 'Greetings',
    difficulty: 'beginner'
  },

  // === FAMILY (Days 11-20) ===
  {
    chamorro: 'Nåna',
    english: 'Mother / Mom',
    pronunciation: 'NAH-nah',
    example: {
      chamorro: 'I nåna-hu gof bunita.',
      english: 'My mother is very beautiful.'
    },
    category: 'Family',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Tåta',
    english: 'Father / Dad',
    pronunciation: 'TAH-tah',
    example: {
      chamorro: 'I tåta-hu mañocho.',
      english: 'My father is eating.'
    },
    category: 'Family',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Che\'lu',
    english: 'Sibling (brother/sister)',
    pronunciation: 'CHEH-loo',
    example: {
      chamorro: 'Guaha dos che\'lu-hu.',
      english: 'I have two siblings.'
    },
    category: 'Family',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Bihu',
    english: 'Grandfather',
    pronunciation: 'BEE-hoo',
    category: 'Family',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Biha',
    english: 'Grandmother',
    pronunciation: 'BEE-hah',
    example: {
      chamorro: 'I biha-hu gof måolek.',
      english: 'My grandmother is very kind.'
    },
    category: 'Family',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Påtgon',
    english: 'Child',
    pronunciation: 'PAHT-gon',
    example: {
      chamorro: 'I påtgon mangguifi.',
      english: 'The child is sleeping.'
    },
    category: 'Family',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Tiu',
    english: 'Uncle',
    pronunciation: 'TEE-oo',
    category: 'Family',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Tia',
    english: 'Aunt',
    pronunciation: 'TEE-ah',
    category: 'Family',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Asagua',
    english: 'Spouse (husband/wife)',
    pronunciation: 'ah-SAH-gwah',
    example: {
      chamorro: 'I asagua-hu guiya i che\'lu-hu.',
      english: 'My spouse loves my sibling.'
    },
    category: 'Family',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Familia',
    english: 'Family',
    pronunciation: 'fah-MEE-lee-ah',
    example: {
      chamorro: 'I familia-hu dånkolo.',
      english: 'My family is big.'
    },
    category: 'Family',
    difficulty: 'beginner'
  },

  // === FOOD & DRINK (Days 21-30) ===
  {
    chamorro: 'Hånom',
    english: 'Water',
    pronunciation: 'HAH-nom',
    example: {
      chamorro: 'Kao malago\' hao hånom?',
      english: 'Do you want water?'
    },
    category: 'Food',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Hineksa\'',
    english: 'Cooked rice',
    pronunciation: 'hee-NEK-sah',
    example: {
      chamorro: 'Hu guaiya hineksa\' yan kåtne.',
      english: 'I love rice and meat.'
    },
    category: 'Food',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Guihan',
    english: 'Fish',
    pronunciation: 'GWEE-han',
    example: {
      chamorro: 'I guihan fresku.',
      english: 'The fish is fresh.'
    },
    category: 'Food',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Kåtne',
    english: 'Meat',
    pronunciation: 'KAHT-neh',
    category: 'Food',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Niyok',
    english: 'Coconut',
    pronunciation: 'NEE-yok',
    example: {
      chamorro: 'I niyok mames.',
      english: 'The coconut is sweet.'
    },
    category: 'Food',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Kelaguen',
    english: 'Grilled meat dish with lemon',
    pronunciation: 'keh-lah-GWEN',
    example: {
      chamorro: 'Hu cho\'gue kelaguen mannok.',
      english: 'I made chicken kelaguen.'
    },
    category: 'Food',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Fina\'denne\'',
    english: 'Hot sauce/condiment',
    pronunciation: 'fee-nah-DEN-neh',
    example: {
      chamorro: 'Na\'i yu\' fina\'denne\', pot fabot.',
      english: 'Give me fina\'denne\', please.'
    },
    category: 'Food',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Mannok',
    english: 'Chicken',
    pronunciation: 'MAHN-nok',
    category: 'Food',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Babui',
    english: 'Pig / Pork',
    pronunciation: 'bah-BOO-ee',
    example: {
      chamorro: 'I babui dånkolo.',
      english: 'The pig is big.'
    },
    category: 'Food',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Chotda',
    english: 'Banana',
    pronunciation: 'CHOHT-dah',
    category: 'Food',
    difficulty: 'beginner'
  },

  // === NUMBERS (Days 31-40) ===
  {
    chamorro: 'Unu',
    english: 'One (1)',
    pronunciation: 'OO-noo',
    example: {
      chamorro: 'Unu ha\' na kareta.',
      english: 'Only one car.'
    },
    category: 'Numbers',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Dos',
    english: 'Two (2)',
    pronunciation: 'dohs',
    example: {
      chamorro: 'Dos na ga\'lågu.',
      english: 'Two dogs.'
    },
    category: 'Numbers',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Tres',
    english: 'Three (3)',
    pronunciation: 'trehs',
    example: {
      chamorro: 'Guaha tres na påtgon.',
      english: 'There are three children.'
    },
    category: 'Numbers',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Kuåttro',
    english: 'Four (4)',
    pronunciation: 'KWAH-troh',
    category: 'Numbers',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Singko',
    english: 'Five (5)',
    pronunciation: 'SING-koh',
    example: {
      chamorro: 'Singko minutos.',
      english: 'Five minutes.'
    },
    category: 'Numbers',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Sais',
    english: 'Six (6)',
    pronunciation: 'sah-EES',
    category: 'Numbers',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Siette',
    english: 'Seven (7)',
    pronunciation: 'see-EH-teh',
    category: 'Numbers',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Ocho',
    english: 'Eight (8)',
    pronunciation: 'OH-choh',
    category: 'Numbers',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Nuebe',
    english: 'Nine (9)',
    pronunciation: 'NWEH-beh',
    category: 'Numbers',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Dies',
    english: 'Ten (10)',
    pronunciation: 'dee-EHS',
    example: {
      chamorro: 'Dies na åños.',
      english: 'Ten years.'
    },
    category: 'Numbers',
    difficulty: 'beginner'
  },

  // === COLORS (Days 41-48) ===
  {
    chamorro: 'Agaga\'',
    english: 'Red',
    pronunciation: 'ah-GAH-gah',
    example: {
      chamorro: 'I kareta agaga\'.',
      english: 'The car is red.'
    },
    category: 'Colors',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Asut',
    english: 'Blue',
    pronunciation: 'ah-SOOT',
    example: {
      chamorro: 'I tåsi asut.',
      english: 'The ocean is blue.'
    },
    category: 'Colors',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Betde',
    english: 'Green',
    pronunciation: 'BET-deh',
    category: 'Colors',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Amariyu',
    english: 'Yellow',
    pronunciation: 'ah-mah-REE-yoo',
    category: 'Colors',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Å\'paka\'',
    english: 'White',
    pronunciation: 'AH-pah-kah',
    category: 'Colors',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Attelong',
    english: 'Black',
    pronunciation: 'ah-TEH-long',
    category: 'Colors',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Kulot kahel',
    english: 'Orange (color)',
    pronunciation: 'KOO-lot KAH-hel',
    category: 'Colors',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Rosa',
    english: 'Pink',
    pronunciation: 'ROH-sah',
    category: 'Colors',
    difficulty: 'beginner'
  },

  // === COMMON PHRASES (Days 49-60) ===
  {
    chamorro: 'Hunggan',
    english: 'Yes',
    pronunciation: 'HOONG-gahn',
    category: 'Phrases',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Åhe\'',
    english: 'No',
    pronunciation: 'AH-heh',
    category: 'Phrases',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Hu guaiya hao',
    english: 'I love you',
    pronunciation: 'hoo GWAI-dzah how',
    example: {
      chamorro: 'Hu guaiya hao, nåna.',
      english: 'I love you, mom.'
    },
    category: 'Phrases',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Kao siña?',
    english: 'Is it possible? / Can I?',
    pronunciation: 'kow SEEN-yah',
    example: {
      chamorro: 'Kao siña hu ayuda hao?',
      english: 'Can I help you?'
    },
    category: 'Phrases',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Ti hu komprende',
    english: 'I don\'t understand',
    pronunciation: 'tee hoo kom-PREN-deh',
    category: 'Phrases',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Håyi na\'ån-mu?',
    english: 'What is your name?',
    pronunciation: 'HIGH nah-AHN-moo',
    example: {
      chamorro: 'Håyi na\'ån-mu, påtgon?',
      english: 'What is your name, child?'
    },
    category: 'Phrases',
    difficulty: 'beginner'
  },
  {
    chamorro: 'I na\'ån-hu si...',
    english: 'My name is...',
    pronunciation: 'ee nah-AHN-hoo see',
    category: 'Phrases',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Mångge guma\'-mu?',
    english: 'Where is your house?',
    pronunciation: 'MAHNG-geh GOO-mah-moo',
    category: 'Phrases',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Ginen månu hao?',
    english: 'Where are you from?',
    pronunciation: 'GEE-nen MAH-noo how',
    category: 'Phrases',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Biba!',
    english: 'Hooray! / Cheers!',
    pronunciation: 'BEE-bah',
    example: {
      chamorro: 'Biba Guåhan!',
      english: 'Hooray for Guam!'
    },
    category: 'Phrases',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Asta agupa\'',
    english: 'See you tomorrow',
    pronunciation: 'AHS-tah ah-GOO-pah',
    category: 'Phrases',
    difficulty: 'beginner'
  },
  {
    chamorro: 'Asta månu',
    english: 'See you later',
    pronunciation: 'AHS-tah MAH-noo',
    category: 'Phrases',
    difficulty: 'beginner'
  },

  // === INTERMEDIATE & ADVANCED (Days 61-75) ===
  {
    chamorro: 'Håfa na bidå-mu?',
    english: 'What are you doing?',
    pronunciation: 'HAH-fah nah bee-DAH-moo',
    example: {
      chamorro: 'Håfa na bidå-mu på\'go?',
      english: 'What are you doing now?'
    },
    category: 'Phrases',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Magåhet',
    english: 'True / Real / Honest',
    pronunciation: 'mah-GAH-het',
    example: {
      chamorro: 'Magåhet i sinangan-ña.',
      english: 'What he/she said is true.'
    },
    category: 'Phrases',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Manmåolek hit',
    english: 'We are fine / We are good',
    pronunciation: 'mahn-MAH-oh-lek hit',
    category: 'Phrases',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Kao un komprende?',
    english: 'Do you understand?',
    pronunciation: 'kow oon kom-PREN-deh',
    category: 'Phrases',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Gof maolek',
    english: 'Very good / Excellent',
    pronunciation: 'gohf mah-OH-lek',
    example: {
      chamorro: 'Gof maolek i cho\'cho\'-mu!',
      english: 'Your work is excellent!'
    },
    category: 'Phrases',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Munga mamahlao',
    english: 'Don\'t be shy / embarrassed',
    pronunciation: 'MOONG-ah mah-MAH-lao',
    category: 'Phrases',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Hågu gue\' i mas bunitu',
    english: 'You are the most beautiful',
    pronunciation: 'HAH-goo gweh ee mahs boo-NEE-too',
    category: 'Phrases',
    difficulty: 'advanced'
  },
  {
    chamorro: 'Esta hu tungo\'',
    english: 'I already know',
    pronunciation: 'EHS-tah hoo TOONG-oh',
    example: {
      chamorro: 'Esta hu tungo\' i ineppe.',
      english: 'I already know the answer.'
    },
    category: 'Phrases',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Tåya\' problema',
    english: 'No problem',
    pronunciation: 'TAH-dzah proh-BLEH-mah',
    category: 'Phrases',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Chålek',
    english: 'To laugh / Laughter',
    pronunciation: 'CHAH-lek',
    example: {
      chamorro: 'Gof ya-hu chumalek.',
      english: 'I really like to laugh.'
    },
    category: 'Verbs',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Fanague',
    english: 'To teach',
    pronunciation: 'fah-NAH-gweh',
    example: {
      chamorro: 'Hu fanague i patgon.',
      english: 'I teach the child.'
    },
    category: 'Verbs',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Inafa\'maolek',
    english: 'To make peace / Interdependence',
    pronunciation: 'ee-nah-fah-mah-OH-lek',
    example: {
      chamorro: 'I inafa\'maolek importånte gi kuttura-ta.',
      english: 'Interdependence is important in our culture.'
    },
    category: 'Culture',
    difficulty: 'advanced'
  },
  {
    chamorro: 'Respetu',
    english: 'Respect',
    pronunciation: 'res-PEH-too',
    example: {
      chamorro: 'Na\'i respetu i mañaina-mu.',
      english: 'Give respect to your elders.'
    },
    category: 'Culture',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Mañaina',
    english: 'Elders / Parents',
    pronunciation: 'mah-NYAI-nah',
    example: {
      chamorro: 'I mañaina-hu gof maolek.',
      english: 'My parents are very kind.'
    },
    category: 'Family',
    difficulty: 'intermediate'
  },
  {
    chamorro: 'Håfa taimanu i tiempo?',
    english: 'How is the weather?',
    pronunciation: 'HAH-fah tai-MAH-noo ee tee-EHM-poh',
    example: {
      chamorro: 'Håfa taimanu i tiempo på\'go?',
      english: 'How is the weather today?'
    },
    category: 'Phrases',
    difficulty: 'advanced'
  },
];

/**
 * Get today's word based on the day of the year
 * Cycles through all words, repeating after exhausting the list
 */
export function getTodaysWord(): DailyWord {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  // Cycle through words based on day of year
  const index = dayOfYear % DAILY_WORDS.length;
  return DAILY_WORDS[index];
}

/**
 * Get a specific word by index (for testing or browsing history)
 */
export function getWordByIndex(index: number): DailyWord {
  return DAILY_WORDS[index % DAILY_WORDS.length];
}

/**
 * Get total number of words
 */
export function getTotalWords(): number {
  return DAILY_WORDS.length;
}

