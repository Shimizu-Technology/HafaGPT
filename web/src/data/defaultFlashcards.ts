export interface DefaultFlashcard {
  front: string;
  back: string;
  pronunciation?: string;
  example?: string;
}

export interface DefaultFlashcardDeck {
  topic: string;
  displayName: string;
  description: string;
  cards: DefaultFlashcard[];
}

export const DEFAULT_FLASHCARD_DECKS: Record<string, DefaultFlashcardDeck> = {
  greetings: {
    topic: 'greetings',
    displayName: 'Greetings & Basics',
    description: 'Essential greetings and basic phrases',
    cards: [
      {
        front: 'Håfa Adai',
        back: 'Hello / Hi / Greetings',
        pronunciation: 'HAH-fah ah-DIE'
      },
      {
        front: 'Håfa tatatmånu hao?',
        back: 'How are you?',
        pronunciation: 'HAH-fah tah-taht-MAH-noo how'
      },
      {
        front: 'Maolek ha\' yu\'',
        back: 'I\'m fine / I\'m good',
        pronunciation: 'mah-oh-LEK hah yoo'
      },
      {
        front: 'Si Yu\'os Ma\'åse\'',
        back: 'Thank you',
        pronunciation: 'see YOO-os mah-AH-see'
      },
      {
        front: 'Buenas yan hågu',
        back: 'Good (day) to you / Hello',
        pronunciation: 'BWAY-nahs yahn HAH-goo'
      },
      {
        front: 'Adios',
        back: 'Goodbye',
        pronunciation: 'ah-dee-OHS'
      },
      {
        front: 'Bula',
        back: 'Goodbye (informal)',
        pronunciation: 'BOO-lah'
      },
      {
        front: 'Håyi na\'ån-mu?',
        back: 'What is your name?',
        pronunciation: 'HIGH nah-AHN-moo'
      },
      {
        front: 'I na\'ån-hu si...',
        back: 'My name is...',
        pronunciation: 'ee nah-AHN-hoo see'
      },
      {
        front: 'Kao siña un ayuda yu\'?',
        back: 'Can you help me?',
        pronunciation: 'kah-oh SEEN-yah oon ah-YOO-dah yoo'
      },
      {
        front: 'Mañana si Yu\'os',
        back: 'Good morning',
        pronunciation: 'mah-NYAH-nah see YOO-ohs'
      },
      {
        front: 'Buenas tatdes',
        back: 'Good afternoon',
        pronunciation: 'BWAY-nahs TAHT-dehs'
      },
      {
        front: 'Buenas noches',
        back: 'Good evening/night',
        pronunciation: 'BWAY-nahs NOH-chehs'
      },
      {
        front: 'Buenas dias',
        back: 'Good morning',
        pronunciation: 'BWAY-nahs DEE-ahs'
      }
    ]
  },

  numbers: {
    topic: 'numbers',
    displayName: 'Numbers (1-10)',
    description: 'Learn to count from 1 to 10 in Chamorro',
    cards: [
      {
        front: 'Unu',
        back: 'One (1)',
        pronunciation: 'OO-noo'
      },
      {
        front: 'Dos',
        back: 'Two (2)',
        pronunciation: 'DOHS'
      },
      {
        front: 'Tres',
        back: 'Three (3)',
        pronunciation: 'TREHS'
      },
      {
        front: 'Kuåttro',
        back: 'Four (4)',
        pronunciation: 'KWAH-troh'
      },
      {
        front: 'Sinku',
        back: 'Five (5)',
        pronunciation: 'SEEN-koo'
      },
      {
        front: 'Sais',
        back: 'Six (6)',
        pronunciation: 'SICE'
      },
      {
        front: 'Siete',
        back: 'Seven (7)',
        pronunciation: 'see-EH-teh'
      },
      {
        front: 'Ocho',
        back: 'Eight (8)',
        pronunciation: 'OH-choh'
      },
      {
        front: 'Nuebe',
        back: 'Nine (9)',
        pronunciation: 'NWEH-beh'
      },
      {
        front: 'Dies',
        back: 'Ten (10)',
        pronunciation: 'dee-EHS'
      }
    ]
  },

  family: {
    topic: 'family',
    displayName: 'Family Terms',
    description: 'Common family relationship words',
    cards: [
      {
        front: 'Familia',
        back: 'Family',
        pronunciation: 'fah-MEE-lee-ah'
      },
      {
        front: 'Nana',
        back: 'Mother / Mom',
        pronunciation: 'NAH-nah'
      },
      {
        front: 'Tata',
        back: 'Father / Dad',
        pronunciation: 'TAH-tah'
      },
      {
        front: 'Lahi',
        back: 'Son / Boy',
        pronunciation: 'LAH-hee'
      },
      {
        front: 'Haga',
        back: 'Daughter / Girl',
        pronunciation: 'HAH-gah'
      },
      {
        front: 'Che\'lu',
        back: 'Sibling / Brother / Sister',
        pronunciation: 'CHEH-loo'
      },
      {
        front: 'Biha',
        back: 'Grandmother / Grandma',
        pronunciation: 'BEE-hah'
      },
      {
        front: 'Bihu',
        back: 'Grandfather / Grandpa',
        pronunciation: 'BEE-hoo'
      },
      {
        front: 'Asagua',
        back: 'Spouse / Husband / Wife',
        pronunciation: 'ah-sah-GWAH'
      },
      {
        front: 'Prima / Primu',
        back: 'Cousin (female/male)',
        pronunciation: 'PREE-mah / PREE-moo'
      },
      {
        front: 'Påtgon',
        back: 'Child',
        pronunciation: 'PAHT-gohn'
      },
      {
        front: 'Tiu',
        back: 'Uncle',
        pronunciation: 'TEE-oo'
      },
      {
        front: 'Tia',
        back: 'Aunt',
        pronunciation: 'TEE-ah'
      }
    ]
  },

  animals: {
    topic: 'animals',
    displayName: 'Animals',
    description: 'Common animals in Chamorro',
    cards: [
      {
        front: 'Ga\'lågu',
        back: 'Dog',
        pronunciation: 'gah-LAH-goo'
      },
      {
        front: 'Katu',
        back: 'Cat',
        pronunciation: 'KAH-too'
      },
      {
        front: 'Guihan',
        back: 'Fish',
        pronunciation: 'gwee-HAHN'
      },
      {
        front: 'Paluma',
        back: 'Bird',
        pronunciation: 'pah-LOO-mah'
      },
      {
        front: 'Babui',
        back: 'Pig',
        pronunciation: 'bah-BOO-ee'
      },
      {
        front: 'Karabao',
        back: 'Carabao / Water Buffalo',
        pronunciation: 'kah-rah-BAH-oh'
      },
      {
        front: 'Haggan',
        back: 'Turtle',
        pronunciation: 'HAHG-gahn'
      },
      {
        front: 'Ngånga\'',
        back: 'Duck',
        pronunciation: 'NGAHNG-ah'
      },
      {
        front: 'Ayuyu',
        back: 'Coconut Crab',
        pronunciation: 'ah-YOO-yoo'
      },
      {
        front: 'Månnok',
        back: 'Chicken',
        pronunciation: 'MAHN-nok'
      }
    ]
  },

  colors: {
    topic: 'colors',
    displayName: 'Colors',
    description: 'Basic color words in Chamorro',
    cards: [
      {
        front: 'Å\'paka\'',
        back: 'White',
        pronunciation: 'AH-pah-kah'
      },
      {
        front: 'Å\'tot',
        back: 'Black',
        pronunciation: 'AH-toht'
      },
      {
        front: 'Agaga\'',
        back: 'Red',
        pronunciation: 'ah-GAH-gah'
      },
      {
        front: 'Åmariyu',
        back: 'Yellow',
        pronunciation: 'ah-mah-REE-yoo'
      },
      {
        front: 'Asut',
        back: 'Blue',
        pronunciation: 'ah-SOOT'
      },
      {
        front: 'Betde',
        back: 'Green',
        pronunciation: 'BEHT-deh'
      },
      {
        front: 'Såksan',
        back: 'Brown',
        pronunciation: 'SAHK-sahn'
      },
      {
        front: 'Rosa',
        back: 'Pink',
        pronunciation: 'ROH-sah'
      },
      {
        front: 'Gris',
        back: 'Gray',
        pronunciation: 'GREES'
      },
      {
        front: 'Lalala',
        back: 'Orange',
        pronunciation: 'lah-LAH-lah'
      }
    ]
  },

  phrases: {
    topic: 'phrases',
    displayName: 'Common Phrases',
    description: 'Useful everyday expressions',
    cards: [
      {
        front: 'Hunggan',
        back: 'Yes',
        pronunciation: 'HOONG-gahn'
      },
      {
        front: 'Åhe\'',
        back: 'No',
        pronunciation: 'AH-heh'
      },
      {
        front: 'Hu guaiya hao',
        back: 'I love you',
        pronunciation: 'hoo gwah-EE-yah how'
      },
      {
        front: 'Dispensa yu\'',
        back: 'Excuse me / I\'m sorry',
        pronunciation: 'dees-PEN-sah yoo'
      },
      {
        front: 'Ti hu komprende',
        back: 'I don\'t understand',
        pronunciation: 'tee hoo kohm-PREN-deh'
      },
      {
        front: 'Pot fabot',
        back: 'Please',
        pronunciation: 'poht fah-BOHT'
      },
      {
        front: 'Kao siña un ayuda yu\'?',
        back: 'Can you help me?',
        pronunciation: 'kah-oh SEEN-yah oon ah-YOO-dah yoo'
      },
      {
        front: 'Mångge ginen hao?',
        back: 'Where are you from?',
        pronunciation: 'MAHNG-gheh GEE-nen how'
      },
      {
        front: 'Ti hu tungo\'',
        back: 'I don\'t know',
        pronunciation: 'tee hoo TOON-goh'
      },
      {
        front: 'Maila\'',
        back: 'Come here',
        pronunciation: 'my-LAH'
      }
    ]
  },

  'common-phrases': {
    topic: 'common-phrases',
    displayName: 'Everyday Phrases',
    description: 'Useful expressions for daily life',
    cards: [
      {
        front: 'Buen prubechu',
        back: 'Enjoy your meal / Bon appetit',
        pronunciation: 'BWEN proh-BEH-choo',
        example: 'Said before eating or to someone dining'
      },
      {
        front: 'Kao siña un tulaika?',
        back: 'Can you repeat that?',
        pronunciation: 'kah-oh SEEN-yah oon too-lah-EE-kah',
        example: 'When you didn\'t hear or understand'
      },
      {
        front: 'Ti hu tungo\'',
        back: 'I don\'t know',
        pronunciation: 'tee hoo TOON-goh',
        example: 'Common response when unsure'
      },
      {
        front: 'Dispensa yu\'',
        back: 'Excuse me / I\'m sorry',
        pronunciation: 'dees-PEN-sah yoo',
        example: 'Polite way to apologize or get attention'
      },
      {
        front: 'Maila\'',
        back: 'Come here',
        pronunciation: 'my-LAH',
        example: 'Casual invitation to approach'
      },
      {
        front: 'Fan hånao hit',
        back: 'Let\'s go',
        pronunciation: 'fahn HAH-now heet',
        example: 'When ready to leave or start something'
      },
      {
        front: 'Guahu',
        back: 'Me / I (emphatic)',
        pronunciation: 'gwah-HOO',
        example: 'Used for emphasis: "It\'s me!"'
      },
      {
        front: 'Kao guåha?',
        back: 'Is there? / Do you have?',
        pronunciation: 'kah-oh GWAH-hah',
        example: 'Asking about availability'
      },
      {
        front: 'Ti siña',
        back: 'Cannot / Not possible',
        pronunciation: 'tee SEEN-yah',
        example: 'When something isn\'t feasible'
      },
      {
        front: 'Pot fabot',
        back: 'Please',
        pronunciation: 'poht fah-BOHT',
        example: 'Polite requests'
      }
    ]
  },

  body: {
    topic: 'body',
    displayName: 'Body Parts',
    description: 'Parts of the body in Chamorro',
    cards: [
      {
        front: 'Ulu',
        back: 'Head',
        pronunciation: 'OO-loo'
      },
      {
        front: 'Mata',
        back: 'Eye / Eyes',
        pronunciation: 'MAH-tah'
      },
      {
        front: 'Talanga',
        back: 'Ear / Ears',
        pronunciation: 'tah-LAHNG-gah'
      },
      {
        front: 'Guihan',
        back: 'Nose',
        pronunciation: 'gwee-HAHN'
      },
      {
        front: 'Pachot',
        back: 'Mouth',
        pronunciation: 'pah-CHOHT'
      },
      {
        front: 'Kannai',
        back: 'Hand / Hands',
        pronunciation: 'kahn-NIGH'
      },
      {
        front: 'Adeng',
        back: 'Arm / Arms',
        pronunciation: 'ah-DENG'
      },
      {
        front: 'På\'å',
        back: 'Leg / Legs',
        pronunciation: 'PAH-ah'
      },
      {
        front: 'Addeng',
        back: 'Foot / Feet',
        pronunciation: 'ahd-DENG'
      },
      {
        front: 'Tian',
        back: 'Stomach / Belly',
        pronunciation: 'tee-AHN'
      }
    ]
  },

  food: {
    topic: 'food',
    displayName: 'Food & Cooking',
    description: 'Meals, ingredients, cooking terms',
    cards: [
      {
        front: 'Kånno\'',
        back: 'Food',
        pronunciation: 'KAHN-noh'
      },
      {
        front: 'Hineksa\'',
        back: 'Rice (cooked)',
        pronunciation: 'hee-NEHK-sah'
      },
      {
        front: 'Guihan',
        back: 'Fish',
        pronunciation: 'gwee-HAHN'
      },
      {
        front: 'Kåtne',
        back: 'Meat',
        pronunciation: 'KAHT-neh'
      },
      {
        front: 'Månha',
        back: 'Chicken',
        pronunciation: 'MAHN-hah'
      },
      {
        front: 'Kådu',
        back: 'Soup / Stew',
        pronunciation: 'KAH-doo'
      },
      {
        front: 'Lechuga',
        back: 'Lettuce / Vegetables',
        pronunciation: 'leh-CHOO-gah'
      },
      {
        front: 'Hånom',
        back: 'Water',
        pronunciation: 'HAH-nohm'
      },
      {
        front: 'Kafé',
        back: 'Coffee',
        pronunciation: 'kah-FEH'
      },
      {
        front: 'Niyok',
        back: 'Coconut',
        pronunciation: 'nee-YOHK'
      },
      {
        front: 'Kelaguen',
        back: 'Grilled dish with lemon',
        pronunciation: 'keh-lah-GWEN'
      },
      {
        front: 'Fina\'denne\'',
        back: 'Hot sauce / Condiment',
        pronunciation: 'fee-nah-DEN-neh'
      }
    ]
  },

  verbs: {
    topic: 'verbs',
    displayName: 'Common Verbs',
    description: 'Action words and doing words',
    cards: [
      {
        front: 'Hu li\'e\'',
        back: 'I see / I saw',
        pronunciation: 'hoo LEE-eh'
      },
      {
        front: 'Hu hungok',
        back: 'I hear / I heard',
        pronunciation: 'hoo HOON-gohk'
      },
      {
        front: 'Hu hånao',
        back: 'I go / I went',
        pronunciation: 'hoo HAH-now'
      },
      {
        front: 'Hu cho\'gue',
        back: 'I do / I make',
        pronunciation: 'hoo CHOH-gweh'
      },
      {
        front: 'Hu kånno\'',
        back: 'I eat',
        pronunciation: 'hoo KAHN-noh'
      },
      {
        front: 'Hu gimen',
        back: 'I drink',
        pronunciation: 'hoo GEE-men'
      },
      {
        front: 'Hu maigo\'',
        back: 'I sleep',
        pronunciation: 'hoo my-GOH'
      },
      {
        front: 'Hu fåhan',
        back: 'I speak / I say',
        pronunciation: 'hoo FAH-hahn'
      },
      {
        front: 'Hu guaiya',
        back: 'I love',
        pronunciation: 'hoo gwah-EE-yah'
      },
      {
        front: 'Hu tungo\'',
        back: 'I know / I understand',
        pronunciation: 'hoo TOON-goh'
      }
    ]
  }
};

// Helper to get all available topics
export const getAvailableTopics = (): string[] => {
  return Object.keys(DEFAULT_FLASHCARD_DECKS);
};

// Helper to check if a topic has default cards
export const hasDefaultCards = (topic: string): boolean => {
  return topic in DEFAULT_FLASHCARD_DECKS;
};

// Helper to get default cards for a topic
export const getDefaultCards = (topic: string): DefaultFlashcard[] | null => {
  return DEFAULT_FLASHCARD_DECKS[topic]?.cards || null;
};

