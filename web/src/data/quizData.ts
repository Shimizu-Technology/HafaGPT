// Quiz question types
export type QuizType = 'multiple_choice' | 'type_answer' | 'fill_blank';

export interface QuizQuestion {
  id: string;
  type: QuizType;
  question: string;
  options?: string[];  // For multiple choice
  correctAnswer: string;
  acceptableAnswers?: string[];  // Alternative correct answers (for type_answer)
  hint?: string;
  explanation?: string;  // Shown after answering
}

export interface QuizCategory {
  id: string;
  title: string;
  description: string;
  icon: string;  // Emoji
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  questions: QuizQuestion[];
}

// Helper to generate unique IDs
const id = (prefix: string, num: number) => `${prefix}-${num}`;

export const QUIZ_CATEGORIES: QuizCategory[] = [
  {
    id: 'greetings',
    title: 'Greetings & Basics',
    description: 'Test your knowledge of basic Chamorro greetings',
    icon: '👋',
    difficulty: 'Beginner',
    questions: [
      {
        id: id('greet', 1),
        type: 'multiple_choice',
        question: 'What does "Håfa Adai" mean?',
        options: ['Goodbye', 'Hello / Hi', 'Thank you', 'Good night'],
        correctAnswer: 'Hello / Hi',
        explanation: '"Håfa Adai" is the most common Chamorro greeting, similar to "Hello" or "Hi".'
      },
      {
        id: id('greet', 2),
        type: 'multiple_choice',
        question: 'How do you say "Thank you" in Chamorro?',
        options: ['Håfa Adai', 'Adios', 'Si Yu\'os Ma\'åse\'', 'Buenas'],
        correctAnswer: 'Si Yu\'os Ma\'åse\'',
        explanation: '"Si Yu\'os Ma\'åse\'" literally means "God repay you" and is used to say thank you.'
      },
      {
        id: id('greet', 3),
        type: 'type_answer',
        question: 'Type the Chamorro word for "Goodbye"',
        correctAnswer: 'Adios',
        acceptableAnswers: ['adios', 'Adios', 'ADIOS', 'Bula', 'bula'],
        hint: 'It\'s similar to the Spanish word',
        explanation: '"Adios" is the formal goodbye, while "Bula" is more informal.'
      },
      {
        id: id('greet', 4),
        type: 'fill_blank',
        question: 'Complete: "Håfa ___" (Hello)',
        correctAnswer: 'Adai',
        acceptableAnswers: ['Adai', 'adai', 'ADAI'],
        hint: 'Starts with "A" - it\'s part of the famous greeting!',
        explanation: '"Håfa Adai" is the complete greeting.'
      },
      {
        id: id('greet', 5),
        type: 'multiple_choice',
        question: 'What does "Håfa tatatmånu hao?" mean?',
        options: ['What is your name?', 'How are you?', 'Where are you from?', 'How old are you?'],
        correctAnswer: 'How are you?',
        explanation: 'This is a common way to ask someone how they are doing.'
      },
      {
        id: id('greet', 6),
        type: 'multiple_choice',
        question: 'How would you respond "I\'m fine" in Chamorro?',
        options: ['Si Yu\'os Ma\'åse\'', 'Maolek ha\' yu\'', 'Håfa Adai', 'Adios'],
        correctAnswer: 'Maolek ha\' yu\'',
        explanation: '"Maolek" means "good" or "fine", so "Maolek ha\' yu\'" means "I\'m fine".'
      },
      {
        id: id('greet', 7),
        type: 'type_answer',
        question: 'How do you ask "What is your name?" in Chamorro?',
        correctAnswer: 'Håyi na\'ån-mu?',
        acceptableAnswers: ['Håyi na\'ån-mu?', 'Håyi na\'ån-mu', 'hayi naan-mu', 'Hayi naan-mu'],
        hint: 'It starts with "Håyi"',
        explanation: '"Håyi" means "who" and "na\'ån-mu" means "your name".'
      },
      {
        id: id('greet', 8),
        type: 'fill_blank',
        question: 'Complete: "Buenas ___" (Good morning)',
        correctAnswer: 'dias',
        acceptableAnswers: ['dias', 'días', 'dihas'],
        hint: 'Think of the Spanish word for "days"',
        explanation: '"Buenas dias" means "Good morning" - borrowed from Spanish "Buenos días".'
      }
    ]
  },
  {
    id: 'family',
    title: 'Family Members',
    description: 'Learn the Chamorro words for family relationships',
    icon: '👨‍👩‍👧‍👦',
    difficulty: 'Beginner',
    questions: [
      {
        id: id('fam', 1),
        type: 'multiple_choice',
        question: 'What is "mother" in Chamorro?',
        options: ['Tata', 'Nåna', 'Che\'lu', 'Abuelo'],
        correctAnswer: 'Nåna',
        explanation: '"Nåna" (or "Nana") means mother in Chamorro.'
      },
      {
        id: id('fam', 2),
        type: 'multiple_choice',
        question: 'What is "father" in Chamorro?',
        options: ['Nåna', 'Tata', 'Bihu', 'Påtgon'],
        correctAnswer: 'Tata',
        explanation: '"Tata" means father in Chamorro.'
      },
      {
        id: id('fam', 3),
        type: 'type_answer',
        question: 'How do you say "sibling" or "brother/sister" in Chamorro?',
        correctAnswer: 'Che\'lu',
        acceptableAnswers: ['Che\'lu', 'chelu', 'Chelu', 'che\'lu'],
        hint: 'It starts with "Che"',
        explanation: '"Che\'lu" is used for both brother and sister (sibling).'
      },
      {
        id: id('fam', 4),
        type: 'multiple_choice',
        question: 'What does "Biha" mean?',
        options: ['Grandmother', 'Aunt', 'Sister', 'Daughter'],
        correctAnswer: 'Grandmother',
        explanation: '"Biha" means grandmother, while "Bihu" means grandfather.'
      },
      {
        id: id('fam', 5),
        type: 'fill_blank',
        question: 'Complete: "___ yan Biha" (Grandfather and Grandmother)',
        correctAnswer: 'Bihu',
        acceptableAnswers: ['Bihu', 'bihu', 'BIHU'],
        hint: 'Sounds like "Biha" but for males',
        explanation: '"Bihu" is grandfather, "Biha" is grandmother.'
      },
      {
        id: id('fam', 6),
        type: 'multiple_choice',
        question: 'What is "child" in Chamorro?',
        options: ['Tata', 'Påtgon', 'Che\'lu', 'Tiu'],
        correctAnswer: 'Påtgon',
        explanation: '"Påtgon" means child in Chamorro.'
      },
      {
        id: id('fam', 7),
        type: 'type_answer',
        question: 'How do you say "uncle" in Chamorro?',
        correctAnswer: 'Tiu',
        acceptableAnswers: ['Tiu', 'tiu', 'TIU'],
        hint: 'Similar to Spanish',
        explanation: '"Tiu" means uncle, borrowed from Spanish "tío".'
      },
      {
        id: id('fam', 8),
        type: 'multiple_choice',
        question: 'What does "Tia" mean?',
        options: ['Grandmother', 'Mother', 'Aunt', 'Sister'],
        correctAnswer: 'Aunt',
        explanation: '"Tia" means aunt, borrowed from Spanish "tía".'
      }
    ]
  },
  {
    id: 'numbers',
    title: 'Numbers 1-10',
    description: 'Practice counting in Chamorro',
    icon: '🔢',
    difficulty: 'Beginner',
    questions: [
      {
        id: id('num', 1),
        type: 'multiple_choice',
        question: 'What is "1" in Chamorro?',
        options: ['Dos', 'Unu', 'Tres', 'Kuåttro'],
        correctAnswer: 'Unu',
        explanation: '"Unu" is the Chamorro word for one.'
      },
      {
        id: id('num', 2),
        type: 'type_answer',
        question: 'How do you say "2" in Chamorro?',
        correctAnswer: 'Dos',
        acceptableAnswers: ['Dos', 'dos', 'DOS'],
        hint: 'Same as Spanish',
        explanation: '"Dos" means two, borrowed from Spanish.'
      },
      {
        id: id('num', 3),
        type: 'multiple_choice',
        question: 'What number is "Sinku"?',
        options: ['4', '5', '6', '7'],
        correctAnswer: '5',
        explanation: '"Sinku" is five in Chamorro.'
      },
      {
        id: id('num', 4),
        type: 'fill_blank',
        question: 'Complete the sequence: Unu, Dos, ___',
        correctAnswer: 'Tres',
        acceptableAnswers: ['Tres', 'tres', 'TRES'],
        hint: 'Same as Spanish for "three"',
        explanation: '"Tres" is three in Chamorro.'
      },
      {
        id: id('num', 5),
        type: 'multiple_choice',
        question: 'What is "10" in Chamorro?',
        options: ['Nuebe', 'Dies', 'Ocho', 'Siette'],
        correctAnswer: 'Dies',
        explanation: '"Dies" is ten in Chamorro.'
      },
      {
        id: id('num', 6),
        type: 'type_answer',
        question: 'How do you say "7" in Chamorro?',
        correctAnswer: 'Siete',
        acceptableAnswers: ['Siete', 'siete', 'SIETE', 'Siette', 'siette'],
        hint: 'Similar to Spanish "siete"',
        explanation: '"Siete" is seven in Chamorro.'
      },
      {
        id: id('num', 7),
        type: 'multiple_choice',
        question: 'What number is "Kuåttro"?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        explanation: '"Kuåttro" is four in Chamorro.'
      },
      {
        id: id('num', 8),
        type: 'fill_blank',
        question: 'Complete: Ocho, Nuebe, ___',
        correctAnswer: 'Dies',
        acceptableAnswers: ['Dies', 'dies', 'DIES'],
        hint: 'Similar to Spanish "diez" (ten)',
        explanation: 'After 8 (Ocho) and 9 (Nuebe) comes 10 (Dies).'
      }
    ]
  },
  {
    id: 'food',
    title: 'Food & Drinks',
    description: 'Learn Chamorro words for common foods',
    icon: '🍲',
    difficulty: 'Intermediate',
    questions: [
      {
        id: id('food', 1),
        type: 'multiple_choice',
        question: 'What is "water" in Chamorro?',
        options: ['Kåtne', 'Hånom', 'Guihan', 'Hineksa\''],
        correctAnswer: 'Hånom',
        explanation: '"Hånom" means water in Chamorro.'
      },
      {
        id: id('food', 2),
        type: 'multiple_choice',
        question: 'What does "Hineksa\'" mean?',
        options: ['Bread', 'Rice', 'Fish', 'Meat'],
        correctAnswer: 'Rice',
        explanation: '"Hineksa\'" is cooked rice, a staple in Chamorro cuisine.'
      },
      {
        id: id('food', 3),
        type: 'type_answer',
        question: 'How do you say "fish" in Chamorro?',
        correctAnswer: 'Guihan',
        acceptableAnswers: ['Guihan', 'guihan', 'GUIHAN'],
        hint: 'Starts with "Gui"',
        explanation: '"Guihan" means fish in Chamorro.'
      },
      {
        id: id('food', 4),
        type: 'multiple_choice',
        question: 'What is "Kåtne"?',
        options: ['Vegetable', 'Fruit', 'Meat', 'Bread'],
        correctAnswer: 'Meat',
        explanation: '"Kåtne" means meat in Chamorro.'
      },
      {
        id: id('food', 5),
        type: 'fill_blank',
        question: 'Complete: "Kao malago\' hao ___?" (Do you want water?)',
        correctAnswer: 'hånom',
        acceptableAnswers: ['hånom', 'Hånom', 'hanom', 'Hanom'],
        hint: 'The answer is in the question! 💧',
        explanation: '"Hånom" means water.'
      },
      {
        id: id('food', 6),
        type: 'multiple_choice',
        question: 'What does "Kelaguen" refer to?',
        options: ['A soup', 'A grilled dish with lemon', 'A dessert', 'A drink'],
        correctAnswer: 'A grilled dish with lemon',
        explanation: 'Kelaguen is a traditional Chamorro dish made with grilled meat and lemon.'
      },
      {
        id: id('food', 7),
        type: 'type_answer',
        question: 'What is the Chamorro word for "coconut"?',
        correctAnswer: 'Niyok',
        acceptableAnswers: ['Niyok', 'niyok', 'NIYOK'],
        hint: 'Starts with "Ni"',
        explanation: '"Niyok" is coconut, an important ingredient in Chamorro cooking.'
      },
      {
        id: id('food', 8),
        type: 'multiple_choice',
        question: 'What is "Fina\'denne\'"?',
        options: ['A type of fish', 'A hot sauce/condiment', 'A dessert', 'A vegetable'],
        correctAnswer: 'A hot sauce/condiment',
        explanation: 'Fina\'denne\' is a traditional Chamorro condiment made with soy sauce, lemon, and hot peppers.'
      }
    ]
  },
  {
    id: 'common-phrases',
    title: 'Common Phrases',
    description: 'Useful everyday expressions',
    icon: '💬',
    difficulty: 'Intermediate',
    questions: [
      {
        id: id('phrase', 1),
        type: 'multiple_choice',
        question: 'How do you say "Yes" in Chamorro?',
        options: ['Åhe\'', 'Hunggan', 'Tåya\'', 'Guaha'],
        correctAnswer: 'Hunggan',
        explanation: '"Hunggan" means yes in Chamorro.'
      },
      {
        id: id('phrase', 2),
        type: 'multiple_choice',
        question: 'What does "Åhe\'" mean?',
        options: ['Yes', 'No', 'Maybe', 'Please'],
        correctAnswer: 'No',
        explanation: '"Åhe\'" means no in Chamorro.'
      },
      {
        id: id('phrase', 3),
        type: 'type_answer',
        question: 'How do you say "I love you" in Chamorro?',
        correctAnswer: 'Hu guaiya hao',
        acceptableAnswers: ['Hu guaiya hao', 'hu guaiya hao', 'Hu Guaiya Hao'],
        hint: 'Starts with "Hu guaiya"',
        explanation: '"Hu guaiya hao" is how you express love in Chamorro.'
      },
      {
        id: id('phrase', 4),
        type: 'fill_blank',
        question: 'Complete: "Kao siña un ___ yu\'?" (Can you help me?)',
        correctAnswer: 'ayuda',
        acceptableAnswers: ['ayuda', 'Ayuda', 'AYUDA'],
        hint: 'Spanish word for "help"',
        explanation: '"Ayuda" means help, borrowed from Spanish.'
      },
      {
        id: id('phrase', 5),
        type: 'multiple_choice',
        question: 'What does "Dispensa yu\'" mean?',
        options: ['Thank you', 'Excuse me / Sorry', 'Hello', 'Goodbye'],
        correctAnswer: 'Excuse me / Sorry',
        explanation: '"Dispensa yu\'" is used to apologize or get someone\'s attention.'
      },
      {
        id: id('phrase', 6),
        type: 'multiple_choice',
        question: 'How do you say "I don\'t understand" in Chamorro?',
        options: ['Ti hu komprende', 'Maolek', 'Hunggan', 'Håfa'],
        correctAnswer: 'Ti hu komprende',
        explanation: '"Ti hu komprende" means "I don\'t understand".'
      },
      {
        id: id('phrase', 7),
        type: 'type_answer',
        question: 'How do you say "Please" in Chamorro?',
        correctAnswer: 'Pot fabot',
        acceptableAnswers: ['Pot fabot', 'pot fabot', 'Pot Fabot'],
        hint: 'Borrowed from Spanish "por favor"',
        explanation: '"Pot fabot" means please, adapted from Spanish.'
      },
      {
        id: id('phrase', 8),
        type: 'fill_blank',
        question: 'Complete: "Mångge ___ hao?" (Where are you from?)',
        correctAnswer: 'ginen',
        acceptableAnswers: ['ginen', 'Ginen', 'GINEN'],
        hint: 'Starts with "G" - means "from"',
        explanation: '"Ginen" means "from" in this context.'
      }
    ]
  },
  {
    id: 'animals',
    title: 'Animals',
    description: 'Learn the Chamorro words for common animals',
    icon: '🐕',
    difficulty: 'Beginner',
    questions: [
      {
        id: id('animal', 1),
        type: 'multiple_choice',
        question: 'What is "dog" in Chamorro?',
        options: ['Katu', 'Ga\'lågu', 'Babui', 'Paluma'],
        correctAnswer: 'Ga\'lågu',
        explanation: '"Ga\'lågu" means dog in Chamorro.'
      },
      {
        id: id('animal', 2),
        type: 'multiple_choice',
        question: 'What animal is "Katu"?',
        options: ['Dog', 'Cat', 'Bird', 'Fish'],
        correctAnswer: 'Cat',
        explanation: '"Katu" means cat in Chamorro.'
      },
      {
        id: id('animal', 3),
        type: 'type_answer',
        question: 'How do you say "fish" in Chamorro?',
        correctAnswer: 'Guihan',
        acceptableAnswers: ['Guihan', 'guihan', 'GUIHAN'],
        hint: 'Starts with "Gui"',
        explanation: '"Guihan" means fish in Chamorro.'
      },
      {
        id: id('animal', 4),
        type: 'multiple_choice',
        question: 'What is "Paluma"?',
        options: ['Fish', 'Pig', 'Bird', 'Crab'],
        correctAnswer: 'Bird',
        explanation: '"Paluma" means bird in Chamorro.'
      },
      {
        id: id('animal', 5),
        type: 'fill_blank',
        question: 'Complete: "I ___ giya halom tåno\'" (The pig is in the jungle)',
        correctAnswer: 'babui',
        acceptableAnswers: ['babui', 'Babui', 'BABUI'],
        hint: 'Common farm animal',
        explanation: '"Babui" means pig in Chamorro.'
      },
      {
        id: id('animal', 6),
        type: 'multiple_choice',
        question: 'What is "Karabao" in English?',
        options: ['Cow', 'Horse', 'Water Buffalo', 'Goat'],
        correctAnswer: 'Water Buffalo',
        explanation: '"Karabao" is the water buffalo, an important animal in Chamorro history.'
      },
      {
        id: id('animal', 7),
        type: 'type_answer',
        question: 'What is "turtle" in Chamorro?',
        correctAnswer: 'Haggan',
        acceptableAnswers: ['Haggan', 'haggan', 'HAGGAN', 'Hagan', 'hagan'],
        hint: 'Starts with "H"',
        explanation: '"Haggan" means turtle in Chamorro.'
      },
      {
        id: id('animal', 8),
        type: 'multiple_choice',
        question: 'What is the famous Chamorro coconut crab called?',
        options: ['Ngånga\'', 'Ayuyu', 'Haggan', 'Guihan'],
        correctAnswer: 'Ayuyu',
        explanation: '"Ayuyu" is the coconut crab, a delicacy in Chamorro cuisine.'
      }
    ]
  },
  {
    id: 'colors',
    title: 'Colors',
    description: 'Learn the colors in Chamorro',
    icon: '🎨',
    difficulty: 'Beginner',
    questions: [
      {
        id: id('color', 1),
        type: 'multiple_choice',
        question: 'What is "red" in Chamorro?',
        options: ['Asut', 'Agaga\'', 'Betde', 'Amariyu'],
        correctAnswer: 'Agaga\'',
        explanation: '"Agaga\'" means red in Chamorro.'
      },
      {
        id: id('color', 2),
        type: 'multiple_choice',
        question: 'What color is "Asut"?',
        options: ['Red', 'Green', 'Blue', 'Yellow'],
        correctAnswer: 'Blue',
        explanation: '"Asut" means blue in Chamorro.'
      },
      {
        id: id('color', 3),
        type: 'type_answer',
        question: 'How do you say "green" in Chamorro?',
        correctAnswer: 'Betde',
        acceptableAnswers: ['Betde', 'betde', 'BETDE', 'Verde', 'verde'],
        hint: 'Similar to Spanish "verde"',
        explanation: '"Betde" means green, borrowed from Spanish.'
      },
      {
        id: id('color', 4),
        type: 'fill_blank',
        question: 'Complete: "I kareta ___ " (The yellow car)',
        correctAnswer: 'amariyu',
        acceptableAnswers: ['amariyu', 'Amariyu', 'AMARIYU'],
        hint: 'Similar to Spanish "amarillo"',
        explanation: '"Amariyu" means yellow in Chamorro.'
      },
      {
        id: id('color', 5),
        type: 'multiple_choice',
        question: 'What does "Å\'paka\'" mean?',
        options: ['Black', 'White', 'Gray', 'Brown'],
        correctAnswer: 'White',
        explanation: '"Å\'paka\'" means white in Chamorro.'
      },
      {
        id: id('color', 6),
        type: 'multiple_choice',
        question: 'What is "black" in Chamorro?',
        options: ['Å\'paka\'', 'Å\'tot', 'Agaga\'', 'Asut'],
        correctAnswer: 'Å\'tot',
        explanation: '"Å\'tot" means black in Chamorro.'
      },
      {
        id: id('color', 7),
        type: 'type_answer',
        question: 'What color is "Lalala"?',
        correctAnswer: 'Orange',
        acceptableAnswers: ['Orange', 'orange', 'ORANGE'],
        hint: 'Think of something bright and citrusy',
        explanation: '"Lalala" means orange (the color) in Chamorro.'
      },
      {
        id: id('color', 8),
        type: 'multiple_choice',
        question: 'What is "Rosa" in English?',
        options: ['Red', 'Pink', 'Purple', 'Orange'],
        correctAnswer: 'Pink',
        explanation: '"Rosa" means pink, borrowed from Spanish.'
      }
    ]
  },

  // INTERMEDIATE LEVEL QUIZZES

  {
    id: 'questions',
    title: 'Question Words',
    description: 'Test your knowledge of Chamorro question words',
    icon: '❓',
    difficulty: 'Intermediate',
    questions: [
      {
        id: id('quest', 1),
        type: 'multiple_choice',
        question: 'What does "Håfa" mean?',
        options: ['Who', 'What', 'Where', 'When'],
        correctAnswer: 'What',
        explanation: '"Håfa" means "what" and is also part of the greeting "Håfa Adai".'
      },
      {
        id: id('quest', 2),
        type: 'multiple_choice',
        question: 'How do you ask "Who is that?" in Chamorro?',
        options: ['Håfa ennao?', 'Hayi ennao?', 'Manu ennao?', 'Ngai\'an ennao?'],
        correctAnswer: 'Hayi ennao?',
        explanation: '"Hayi" means "who" — so "Hayi ennao?" means "Who is that?"'
      },
      {
        id: id('quest', 3),
        type: 'type_answer',
        question: 'Type the Chamorro word for "Where"',
        correctAnswer: 'Manu',
        acceptableAnswers: ['Manu', 'manu', 'MANU'],
        hint: 'Starts with "M"',
        explanation: '"Manu" means "where" or "which".'
      },
      {
        id: id('quest', 4),
        type: 'multiple_choice',
        question: 'What does "Ngai\'an" mean?',
        options: ['Why', 'How', 'When', 'What'],
        correctAnswer: 'When',
        explanation: '"Ngai\'an" is the question word for "when".'
      },
      {
        id: id('quest', 5),
        type: 'fill_blank',
        question: 'Complete: "___ håfa un hånao?" (Why did you go?)',
        correctAnswer: 'Pot',
        acceptableAnswers: ['Pot', 'pot', 'POT'],
        hint: 'It means "for" or "because of"',
        explanation: '"Pot håfa" means "why" — literally "for what".'
      },
      {
        id: id('quest', 6),
        type: 'multiple_choice',
        question: 'How do you ask "How are you?" in Chamorro?',
        options: ['Håfa na\'ån-mu?', 'Håfa taimanu hao?', 'Manu nai gaige hao?', 'Hayi hao?'],
        correctAnswer: 'Håfa taimanu hao?',
        explanation: '"Håfa taimanu" means "how" — so "Håfa taimanu hao?" asks how someone is doing.'
      },
      {
        id: id('quest', 7),
        type: 'multiple_choice',
        question: 'What does "Kao" do in a sentence?',
        options: ['Makes it negative', 'Makes it a question', 'Makes it past tense', 'Makes it formal'],
        correctAnswer: 'Makes it a question',
        explanation: '"Kao" is a question marker — it turns statements into yes/no questions.'
      }
    ]
  },
  {
    id: 'body-parts',
    title: 'Body Parts',
    description: 'Test your knowledge of body part vocabulary',
    icon: '🫀',
    difficulty: 'Intermediate',
    questions: [
      {
        id: id('body', 1),
        type: 'multiple_choice',
        question: 'What is "head" in Chamorro?',
        options: ['Mata', 'Ulu', 'Kannai', 'Addeng'],
        correctAnswer: 'Ulu',
        explanation: '"Ulu" means "head" in Chamorro.'
      },
      {
        id: id('body', 2),
        type: 'multiple_choice',
        question: 'What does "Mata" mean?',
        options: ['Mouth', 'Nose', 'Eye/Eyes', 'Ear'],
        correctAnswer: 'Eye/Eyes',
        explanation: '"Mata" means "eye" or "eyes".'
      },
      {
        id: id('body', 3),
        type: 'type_answer',
        question: 'Type the Chamorro word for "hand"',
        correctAnswer: 'Kannai',
        acceptableAnswers: ['Kannai', 'kannai', 'KANNAI'],
        hint: 'Starts with "K"',
        explanation: '"Kannai" means "hand" or "hands".'
      },
      {
        id: id('body', 4),
        type: 'fill_blank',
        question: 'Complete: "___ " (Ear/Ears)',
        correctAnswer: 'Talanga',
        acceptableAnswers: ['Talanga', 'talanga', 'TALANGA'],
        hint: 'Starts with "T"',
        explanation: '"Talanga" means "ear" or "ears".'
      },
      {
        id: id('body', 5),
        type: 'multiple_choice',
        question: 'What is "foot/feet" in Chamorro?',
        options: ['Kannai', 'Tuyan', 'Addeng', 'Pachot'],
        correctAnswer: 'Addeng',
        explanation: '"Addeng" means "foot" or "feet".'
      },
      {
        id: id('body', 6),
        type: 'multiple_choice',
        question: 'What does "Pachot" mean?',
        options: ['Nose', 'Mouth', 'Neck', 'Stomach'],
        correctAnswer: 'Mouth',
        explanation: '"Pachot" means "mouth".'
      },
      {
        id: id('body', 7),
        type: 'multiple_choice',
        question: 'What is "stomach" in Chamorro?',
        options: ['Korason', 'Tuyan', 'Kueyu', 'Ulu'],
        correctAnswer: 'Tuyan',
        explanation: '"Tuyan" means "stomach" or "belly".'
      }
    ]
  },
  {
    id: 'days',
    title: 'Days of the Week',
    description: 'Test your knowledge of days in Chamorro',
    icon: '📅',
    difficulty: 'Intermediate',
    questions: [
      {
        id: id('days', 1),
        type: 'multiple_choice',
        question: 'What is "Sunday" in Chamorro?',
        options: ['Lunes', 'Såbalu', 'Dåmenggo', 'Betnes'],
        correctAnswer: 'Dåmenggo',
        explanation: '"Dåmenggo" means Sunday — it\'s the traditional first day of the week.'
      },
      {
        id: id('days', 2),
        type: 'multiple_choice',
        question: 'What does "Betnes" mean?',
        options: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
        correctAnswer: 'Friday',
        explanation: '"Betnes" means Friday, from Spanish "Viernes".'
      },
      {
        id: id('days', 3),
        type: 'type_answer',
        question: 'Type the Chamorro word for "Monday"',
        correctAnswer: 'Lunes',
        acceptableAnswers: ['Lunes', 'lunes', 'LUNES'],
        hint: 'Same as Spanish',
        explanation: '"Lunes" means Monday.'
      },
      {
        id: id('days', 4),
        type: 'fill_blank',
        question: 'Complete: "___ " (Saturday)',
        correctAnswer: 'Såbalu',
        acceptableAnswers: ['Såbalu', 'Sabalu', 'såbalu', 'sabalu'],
        hint: 'Similar to Spanish "Sábado"',
        explanation: '"Såbalu" means Saturday.'
      },
      {
        id: id('days', 5),
        type: 'multiple_choice',
        question: 'What is "yesterday" in Chamorro?',
        options: ['Agupa\'', 'Nigap', 'På\'go', 'Nai'],
        correctAnswer: 'Nigap',
        explanation: '"Nigap" means "yesterday".'
      },
      {
        id: id('days', 6),
        type: 'multiple_choice',
        question: 'What does "Agupa\'" mean?',
        options: ['Today', 'Yesterday', 'Tomorrow', 'Last week'],
        correctAnswer: 'Tomorrow',
        explanation: '"Agupa\'" means "tomorrow".'
      },
      {
        id: id('days', 7),
        type: 'multiple_choice',
        question: 'What is "Huebes" in English?',
        options: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        correctAnswer: 'Thursday',
        explanation: '"Huebes" means Thursday, from Spanish "Jueves".'
      }
    ]
  },
  {
    id: 'months',
    title: 'Months of the Year',
    description: 'Test your knowledge of months in Chamorro',
    icon: '🗓️',
    difficulty: 'Intermediate',
    questions: [
      {
        id: id('month', 1),
        type: 'multiple_choice',
        question: 'What is "January" in Chamorro?',
        options: ['Febreru', 'Eneru', 'Mårso', 'Abrit'],
        correctAnswer: 'Eneru',
        explanation: '"Eneru" means January.'
      },
      {
        id: id('month', 2),
        type: 'multiple_choice',
        question: 'What does "Disiembre" mean?',
        options: ['November', 'December', 'October', 'September'],
        correctAnswer: 'December',
        explanation: '"Disiembre" means December — the festive holiday season.'
      },
      {
        id: id('month', 3),
        type: 'type_answer',
        question: 'Type the Chamorro word for "July"',
        correctAnswer: 'Huliu',
        acceptableAnswers: ['Huliu', 'huliu', 'HULIU'],
        hint: 'Similar to Spanish "Julio"',
        explanation: '"Huliu" means July.'
      },
      {
        id: id('month', 4),
        type: 'fill_blank',
        question: 'Complete: "___" (June)',
        correctAnswer: 'Huniu',
        acceptableAnswers: ['Huniu', 'huniu', 'HUNIU'],
        hint: 'Liberation Day is in this month',
        explanation: '"Huniu" means June — Liberation Day is June 21.'
      },
      {
        id: id('month', 5),
        type: 'multiple_choice',
        question: 'Which month is "Oktubre"?',
        options: ['August', 'September', 'October', 'November'],
        correctAnswer: 'October',
        explanation: '"Oktubre" means October.'
      },
      {
        id: id('month', 6),
        type: 'multiple_choice',
        question: 'What is "Ågosto" in English?',
        options: ['July', 'August', 'September', 'October'],
        correctAnswer: 'August',
        explanation: '"Ågosto" means August.'
      }
    ]
  },
  {
    id: 'verbs',
    title: 'Common Verbs',
    description: 'Test your knowledge of Chamorro action words',
    icon: '🏃',
    difficulty: 'Intermediate',
    questions: [
      {
        id: id('verb', 1),
        type: 'multiple_choice',
        question: 'What does "Hu kånno\'" mean?',
        options: ['I sleep', 'I eat', 'I go', 'I see'],
        correctAnswer: 'I eat',
        explanation: '"Hu kånno\'" means "I eat" — "Hu" is the pronoun and "kånno\'" is the verb.'
      },
      {
        id: id('verb', 2),
        type: 'multiple_choice',
        question: 'How do you say "I go" in Chamorro?',
        options: ['Hu maigo\'', 'Hu hånao', 'Hu tungo\'', 'Hu gimen'],
        correctAnswer: 'Hu hånao',
        explanation: '"Hu hånao" means "I go" — "hånao" is the verb for going.'
      },
      {
        id: id('verb', 3),
        type: 'type_answer',
        question: 'What does "Hu maigo\'" mean?',
        correctAnswer: 'I sleep',
        acceptableAnswers: ['I sleep', 'i sleep', 'sleep'],
        hint: 'Something you do at night',
        explanation: '"Hu maigo\'" means "I sleep".'
      },
      {
        id: id('verb', 4),
        type: 'fill_blank',
        question: 'Complete: "Hu ___" (I drink)',
        correctAnswer: 'gimen',
        acceptableAnswers: ['gimen', 'Gimen', 'GIMEN'],
        hint: 'What you do with water or coffee',
        explanation: '"Hu gimen" means "I drink".'
      },
      {
        id: id('verb', 5),
        type: 'multiple_choice',
        question: 'What does "Hu guaiya" mean?',
        options: ['I want', 'I love', 'I see', 'I know'],
        correctAnswer: 'I love',
        explanation: '"Hu guaiya" means "I love" — used for people and things you care about.'
      },
      {
        id: id('verb', 6),
        type: 'multiple_choice',
        question: 'How do you say "I know" in Chamorro?',
        options: ['Hu hongge', 'Hu tungo\'', 'Hu hasso', 'Hu egga\''],
        correctAnswer: 'Hu tungo\'',
        explanation: '"Hu tungo\'" means "I know" or "I understand".'
      },
      {
        id: id('verb', 7),
        type: 'multiple_choice',
        question: 'What does "Hu li\'e\'" mean?',
        options: ['I hear', 'I see', 'I think', 'I believe'],
        correctAnswer: 'I see',
        explanation: '"Hu li\'e\'" means "I see" or "I saw".'
      }
    ]
  },
  {
    id: 'adjectives',
    title: 'Describing Things',
    description: 'Test your knowledge of Chamorro adjectives',
    icon: '✨',
    difficulty: 'Intermediate',
    questions: [
      {
        id: id('adj', 1),
        type: 'multiple_choice',
        question: 'What does "Maolek" mean?',
        options: ['Bad', 'Good/Fine', 'Big', 'Small'],
        correctAnswer: 'Good/Fine',
        explanation: '"Maolek" means "good," "fine," or "well".'
      },
      {
        id: id('adj', 2),
        type: 'multiple_choice',
        question: 'How do you say "big" in Chamorro?',
        options: ['Dikike\'', 'Dånkolo', 'Bunitu', 'Båba'],
        correctAnswer: 'Dånkolo',
        explanation: '"Dånkolo" means "big" or "large".'
      },
      {
        id: id('adj', 3),
        type: 'type_answer',
        question: 'What is "small" in Chamorro?',
        correctAnswer: 'Dikike\'',
        acceptableAnswers: ['Dikike\'', 'dikike\'', 'Dikike', 'dikike'],
        hint: 'Starts with "D"',
        explanation: '"Dikike\'" means "small" or "little".'
      },
      {
        id: id('adj', 4),
        type: 'fill_blank',
        question: 'Complete: "___" (Beautiful)',
        correctAnswer: 'Bunitu',
        acceptableAnswers: ['Bunitu', 'bunitu', 'BUNITU'],
        hint: 'Similar to Spanish "bonito"',
        explanation: '"Bunitu" means "beautiful" or "handsome".'
      },
      {
        id: id('adj', 5),
        type: 'multiple_choice',
        question: 'What does "Båba" mean?',
        options: ['Good', 'Bad', 'Hot', 'Cold'],
        correctAnswer: 'Bad',
        explanation: '"Båba" means "bad" or "wrong".'
      },
      {
        id: id('adj', 6),
        type: 'multiple_choice',
        question: 'How do you say "hot" (temperature) in Chamorro?',
        options: ['Manengheng', 'Maipe', 'Metgot', 'Chaddek'],
        correctAnswer: 'Maipe',
        explanation: '"Maipe" means "hot" when referring to temperature.'
      },
      {
        id: id('adj', 7),
        type: 'multiple_choice',
        question: 'What is "cold" in Chamorro?',
        options: ['Maipe', 'Metgot', 'Manengheng', 'Nuebu'],
        correctAnswer: 'Manengheng',
        explanation: '"Manengheng" means "cold".'
      }
    ]
  },
  {
    id: 'sentences',
    title: 'Simple Sentences',
    description: 'Test your knowledge of Chamorro sentence patterns',
    icon: '📝',
    difficulty: 'Intermediate',
    questions: [
      {
        id: id('sent', 1),
        type: 'multiple_choice',
        question: 'What does "Malago\' yu\'" mean?',
        options: ['I can', 'I want', 'I am', 'I have'],
        correctAnswer: 'I want',
        explanation: '"Malago\' yu\'" means "I want".'
      },
      {
        id: id('sent', 2),
        type: 'multiple_choice',
        question: 'How do you say "I can" in Chamorro?',
        options: ['Malago\' yu\'', 'Siña yu\'', 'Gaige yu\'', 'Guaha yu\''],
        correctAnswer: 'Siña yu\'',
        explanation: '"Siña yu\'" means "I can" or "I\'m able".'
      },
      {
        id: id('sent', 3),
        type: 'type_answer',
        question: 'What does "Ti siña" mean?',
        correctAnswer: 'Cannot',
        acceptableAnswers: ['Cannot', 'cannot', 'Can not', 'can not', 'Can\'t', 'can\'t'],
        hint: '"Ti" makes it negative',
        explanation: '"Ti siña" means "cannot" or "not possible".'
      },
      {
        id: id('sent', 4),
        type: 'fill_blank',
        question: 'Complete: "___ " (There is / I have)',
        correctAnswer: 'Guaha',
        acceptableAnswers: ['Guaha', 'guaha', 'GUAHA'],
        hint: 'Opposite of "Taya\'"',
        explanation: '"Guaha" means "there is" or "I have".'
      },
      {
        id: id('sent', 5),
        type: 'multiple_choice',
        question: 'What does "Taya\'" mean?',
        options: ['There is', 'There is no / None', 'I want', 'I will'],
        correctAnswer: 'There is no / None',
        explanation: '"Taya\'" means "there is no" or "none".'
      },
      {
        id: id('sent', 6),
        type: 'multiple_choice',
        question: 'How do you say "I will go tomorrow" in Chamorro?',
        options: ['Hu hånao agupa\'', 'Bai hu hånao agupa\'', 'Malago\' yu\' hånao', 'Siña yu\' hånao'],
        correctAnswer: 'Bai hu hånao agupa\'',
        explanation: '"Bai hu" is the future marker — "Bai hu hånao agupa\'" means "I will go tomorrow".'
      },
      {
        id: id('sent', 7),
        type: 'multiple_choice',
        question: 'What does "Gaige yu\' giya Hagåtña" mean?',
        options: ['I\'m going to Hagåtña', 'I\'m from Hagåtña', 'I\'m in Hagåtña', 'I want to go to Hagåtña'],
        correctAnswer: 'I\'m in Hagåtña',
        explanation: '"Gaige yu\' giya..." means "I am at/in..." — expressing location.'
      }
    ]
  }
];

// Get a quiz category by ID
export function getQuizCategory(categoryId: string): QuizCategory | undefined {
  return QUIZ_CATEGORIES.find(cat => cat.id === categoryId);
}

// Shuffle questions for variety
export function shuffleQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if an answer is correct (handles multiple acceptable answers)
export function checkAnswer(question: QuizQuestion, userAnswer: string): boolean {
  const normalizedUser = userAnswer.trim().toLowerCase();
  const normalizedCorrect = question.correctAnswer.toLowerCase();
  
  // Check main answer
  if (normalizedUser === normalizedCorrect) return true;
  
  // Check acceptable alternatives
  if (question.acceptableAnswers) {
    return question.acceptableAnswers.some(
      ans => ans.toLowerCase() === normalizedUser
    );
  }
  
  return false;
}

