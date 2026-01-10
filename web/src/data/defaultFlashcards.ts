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
        pronunciation: 'HAW-fah tah-taht-MAW-noo how'
      },
      {
        front: 'Maolek ha\' yu\'',
        back: 'I\'m fine / I\'m good',
        pronunciation: 'mah-oh-LEK hah dzoo'
      },
      {
        front: 'Si Yu\'os Ma\'åse\'',
        back: 'Thank you',
        pronunciation: 'see DZOO-ohs mah-AW-seh'
      },
      {
        front: 'Buenas yan hågu',
        back: 'Good (day) to you / Hello',
        pronunciation: 'BWAY-nahs dzahn HAH-goo'
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
        pronunciation: 'HAW-dzee nah-AHN-moo'
      },
      {
        front: 'I na\'ån-hu si...',
        back: 'My name is...',
        pronunciation: 'ee nah-AHN-hoo see'
      },
      {
        front: 'Kao siña un ayuda yu\'?',
        back: 'Can you help me?',
        pronunciation: 'kah-oh SEEN-yah oon ah-DZOO-dah dzoo'
      },
      {
        front: 'Mañana si Yu\'os',
        back: 'Good morning',
        pronunciation: 'mah-NYAH-nah see DZOO-ohs'
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
        front: 'Uno',
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
        pronunciation: 'ah-DZOO-dzoo'
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
        pronunciation: 'aw-mah-REE-dzoo'
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
        pronunciation: 'hoo gwah-EE-dzah how'
      },
      {
        front: 'Dispensa yu\'',
        back: 'Excuse me / I\'m sorry',
        pronunciation: 'dees-PEN-sah dzoo'
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
        pronunciation: 'kah-oh SEEN-yah oon ah-DZOO-dah dzoo'
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
        pronunciation: 'dees-PEN-sah dzoo',
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
        front: 'Gui\'eng',
        back: 'Nose',
        pronunciation: 'GWEE-eng'
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
        front: 'Bråsu',
        back: 'Arm / Arms',
        pronunciation: 'BRAH-soo'
      },
      {
        front: 'Addeng',
        back: 'Foot / Feet / Leg',
        pronunciation: 'ahd-DENG'
      },
      {
        front: 'Kueyu',
        back: 'Neck / Nape',
        pronunciation: 'KWEH-dzoo'
      },
      {
        front: 'Korason',
        back: 'Heart',
        pronunciation: 'koh-rah-SOHN'
      },
      {
        front: 'Tuyan',
        back: 'Stomach / Belly',
        pronunciation: 'TOO-dzahn'
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
        pronunciation: 'nee-DZOHK'
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
        pronunciation: 'hoo gwah-EE-dzah'
      },
      {
        front: 'Hu tungo\'',
        back: 'I know / I understand',
        pronunciation: 'hoo TOON-goh'
      }
    ]
  },

  // INTERMEDIATE LEVEL DECKS

  questions: {
    topic: 'questions',
    displayName: 'Question Words',
    description: 'Learn to ask who, what, where, when, why, how',
    cards: [
      {
        front: 'Håfa',
        back: 'What',
        pronunciation: 'HAH-fah',
        example: 'Håfa na\'ån-ña? — What is his/her name?'
      },
      {
        front: 'Hayi',
        back: 'Who',
        pronunciation: 'HA-dzee',
        example: 'Hayi ennao? — Who is that?'
      },
      {
        front: 'Manu',
        back: 'Where / Which',
        pronunciation: 'MAH-noo',
        example: 'Manu nai gaige hao? — Where are you?'
      },
      {
        front: 'Ngai\'an',
        back: 'When',
        pronunciation: 'ngai-AHN',
        example: 'Ngai\'an un fatto? — When did you come?'
      },
      {
        front: 'Pot håfa',
        back: 'Why / For what',
        pronunciation: 'poht HAH-fah',
        example: 'Pot håfa un hånao? — Why did you go?'
      },
      {
        front: 'Tatatmånu / Håfa tatatmånu',
        back: 'How',
        pronunciation: 'tah-taht-MAW-noo',
        example: 'Håfa tatatmånu hao? — How are you?'
      },
      {
        front: 'Kuåntu',
        back: 'How many / How much',
        pronunciation: 'KWAHN-too',
        example: 'Kuåntu i presiu? — How much is the price?'
      },
      {
        front: 'Håyi',
        back: 'Whose',
        pronunciation: 'HAW-dzee',
        example: 'Håyi kareta ennao? — Whose car is that?'
      },
      {
        front: 'Kao',
        back: 'Is it? / Do you? (question marker)',
        pronunciation: 'KAH-oh',
        example: 'Kao malago\' hao? — Do you want?'
      },
      {
        front: 'Hafa bidå-mu?',
        back: 'What are you doing?',
        pronunciation: 'HAH-fah bee-DAH-moo',
        example: 'Common way to ask what someone is up to'
      }
    ]
  },

  days: {
    topic: 'days',
    displayName: 'Days of the Week',
    description: 'Learn the days of the week in Chamorro',
    cards: [
      {
        front: 'Dåmenggo',
        back: 'Sunday',
        pronunciation: 'dah-MENG-goh',
        example: 'The traditional first day of the week'
      },
      {
        front: 'Lunes',
        back: 'Monday',
        pronunciation: 'LOO-nehs',
        example: 'From Spanish "Lunes"'
      },
      {
        front: 'Måttes',
        back: 'Tuesday',
        pronunciation: 'MAHT-tehs',
        example: 'From Spanish "Martes"'
      },
      {
        front: 'Metkoles',
        back: 'Wednesday',
        pronunciation: 'meht-KOH-lehs',
        example: 'From Spanish "Miércoles"'
      },
      {
        front: 'Huebes',
        back: 'Thursday',
        pronunciation: 'HWEH-behs',
        example: 'From Spanish "Jueves"'
      },
      {
        front: 'Betnes',
        back: 'Friday',
        pronunciation: 'BEHT-nehs',
        example: 'From Spanish "Viernes"'
      },
      {
        front: 'Såbalu',
        back: 'Saturday',
        pronunciation: 'SAH-bah-loo',
        example: 'From Spanish "Sábado"'
      },
      {
        front: 'På\'go na ha\'åni',
        back: 'Today',
        pronunciation: 'PAH-goh nah hah-AH-nee',
        example: 'Literally "this day"'
      },
      {
        front: 'Nigap',
        back: 'Yesterday',
        pronunciation: 'NEE-gahp',
        example: 'Håfa bidå-mu nigap? — What did you do yesterday?'
      },
      {
        front: 'Agupa\'',
        back: 'Tomorrow',
        pronunciation: 'ah-GOO-pah',
        example: 'Hu li\'e\' hao agupa\'. — I\'ll see you tomorrow.'
      }
    ]
  },

  months: {
    topic: 'months',
    displayName: 'Months of the Year',
    description: 'Learn the months and seasons in Chamorro',
    cards: [
      {
        front: 'Eneru',
        back: 'January',
        pronunciation: 'eh-NEH-roo',
        example: 'Traditional name: Tumaiguini'
      },
      {
        front: 'Febreru',
        back: 'February',
        pronunciation: 'feh-BREH-roo',
        example: 'Also spelled Fibreru'
      },
      {
        front: 'Mårso',
        back: 'March',
        pronunciation: 'MAHR-soh',
        example: 'Beginning of dry season'
      },
      {
        front: 'Abrit',
        back: 'April',
        pronunciation: 'AH-breet',
        example: 'From Spanish "Abril"'
      },
      {
        front: 'Måyu',
        back: 'May',
        pronunciation: 'MAW-dzoo',
        example: 'Month of fiestas and celebrations'
      },
      {
        front: 'Huniu',
        back: 'June',
        pronunciation: 'HOO-nee-oo',
        example: 'Liberation Day is June 21'
      },
      {
        front: 'Huliu',
        back: 'July',
        pronunciation: 'HOO-lee-oo',
        example: 'Start of rainy season (Umåtto)'
      },
      {
        front: 'Ågosto',
        back: 'August',
        pronunciation: 'ah-GOHS-toh',
        example: 'From Spanish "Agosto"'
      },
      {
        front: 'Septiembre',
        back: 'September',
        pronunciation: 'sehp-tee-EHM-breh',
        example: 'Peak typhoon season'
      },
      {
        front: 'Oktubre',
        back: 'October',
        pronunciation: 'ohk-TOO-breh',
        example: 'Traditional name: Faguålo\''
      },
      {
        front: 'Nobiembre',
        back: 'November',
        pronunciation: 'noh-bee-EHM-breh',
        example: 'Traditional name: Sumongsong'
      },
      {
        front: 'Disiembre',
        back: 'December',
        pronunciation: 'dee-see-EHM-breh',
        example: 'Festive season, Christmas celebrations'
      }
    ]
  },

  adjectives: {
    topic: 'adjectives',
    displayName: 'Describing Things',
    description: 'Adjectives for size, quality, and feelings',
    cards: [
      {
        front: 'Maolek',
        back: 'Good / Fine / Well',
        pronunciation: 'mah-OH-lehk',
        example: 'Maolek ha\' yu\'. — I\'m fine.'
      },
      {
        front: 'Båba',
        back: 'Bad / Wrong',
        pronunciation: 'BAH-bah',
        example: 'Båba ennao. — That\'s bad.'
      },
      {
        front: 'Bunitu',
        back: 'Beautiful / Handsome',
        pronunciation: 'boo-NEE-too',
        example: 'Bunitu i palao\'an. — The woman is beautiful.'
      },
      {
        front: 'Dånkolo',
        back: 'Big / Large',
        pronunciation: 'DAHN-koh-loh',
        example: 'Dånkolo i guma\'. — The house is big.'
      },
      {
        front: 'Dikike\'',
        back: 'Small / Little',
        pronunciation: 'dee-KEE-keh',
        example: 'Dikike\' i patgon. — The child is small.'
      },
      {
        front: 'Metgot',
        back: 'Strong',
        pronunciation: 'MEHT-goht',
        example: 'Metgot i taotao. — The person is strong.'
      },
      {
        front: 'Maipe',
        back: 'Hot (temperature)',
        pronunciation: 'my-PEH',
        example: 'Maipe i tiempo. — The weather is hot.'
      },
      {
        front: 'Manengheng',
        back: 'Cold',
        pronunciation: 'mah-neng-HENG',
        example: 'Manengheng i hånom. — The water is cold.'
      },
      {
        front: 'Nuebu',
        back: 'New',
        pronunciation: 'NWEH-boo',
        example: 'Nuebu i kareta. — The car is new.'
      },
      {
        front: 'Bihu',
        back: 'Old (things)',
        pronunciation: 'BEE-hoo',
        example: 'Bihu i sapatos. — The shoes are old.'
      },
      {
        front: 'Nahong',
        back: 'Enough / Sufficient',
        pronunciation: 'nah-HONG',
        example: 'Nahong i kånno\'. — The food is enough.'
      },
      {
        front: 'Chaddek',
        back: 'Fast / Quick',
        pronunciation: 'CHAHD-dehk',
        example: 'Chaddek i ga\'lågu. — The dog is fast.'
      }
    ]
  },

  sentences: {
    topic: 'sentences',
    displayName: 'Simple Sentences',
    description: 'Put words together to make sentences',
    cards: [
      {
        front: 'Guahu si...',
        back: 'I am... (introducing yourself)',
        pronunciation: 'GWAH-hoo see',
        example: 'Guahu si Juan. — I am Juan.'
      },
      {
        front: 'Malago\' yu\'',
        back: 'I want',
        pronunciation: 'mah-LAH-goh dzoo',
        example: 'Malago\' yu\' kånno\'. — I want food.'
      },
      {
        front: 'Ti malago\' yu\'',
        back: 'I don\'t want',
        pronunciation: 'tee mah-LAH-goh dzoo',
        example: 'Ti malago\' yu\' gimen. — I don\'t want a drink.'
      },
      {
        front: 'Siña yu\'',
        back: 'I can / I\'m able',
        pronunciation: 'SEEN-yah dzoo',
        example: 'Siña yu\' kuentos Chamorro. — I can speak Chamorro.'
      },
      {
        front: 'Ti siña',
        back: 'Cannot / Not possible',
        pronunciation: 'tee SEEN-yah',
        example: 'Ti siña yu\'. — I cannot.'
      },
      {
        front: 'Debi di',
        back: 'Must / Should / Have to',
        pronunciation: 'DEH-bee dee',
        example: 'Debi di un hånao. — You should go.'
      },
      {
        front: 'Gaige yu\' giya...',
        back: 'I am at/in...',
        pronunciation: 'GUY-geh dzoo GEE-dzah',
        example: 'Gaige yu\' giya Hagåtña. — I\'m in Hagåtña.'
      },
      {
        front: 'Guaha',
        back: 'There is / There are / Have',
        pronunciation: 'GWAH-hah',
        example: 'Guaha salape\'-hu. — I have money.'
      },
      {
        front: 'Taya\'',
        back: 'There is no / None / Don\'t have',
        pronunciation: 'TAH-dzah',
        example: 'Taya\' salape\'-hu. — I have no money.'
      },
      {
        front: 'Bai hu...',
        back: 'I will... (future)',
        pronunciation: 'buy hoo',
        example: 'Bai hu hånao agupa\'. — I will go tomorrow.'
      }
    ]
  },

  // ADVANCED LEVEL DECKS

  places: {
    topic: 'places',
    displayName: 'Places & Locations',
    description: 'Buildings, landmarks, and location phrases',
    cards: [
      {
        front: 'Guma\'',
        back: 'House / Home',
        pronunciation: 'GOO-mah',
        example: 'Dånkolo i guma\'. — The house is big.'
      },
      {
        front: 'Eskuela',
        back: 'School',
        pronunciation: 'ehs-KWEH-lah',
        example: 'Hu hånao para i eskuela. — I go to school.'
      },
      {
        front: 'Tenda',
        back: 'Store / Shop',
        pronunciation: 'TEHN-dah',
        example: 'Gaige i tenda gi chalan. — The store is on the road.'
      },
      {
        front: 'Guma\' Yu\'os',
        back: 'Church',
        pronunciation: 'GOO-mah DZOO-ohs',
        example: 'Bunitu i guma\' Yu\'os. — The church is beautiful.'
      },
      {
        front: 'Lancho',
        back: 'Farm / Ranch',
        pronunciation: 'LAHN-tso',
        example: 'Gaige i lancho gi hålom tåno\'. — The farm is in the countryside.'
      },
      {
        front: 'Ofisina',
        back: 'Office',
        pronunciation: 'oh-fee-SEE-nah',
        example: 'Hu cho\'gue gi ofisina. — I work at the office.'
      },
      {
        front: 'Espitat',
        back: 'Hospital',
        pronunciation: 'ehs-pee-TAHT',
        example: 'Malangu gui\' gi espitat. — He/she is sick at the hospital.'
      },
      {
        front: 'Plasa',
        back: 'Plaza / Town Square',
        pronunciation: 'PLAH-sah',
        example: 'Manbisita ham gi plasa. — We visited the plaza.'
      },
      {
        front: 'Chalan',
        back: 'Road / Street',
        pronunciation: 'TSAH-lahn',
        example: 'Ancho i chalan. — The road is wide.'
      },
      {
        front: 'Tåsi',
        back: 'Ocean / Sea',
        pronunciation: 'TAH-see',
        example: 'Bunitu i tåsi. — The ocean is beautiful.'
      }
    ]
  },

  weather: {
    topic: 'weather',
    displayName: 'Weather & Nature',
    description: 'Weather conditions and natural environment',
    cards: [
      {
        front: 'Atdao',
        back: 'Sun',
        pronunciation: 'aht-DOW',
        example: 'Maipe i atdao. — The sun is hot.'
      },
      {
        front: 'Uchan',
        back: 'Rain',
        pronunciation: 'OO-tsahn',
        example: 'Mañ\'uchan på\'go. — It\'s raining now.'
      },
      {
        front: 'Manglo\'',
        back: 'Wind',
        pronunciation: 'MAHNG-loh',
        example: 'Metgot i manglo\'. — The wind is strong.'
      },
      {
        front: 'Påkyo',
        back: 'Typhoon / Storm',
        pronunciation: 'PAHK-dzoh',
        example: 'Guaha påkyo agupa\'. — There\'s a typhoon tomorrow.'
      },
      {
        front: 'Tiempo',
        back: 'Weather / Time',
        pronunciation: 'tee-EHM-poh',
        example: 'Maolek i tiempo. — The weather is good.'
      },
      {
        front: 'Puti\'on',
        back: 'Star',
        pronunciation: 'poo-TEE-ohn',
        example: 'Bula puti\'on gi puengi. — There are many stars at night.'
      },
      {
        front: 'Pulan',
        back: 'Moon',
        pronunciation: 'POO-lahn',
        example: 'Dånkolo i pulan. — The moon is big.'
      },
      {
        front: 'Trongkon håyu',
        back: 'Tree',
        pronunciation: 'TRONG-kohn HAH-dzoo',
        example: 'Takhilo\' i trongkon håyu. — The tree is tall.'
      },
      {
        front: 'Flores',
        back: 'Flower',
        pronunciation: 'FLOH-rehs',
        example: 'Bunitu i flores. — The flower is beautiful.'
      },
      {
        front: 'Fanomnågan',
        back: 'Dry Season',
        pronunciation: 'fah-nohm-NAH-gahn',
        example: 'Maolek i tiempo gi fanomnågan. — The weather is good in dry season.'
      }
    ]
  },

  household: {
    topic: 'household',
    displayName: 'Home & Household',
    description: 'Rooms, furniture, and household items',
    cards: [
      {
        front: 'Kusina',
        back: 'Kitchen',
        pronunciation: 'koo-SEE-nah',
        example: 'Gaige i nengkånno\' gi kusina. — The food is in the kitchen.'
      },
      {
        front: 'Åpusento',
        back: 'Room / Bedroom',
        pronunciation: 'ah-poo-SEHN-toh',
        example: 'Dikike\' i åpusento. — The room is small.'
      },
      {
        front: 'Båño',
        back: 'Bathroom',
        pronunciation: 'BAH-nyoh',
        example: 'Månu nai gaige i båño? — Where is the bathroom?'
      },
      {
        front: 'Lamasa',
        back: 'Table',
        pronunciation: 'lah-MAH-sah',
        example: 'Pega gi lamasa. — Put it on the table.'
      },
      {
        front: 'Siya',
        back: 'Chair',
        pronunciation: 'SEE-dzah',
        example: 'Fatachong gi siya. — Sit on the chair.'
      },
      {
        front: 'Katre',
        back: 'Bed',
        pronunciation: 'KAH-treh',
        example: 'Nuebu i katre. — The bed is new.'
      },
      {
        front: 'Bentåna',
        back: 'Window',
        pronunciation: 'behn-TAH-nah',
        example: 'Baba i bentåna. — Open the window.'
      },
      {
        front: 'Petta / Potta',
        back: 'Door',
        pronunciation: 'PEHT-tah / POHT-tah',
        example: 'Båba i petta. — Close the door. (Both spellings are used)'
      },
      {
        front: 'Atof',
        back: 'Roof',
        pronunciation: 'AH-tohf',
        example: 'Må\'pos i atof. — The roof is gone/damaged.'
      },
      {
        front: 'Kahon',
        back: 'Box / Chest',
        pronunciation: 'KAH-hohn',
        example: 'Gaige gi hålom kahon. — It\'s inside the box.'
      }
    ]
  },

  directions: {
    topic: 'directions',
    displayName: 'Directions & Travel',
    description: 'Directions, movement, and transportation',
    cards: [
      {
        front: 'Agapa\'',
        back: 'Right (direction)',
        pronunciation: 'ah-GAH-pah',
        example: 'Bira agapa\'. — Turn right.'
      },
      {
        front: 'Akague',
        back: 'Left (direction)',
        pronunciation: 'ah-KAH-gweh',
        example: 'Bira akague. — Turn left.'
      },
      {
        front: 'Tåtte',
        back: 'Back / Behind',
        pronunciation: 'TAHT-teh',
        example: 'Gaige gi tåtte. — It\'s in the back.'
      },
      {
        front: 'Mo\'na',
        back: 'Front / Forward',
        pronunciation: 'MOH-nah',
        example: 'Hågu mo\'na. — You go ahead.'
      },
      {
        front: 'Hulo\'',
        back: 'Up / Above',
        pronunciation: 'HOO-loh',
        example: 'Gaige hulo\'. — It\'s up there.'
      },
      {
        front: 'Papa\'',
        back: 'Down / Below',
        pronunciation: 'PAH-pah',
        example: 'Gaige papa\'. — It\'s down there.'
      },
      {
        front: 'Magi',
        back: 'Here (come here)',
        pronunciation: 'MAH-gee',
        example: 'Mågi fan! — Come here please!'
      },
      {
        front: 'Guatu',
        back: 'There (over there)',
        pronunciation: 'GWAH-too',
        example: 'Hånao guatu. — Go over there.'
      },
      {
        front: 'Kareta',
        back: 'Car',
        pronunciation: 'kah-REH-tah',
        example: 'Nuebu i kareta. — The car is new.'
      },
      {
        front: 'Batko',
        back: 'Boat / Ship',
        pronunciation: 'BAHT-koh',
        example: 'Dånkolo i batko. — The boat is big.'
      }
    ]
  },

  shopping: {
    topic: 'shopping',
    displayName: 'Shopping & Money',
    description: 'Buying, selling, and money vocabulary',
    cards: [
      {
        front: 'Salåpe\'',
        back: 'Money',
        pronunciation: 'sah-LAH-peh',
        example: 'Guaha salåpe\'-hu. — I have money.'
      },
      {
        front: 'Fåhan',
        back: 'Buy / Purchase',
        pronunciation: 'FAH-hahn',
        example: 'Hu fåhan i kareta. — I bought the car.'
      },
      {
        front: 'Bende',
        back: 'Sell',
        pronunciation: 'BEHN-deh',
        example: 'Ha bende i guma\'. — He/she sold the house.'
      },
      {
        front: 'Presiu',
        back: 'Price',
        pronunciation: 'PREH-see-oo',
        example: 'Kuåntu i presiu? — How much is the price?'
      },
      {
        front: 'Båråtu',
        back: 'Cheap / Inexpensive',
        pronunciation: 'bah-RAH-too',
        example: 'Båråtu i kåmisa. — The shirt is cheap.'
      },
      {
        front: 'Guaguan',
        back: 'Expensive',
        pronunciation: 'gwah-GWAHN',
        example: 'Guaguan i sapåtos. — The shoes are expensive.'
      },
      {
        front: 'Hu nisisita',
        back: 'I need',
        pronunciation: 'hoo nee-see-SEE-tah',
        example: 'Hu nisisita hånom. — I need water.'
      },
      {
        front: 'Ayuda',
        back: 'Help',
        pronunciation: 'ah-DZOO-dah',
        example: 'Kao siña un ayuda yu\'? — Can you help me?'
      },
      {
        front: 'Åbona',
        back: 'Pay',
        pronunciation: 'AH-boh-nah',
        example: 'Para bai hu åbona. — I will pay.'
      },
      {
        front: 'Kåmbiyu',
        back: 'Change (money)',
        pronunciation: 'KAHM-bee-dzoo',
        example: 'Guaha kåmbiyu? — Is there change?'
      }
    ]
  },

  'daily-life': {
    topic: 'daily-life',
    displayName: 'Work & Daily Life',
    description: 'Jobs, school, and daily activities',
    cards: [
      {
        front: 'Emplehu',
        back: 'Job / Employment',
        pronunciation: 'ehm-PLEH-hoo',
        example: 'Bunitu i emplehu-hu. — My job is good.'
      },
      {
        front: 'Ma\'estra',
        back: 'Teacher (female)',
        pronunciation: 'mah-EHS-trah',
        example: 'Maolek i ma\'estra. — The teacher is good.'
      },
      {
        front: 'Ma\'estru',
        back: 'Teacher (male)',
        pronunciation: 'mah-EHS-troo',
        example: 'Si Juan ma\'estru. — Juan is a teacher.'
      },
      {
        front: 'Estudiånte',
        back: 'Student',
        pronunciation: 'ehs-too-dee-AHN-teh',
        example: 'Guahu estudiånte. — I am a student.'
      },
      {
        front: 'Tutuhon',
        back: 'Begin / Start',
        pronunciation: 'too-TOO-hohn',
        example: 'Tutuhon i klåse. — The class is starting.'
      },
      {
        front: 'Munhåyan',
        back: 'Finish / Complete',
        pronunciation: 'moon-HAH-dzahn',
        example: 'Esta munhåyan. — It\'s already finished.'
      },
      {
        front: 'Makpo\'',
        back: 'End / Finish',
        pronunciation: 'MAHK-poh',
        example: 'Makpo\' i cho\'cho\'. — The work is finished.'
      },
      {
        front: 'Eskåpa',
        back: 'Leave / Get out',
        pronunciation: 'ehs-KAH-pah',
        example: 'Bai hu eskåpa gi alas singko. — I will leave at 5 o\'clock.'
      },
      {
        front: 'Batkada',
        back: 'Group / Team',
        pronunciation: 'baht-KAH-dah',
        example: 'Maolek i batkada. — The team is good.'
      },
      {
        front: 'Fuetsao',
        back: 'Forced / Required',
        pronunciation: 'fweht-SOW',
        example: 'Fuetsao yu\' chumocho\'gue. — I\'m required to work.'
      }
    ]
  },

  culture: {
    topic: 'culture',
    displayName: 'Culture & Celebrations',
    description: 'Traditions, fiestas, and respect language',
    cards: [
      {
        front: 'Gupot',
        back: 'Party / Celebration',
        pronunciation: 'GOO-poht',
        example: 'Guaha gupot agupa\'. — There\'s a party tomorrow.'
      },
      {
        front: 'Fiesta',
        back: 'Fiesta / Festival',
        pronunciation: 'fee-EHS-tah',
        example: 'Bunitu i fiesta. — The fiesta is beautiful.'
      },
      {
        front: 'Fandånggo',
        back: 'Wedding Celebration',
        pronunciation: 'fahn-DAHNG-goh',
        example: 'Maolek i fandånggo. — The wedding was good.'
      },
      {
        front: 'Manamko\'',
        back: 'Elders / Elderly',
        pronunciation: 'mah-NAHM-koh',
        example: 'Rispeta i manamko\'. — Respect the elders.'
      },
      {
        front: 'Respetu',
        back: 'Respect',
        pronunciation: 'rehs-PEH-too',
        example: 'Impottånte i respetu. — Respect is important.'
      },
      {
        front: 'Inafa\'maolek',
        back: 'Harmony / Getting along',
        pronunciation: 'ee-nah-fah-mah-OH-lehk',
        example: 'I inafa\'maolek impottånte gi familia. — Harmony is important in family.'
      },
      {
        front: 'Chenchule\'',
        back: 'Gift-giving tradition',
        pronunciation: 'tsehn-TSOO-leh',
        example: 'Impottånte i chenchule\' gi Chamorro. — Gift-giving is important in Chamorro culture.'
      },
      {
        front: 'Nånan biha',
        back: 'Grandmother',
        pronunciation: 'NAH-nahn BEE-hah',
        example: 'Hu guaiya i nånan biha-hu. — I love my grandmother.'
      },
      {
        front: 'Tåtan bihu',
        back: 'Grandfather',
        pronunciation: 'TAH-tahn BEE-hoo',
        example: 'Metgot i tåtan bihu-hu. — My grandfather is strong.'
      },
      {
        front: 'Håfa adai',
        back: 'Hello / Greetings (formal repeat)',
        pronunciation: 'HAH-fah ah-DIE',
        example: 'Håfa Adai! — Hello! (The essential Chamorro greeting)'
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

