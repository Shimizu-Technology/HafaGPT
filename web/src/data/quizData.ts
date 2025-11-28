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
        question: 'What number is "Singko"?',
        options: ['4', '5', '6', '7'],
        correctAnswer: '5',
        explanation: '"Singko" is five in Chamorro.'
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
        correctAnswer: 'Siette',
        acceptableAnswers: ['Siette', 'siette', 'SIETTE', 'Siete', 'siete'],
        hint: 'Similar to Spanish "siete"',
        explanation: '"Siette" is seven in Chamorro.'
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
        options: ['Å\'paka\'', 'Kulot chåda\'', 'Agaga\'', 'Asut'],
        correctAnswer: 'Kulot chåda\'',
        explanation: '"Kulot chåda\'" literally means "color of charcoal" and refers to black.'
      },
      {
        id: id('color', 7),
        type: 'type_answer',
        question: 'What color is "Kulot kahel"?',
        correctAnswer: 'Orange',
        acceptableAnswers: ['Orange', 'orange', 'ORANGE'],
        hint: '"Kahel" sounds like a citrus fruit',
        explanation: '"Kulot kahel" means orange (the color).'
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

