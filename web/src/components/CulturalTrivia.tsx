import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Sun, Moon, Play, HelpCircle, Timer, CheckCircle, XCircle, Loader2, Sparkles, Zap, Flame } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';

interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  category: string;
}

// Curated trivia questions about Guam culture, history, and Chamorro
const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // Culture & Traditions
  {
    question: "What is the traditional Chamorro greeting?",
    options: ["Aloha", "Håfa Adai", "Konnichiwa", "Buenos Días"],
    correctIndex: 1,
    explanation: "'Håfa Adai' is the traditional Chamorro greeting, meaning 'Hello' or 'What's up?'",
    category: "culture"
  },
  {
    question: "What is a 'fiesta' in Chamorro culture?",
    options: ["A type of dance", "A village celebration with food and community", "A traditional clothing", "A fishing technique"],
    correctIndex: 1,
    explanation: "Fiestas are village patron saint celebrations featuring food, music, and community gathering.",
    category: "culture"
  },
  {
    question: "What does 'Inafa'maolek' mean?",
    options: ["Hello friend", "To make good / Restoring harmony", "Thank you very much", "Goodbye forever"],
    correctIndex: 1,
    explanation: "Inafa'maolek is a core Chamorro value meaning 'to make good' - emphasizing harmony and interdependence.",
    category: "culture"
  },
  {
    question: "What is the traditional Chamorro respect shown to elders called?",
    options: ["Manginge'", "Fiesta", "Latte", "Sakman"],
    correctIndex: 0,
    explanation: "Manginge' is the tradition of showing respect by bringing an elder's hand to the forehead.",
    category: "culture"
  },
  {
    question: "What is 'kåddo' in Chamorro cuisine?",
    options: ["A dessert", "A type of soup/stew", "Grilled fish", "Fried rice"],
    correctIndex: 1,
    explanation: "Kåddo is a traditional Chamorro soup or stew, often made with meat and vegetables.",
    category: "culture"
  },
  
  // History
  {
    question: "When did Ferdinand Magellan arrive in Guam?",
    options: ["1421", "1521", "1621", "1721"],
    correctIndex: 1,
    explanation: "Magellan arrived in Guam on March 6, 1521, making first European contact with the Chamorro people.",
    category: "history"
  },
  {
    question: "What ancient stone structures are unique to the Mariana Islands?",
    options: ["Pyramids", "Latte Stones", "Moai", "Stonehenge"],
    correctIndex: 1,
    explanation: "Latte stones are ancient pillar structures unique to the Mariana Islands, used as building foundations.",
    category: "history"
  },
  {
    question: "Which country governed Guam before the United States?",
    options: ["England", "France", "Spain", "Portugal"],
    correctIndex: 2,
    explanation: "Spain governed Guam for over 300 years (1565-1898) before ceding it to the United States.",
    category: "history"
  },
  {
    question: "What was the traditional Chamorro sailing canoe called?",
    options: ["Kayak", "Proa", "Canoa", "Sakman"],
    correctIndex: 3,
    explanation: "The Sakman was the large ocean-going sailing canoe used by ancient Chamorros for long voyages.",
    category: "history"
  },
  {
    question: "When did Guam become a U.S. territory?",
    options: ["1848", "1898", "1918", "1948"],
    correctIndex: 1,
    explanation: "Guam became a U.S. territory in 1898 after the Spanish-American War.",
    category: "history"
  },
  {
    question: "What significant event happened in Guam on December 8, 1941?",
    options: ["Became a U.S. state", "Japanese invasion", "Major earthquake", "First fiesta"],
    correctIndex: 1,
    explanation: "Japan invaded Guam on December 8, 1941, beginning a 2.5 year occupation during WWII.",
    category: "history"
  },
  {
    question: "When was Guam liberated during WWII?",
    options: ["1943", "1944", "1945", "1946"],
    correctIndex: 1,
    explanation: "U.S. forces liberated Guam on July 21, 1944, now celebrated as Liberation Day.",
    category: "history"
  },
  
  // Geography
  {
    question: "What ocean surrounds Guam?",
    options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
    correctIndex: 2,
    explanation: "Guam is located in the Western Pacific Ocean, part of the Mariana Islands archipelago.",
    category: "geography"
  },
  {
    question: "What is the capital of Guam?",
    options: ["Tamuning", "Hagåtña", "Dededo", "Yigo"],
    correctIndex: 1,
    explanation: "Hagåtña (formerly Agaña) is the capital of Guam, though Dededo is the largest village.",
    category: "geography"
  },
  {
    question: "How many villages does Guam have?",
    options: ["12", "15", "19", "25"],
    correctIndex: 2,
    explanation: "Guam is divided into 19 villages, each with its own unique character and history.",
    category: "geography"
  },
  {
    question: "What is the highest point on Guam?",
    options: ["Mount Lamlam", "Mount Jumullong Manglo", "Two Lovers Point", "Ritidian Point"],
    correctIndex: 0,
    explanation: "Mount Lamlam is the highest point on Guam at 1,332 feet (406 meters).",
    category: "geography"
  },
  {
    question: "What famous cliff is a popular tourist destination in Guam?",
    options: ["Lover's Leap", "Two Lovers Point", "Suicide Cliff", "Eagle Point"],
    correctIndex: 1,
    explanation: "Two Lovers Point (Puntan Dos Amantes) is a famous cliff with a legendary love story.",
    category: "geography"
  },
  
  // Language
  {
    question: "What does 'Si Yu'os Ma'åse'' mean?",
    options: ["Hello", "Goodbye", "Thank you", "I love you"],
    correctIndex: 2,
    explanation: "'Si Yu'os Ma'åse'' means 'Thank you' in Chamorro, literally 'God have mercy/bless you'.",
    category: "language"
  },
  {
    question: "What is the Chamorro word for 'love'?",
    options: ["Guaiya", "Magof", "Gof", "Bunitu"],
    correctIndex: 0,
    explanation: "'Guaiya' means 'love' in Chamorro. 'Hu guaiya hao' means 'I love you'.",
    category: "language"
  },
  {
    question: "What does 'Hågu' mean in Chamorro?",
    options: ["Hello", "You", "Me", "We"],
    correctIndex: 1,
    explanation: "'Hågu' means 'you' in Chamorro. 'Yu'' means 'I/me'.",
    category: "language"
  },
  {
    question: "What is the Chamorro word for 'water'?",
    options: ["Hanom", "Tasi", "Uchan", "Aire"],
    correctIndex: 0,
    explanation: "'Hanom' means 'water'. 'Tasi' means 'sea/ocean', and 'Uchan' means 'rain'.",
    category: "language"
  },
  {
    question: "How do you say 'Good morning' in Chamorro?",
    options: ["Buenas tatdes", "Buenas noches", "Mañana si Yu'os", "Adios"],
    correctIndex: 2,
    explanation: "'Mañana si Yu'os' means 'Good morning' in Chamorro, literally 'Morning with God'.",
    category: "language"
  },
  {
    question: "What does 'Nåna' mean in Chamorro?",
    options: ["Father", "Mother", "Grandmother", "Sister"],
    correctIndex: 1,
    explanation: "'Nåna' means 'mother' in Chamorro. 'Tåta' means 'father'.",
    category: "language"
  },
  
  // Food & Nature
  {
    question: "What is 'kelaguen' (also spelled kelaguen)?",
    options: ["A dance", "A citrus-marinated meat dish", "A type of bread", "A fishing net"],
    correctIndex: 1,
    explanation: "Kelaguen is a traditional Chamorro dish of meat (usually chicken, beef, or seafood) marinated in lemon juice and coconut.",
    category: "food"
  },
  {
    question: "What is 'red rice' traditionally colored with?",
    options: ["Tomatoes", "Achote (annatto) seeds", "Paprika", "Beets"],
    correctIndex: 1,
    explanation: "Red rice is colored with achote (annatto) seeds, giving it the distinctive red-orange color.",
    category: "food"
  },
  {
    question: "What is Guam's official territorial bird?",
    options: ["Ko'ko' (Guam Rail)", "Fruit Bat", "Coconut Crab", "Sea Eagle"],
    correctIndex: 0,
    explanation: "The Ko'ko' (Guam Rail) is Guam's territorial bird, saved from extinction through conservation efforts.",
    category: "nature"
  },
  {
    question: "What is the Chamorro name for coconut?",
    options: ["Niyok", "Manha", "Dågu", "Lemmai"],
    correctIndex: 0,
    explanation: "'Niyok' is coconut in Chamorro, an essential plant in Chamorro culture and cuisine.",
    category: "nature"
  },
  {
    question: "What invasive species has severely impacted Guam's bird population?",
    options: ["Rats", "Brown Tree Snake", "Wild Pigs", "Mongooses"],
    correctIndex: 1,
    explanation: "The Brown Tree Snake, accidentally introduced after WWII, has devastated Guam's native bird populations.",
    category: "nature"
  },
  
  // Modern Guam
  {
    question: "What is Guam's timezone?",
    options: ["Chamorro Standard Time (ChST)", "Pacific Standard Time", "Hawaii Time", "Japan Standard Time"],
    correctIndex: 0,
    explanation: "Guam uses Chamorro Standard Time (ChST), which is UTC+10, 15 hours ahead of U.S. East Coast.",
    category: "modern"
  },
  {
    question: "What nickname is Guam known by?",
    options: ["The Big Island", "Where America's Day Begins", "Paradise Island", "The Garden Island"],
    correctIndex: 1,
    explanation: "Guam is known as 'Where America's Day Begins' because it's one of the first U.S. territories to see the sunrise.",
    category: "modern"
  },
  {
    question: "Can people born in Guam vote in U.S. presidential elections?",
    options: ["Yes, always", "No, never", "Only if they move to a U.S. state", "Only in local elections"],
    correctIndex: 2,
    explanation: "Guam residents cannot vote in presidential elections unless they establish residency in a U.S. state.",
    category: "modern"
  },
];

const QUESTIONS_PER_GAME = 10;

// Difficulty settings
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, { time: number; label: string; description: string }> = {
  easy: { time: 30, label: 'Easy', description: '30 seconds per question' },
  medium: { time: 20, label: 'Medium', description: '20 seconds per question' },
  hard: { time: 10, label: 'Hard', description: '10 seconds per question' },
};

// Category configuration
const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  all: { label: 'All Categories', icon: '🎯' },
  culture: { label: 'Culture', icon: '🎭' },
  history: { label: 'History', icon: '📜' },
  geography: { label: 'Geography', icon: '🗺️' },
  language: { label: 'Language', icon: '🗣️' },
  food: { label: 'Food', icon: '🍽️' },
  nature: { label: 'Nature', icon: '🌺' },
  modern: { label: 'Modern', icon: '🏛️' },
};

export function CulturalTrivia() {
  const { theme, toggleTheme } = useTheme();
  const { isSignedIn } = useUser();
  const saveGameResultMutation = useSaveGameResult();
  const hasSavedRef = useRef(false);
  const { canUse, tryUse, getCount, getLimit } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  // Settings state
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isStarting, setIsStarting] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  
  // Game state
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'complete'>('setup');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DIFFICULTY_CONFIG.medium.time);
  const [timerActive, setTimerActive] = useState(false);

  // Timer effect
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    
    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timerActive, timeLeft]);

  // Handle time running out
  useEffect(() => {
    if (timerActive && timeLeft === 0 && !showResult) {
      handleAnswer(-1); // -1 indicates timeout
    }
  }, [timeLeft, timerActive, showResult]);

  // Shuffle and pick questions based on category
  const pickQuestions = useCallback(() => {
    let filtered = [...TRIVIA_QUESTIONS];
    
    // Filter by category if not 'all'
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }
    
    // Shuffle and pick
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(QUESTIONS_PER_GAME, shuffled.length));
  }, [selectedCategory]);
  
  // Get available question count for current category
  const availableQuestionCount = selectedCategory === 'all' 
    ? TRIVIA_QUESTIONS.length 
    : TRIVIA_QUESTIONS.filter(q => q.category === selectedCategory).length;

  // Start game
  const startGame = useCallback(async () => {
    if (!canUse('game')) {
      setShowUpgradePrompt(true);
      return;
    }
    
    setIsStarting(true);
    
    try {
      const success = await tryUse('game');
      if (!success) {
        setShowUpgradePrompt(true);
        return;
      }
      
      const newQuestions = pickQuestions();
      setQuestions(newQuestions);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setScore(0);
      setStreak(0);
      setMaxStreak(0);
      setTimeLeft(DIFFICULTY_CONFIG[difficulty].time);
      setTimerActive(true);
      hasSavedRef.current = false;
      setGameState('playing');
    } finally {
      setIsStarting(false);
    }
  }, [canUse, tryUse, pickQuestions, difficulty]);

  // Handle answer selection
  const handleAnswer = useCallback((answerIndex: number) => {
    if (showResult) return;
    
    setTimerActive(false);
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctIndex;
    
    if (isCorrect) {
      // Bonus points for time remaining
      const timeBonus = Math.floor(timeLeft * 5);
      const streakBonus = streak * 10;
      setScore(prev => prev + 100 + timeBonus + streakBonus);
      setStreak(prev => {
        const newStreak = prev + 1;
        setMaxStreak(current => Math.max(current, newStreak));
        return newStreak;
      });
    } else {
      setStreak(0);
    }
  }, [showResult, questions, currentQuestionIndex, timeLeft, streak]);

  // Move to next question
  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setTimeLeft(DIFFICULTY_CONFIG[difficulty].time);
      setTimerActive(true);
    } else {
      setGameState('complete');
    }
  }, [currentQuestionIndex, questions.length, difficulty]);

  // Save game result
  useEffect(() => {
    if (gameState === 'complete' && !hasSavedRef.current && isSignedIn) {
      hasSavedRef.current = true;
      
      const correctAnswers = Math.round(score / 100); // Approximate
      let stars = 1;
      if (correctAnswers >= 8) stars = 3;
      else if (correctAnswers >= 5) stars = 2;
      
      saveGameResultMutation.mutate({
        game_type: 'cultural_trivia',
        mode: 'challenge',
        category_id: selectedCategory,
        category_title: selectedCategory === 'all' ? 'All Categories' : CATEGORY_CONFIG[selectedCategory]?.label || 'Cultural Trivia',
        difficulty: difficulty,
        score: score,
        pairs: correctAnswers,
        stars,
      });
    }
  }, [gameState, score, isSignedIn, saveGameResultMutation, difficulty, selectedCategory]);

  // Calculate stars
  const getStars = () => {
    const percentage = (score / (QUESTIONS_PER_GAME * 100)) * 100;
    if (percentage >= 80) return 3;
    if (percentage >= 50) return 2;
    return 1;
  };

  // Setup screen
  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-gray-900 dark:to-slate-900 transition-colors duration-300">
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-cream-200 dark:border-slate-700 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/games" className="flex items-center gap-2 text-brown-600 dark:text-gray-400 hover:text-coral-500 dark:hover:text-ocean-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Games</span>
            </Link>
            <h1 className="text-lg font-bold text-brown-800 dark:text-white">Cultural Trivia</h1>
            <button onClick={toggleTheme} className="p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-brown-600" />}
            </button>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Game Description */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                🏝️
              </div>
              <div>
                <h2 className="text-xl font-bold text-brown-800 dark:text-white">Cultural Trivia</h2>
                <p className="text-sm text-brown-500 dark:text-gray-400">Test your Guam knowledge!</p>
              </div>
            </div>
            <p className="text-brown-600 dark:text-gray-400 text-sm">
              Answer questions about Chamorro culture, Guam history, geography, and language. 
              Answer quickly for bonus points and build streaks for even more!
            </p>
          </div>

          {/* Difficulty Selection */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-brown-800 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              Choose Difficulty
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setDifficulty('easy')}
                className={`p-3 rounded-xl transition-all duration-200 text-center ${
                  difficulty === 'easy'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg scale-[1.02]'
                    : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  <Sparkles className={`w-5 h-5 ${difficulty === 'easy' ? 'text-white' : 'text-emerald-500'}`} />
                </div>
                <p className={`text-sm font-medium ${difficulty === 'easy' ? 'text-white' : 'text-brown-800 dark:text-white'}`}>Easy</p>
                <p className={`text-xs ${difficulty === 'easy' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>30s</p>
              </button>
              <button
                onClick={() => setDifficulty('medium')}
                className={`p-3 rounded-xl transition-all duration-200 text-center ${
                  difficulty === 'medium'
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg scale-[1.02]'
                    : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  <Zap className={`w-5 h-5 ${difficulty === 'medium' ? 'text-white' : 'text-amber-500'}`} />
                </div>
                <p className={`text-sm font-medium ${difficulty === 'medium' ? 'text-white' : 'text-brown-800 dark:text-white'}`}>Medium</p>
                <p className={`text-xs ${difficulty === 'medium' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>20s</p>
              </button>
              <button
                onClick={() => setDifficulty('hard')}
                className={`p-3 rounded-xl transition-all duration-200 text-center ${
                  difficulty === 'hard'
                    ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg scale-[1.02]'
                    : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  <Flame className={`w-5 h-5 ${difficulty === 'hard' ? 'text-white' : 'text-red-500'}`} />
                </div>
                <p className={`text-sm font-medium ${difficulty === 'hard' ? 'text-white' : 'text-brown-800 dark:text-white'}`}>Hard</p>
                <p className={`text-xs ${difficulty === 'hard' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>10s</p>
              </button>
            </div>
          </div>

          {/* Category Selection */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-brown-800 dark:text-white mb-4">Select Category</h3>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(CATEGORY_CONFIG).map(([key, { label, icon }]) => {
                const count = key === 'all' 
                  ? TRIVIA_QUESTIONS.length 
                  : TRIVIA_QUESTIONS.filter(q => q.category === key).length;
                const isDisabled = count === 0;
                
                return (
                  <button
                    key={key}
                    onClick={() => !isDisabled && setSelectedCategory(key)}
                    disabled={isDisabled}
                    className={`p-2 rounded-xl transition-all duration-200 text-center ${
                      isDisabled
                        ? 'bg-cream-50 dark:bg-slate-900 opacity-40 cursor-not-allowed'
                        : selectedCategory === key
                          ? 'bg-emerald-500 dark:bg-teal-500 text-white shadow-lg scale-105'
                          : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                    <span className="text-lg">{icon}</span>
                    </div>
                    <p className={`text-[10px] font-medium mt-0.5 truncate ${selectedCategory === key && !isDisabled ? 'text-white' : 'text-brown-700 dark:text-gray-300'}`}>{label}</p>
                    <p className={`text-[9px] ${selectedCategory === key && !isDisabled ? 'text-white/80' : 'text-brown-400 dark:text-gray-500'}`}>{count}q</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startGame}
            disabled={availableQuestionCount === 0 || isStarting}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Start Trivia
              </>
            )}
          </button>
          
          {/* Daily limit indicator */}
          <p className="text-center text-xs text-brown-400 dark:text-gray-500">
            Games today: {getCount('game')} / {getLimit('game') === Infinity ? '∞' : getLimit('game')}
          </p>
        </main>
        
        {showUpgradePrompt && <UpgradePrompt feature="games" onClose={() => setShowUpgradePrompt(false)} />}
      </div>
    );
  }

  // Game complete
  if (gameState === 'complete') {
    const stars = getStars();
    const correctCount = questions.filter((q, i) => {
      // This is approximate - we don't track individual answers
      return true;
    }).length;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-gray-900 dark:to-slate-900 transition-colors duration-300">
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-cream-200 dark:border-slate-700 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/games" className="flex items-center gap-2 text-brown-600 dark:text-gray-400 hover:text-coral-500 dark:hover:text-ocean-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Games</span>
            </Link>
            <h1 className="text-lg font-bold text-brown-800 dark:text-white">Cultural Trivia</h1>
            <button onClick={toggleTheme} className="p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-brown-600" />}
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-cream-200 dark:border-slate-700 shadow-lg text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-brown-800 dark:text-white mb-2">Trivia Complete!</h2>
            
            {/* Stars */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3].map(star => (
                <span key={star} className={`text-4xl ${star <= stars ? '' : 'opacity-20'}`}>⭐</span>
              ))}
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-cream-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-brown-800 dark:text-white">{score}</p>
                <p className="text-sm text-brown-500 dark:text-gray-400">Score</p>
              </div>
              <div className="bg-cream-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-brown-800 dark:text-white">{maxStreak}</p>
                <p className="text-sm text-brown-500 dark:text-gray-400">Best Streak</p>
              </div>
            </div>
            
            {/* Message based on score */}
            <p className="text-brown-600 dark:text-gray-400 mb-6">
              {stars === 3 
                ? "Excellent! You're a Guam expert! 🏆"
                : stars === 2 
                ? "Great job! Keep learning about Chamorro culture! 📚"
                : "Good start! Play again to learn more about Guam! 🌺"}
            </p>
            
            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  hasSavedRef.current = false;
                  startGame();
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
              <Link
                to="/games"
                className="block w-full py-3 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 rounded-xl font-medium hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors"
              >
                Back to Games
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Playing state
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-gray-900 dark:to-slate-900 transition-colors duration-300">
      {/* Quit Confirmation Modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-brown-800 dark:text-white mb-2">Quit Game?</h3>
            <p className="text-brown-600 dark:text-gray-400 mb-6">
              Your progress will be lost and this game won't count towards your stats.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-2 px-4 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 rounded-xl font-medium hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors"
              >
                Keep Playing
              </button>
              <button
                onClick={() => {
                  setShowQuitConfirm(false);
                  setGameState('setup');
                  setTimerActive(false);
                }}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-cream-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowQuitConfirm(true)}
              className="flex items-center gap-1 text-brown-600 dark:text-gray-400 hover:text-coral-500 dark:hover:text-ocean-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Quit</span>
            </button>
            <div className="text-center">
              <p className="text-xs text-brown-500 dark:text-gray-400">Score</p>
              <p className="font-bold text-brown-800 dark:text-white">{score}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-brown-500 dark:text-gray-400">Streak</p>
              <p className="font-bold text-coral-500 dark:text-ocean-400">{streak}🔥</p>
            </div>
          </div>
          {/* Progress bar with question indicator */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-brown-500 dark:text-gray-400">{currentQuestionIndex + 1}/{questions.length}</span>
            <div className="flex-1 h-2 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Timer */}
        <div className="flex justify-center">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            timeLeft <= 5 
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' 
              : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300'
          }`}>
            <Timer className="w-5 h-5" />
            <span className="font-bold text-lg">{timeLeft}s</span>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700 shadow-sm">
          <div className="mb-4">
            <span className="text-xs px-2 py-1 bg-cream-100 dark:bg-slate-700 text-brown-600 dark:text-gray-400 rounded-full capitalize">
              {currentQuestion.category}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white mb-6">
            {currentQuestion.question}
          </h2>
          
          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctIndex;
              const showCorrect = showResult && isCorrect;
              const showWrong = showResult && isSelected && !isCorrect;
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={showResult}
                  className={`w-full p-4 rounded-xl text-left font-medium transition-all flex items-center gap-3 ${
                    showCorrect
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 text-green-800 dark:text-green-300'
                      : showWrong
                      ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500 text-red-800 dark:text-red-300'
                      : isSelected
                      ? 'bg-coral-100 dark:bg-ocean-900/30 border-2 border-coral-500 dark:border-ocean-400 text-brown-800 dark:text-white'
                      : 'bg-cream-50 dark:bg-slate-700/50 border-2 border-transparent hover:border-cream-300 dark:hover:border-slate-600 text-brown-700 dark:text-gray-300'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    showCorrect
                      ? 'bg-green-500 text-white'
                      : showWrong
                      ? 'bg-red-500 text-white'
                      : 'bg-cream-200 dark:bg-slate-600 text-brown-600 dark:text-gray-400'
                  }`}>
                    {showCorrect ? <CheckCircle className="w-5 h-5" /> : showWrong ? <XCircle className="w-5 h-5" /> : String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation (shown after answer) */}
        {showResult && currentQuestion.explanation && (
          <div className={`rounded-2xl p-4 ${
            selectedAnswer === currentQuestion.correctIndex
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          }`}>
            <p className="text-sm text-brown-700 dark:text-gray-300">
              <span className="font-bold">💡 </span>
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        {/* Next Button */}
        {showResult && (
          <button
            onClick={nextQuestion}
            className="w-full py-4 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next Question →' : 'See Results'}
          </button>
        )}
      </main>
    </div>
  );
}

export default CulturalTrivia;
