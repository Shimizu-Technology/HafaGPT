import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Play, Timer, CheckCircle, XCircle, Loader2, Sparkles, Zap, Flame, Target, Drama, ScrollText, Map, Languages, UtensilsCrossed, Flower2, Landmark, Building2, Trophy, Star, Lightbulb, type LucideIcon } from 'lucide-react';
import { useSaveGameResult } from '../hooks/useGamesQuery';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';
import { formatUsageSummary } from '../lib/usageDisplay';
import { GamePage, GamePageHeader, GameProgress } from './games/GamePage';

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
    explanation: "'Håfa Adai' is the traditional Chamorro greeting, used to mean 'Hello' or 'Hi'.",
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
    options: ["Hånom", "Tåsi", "Uchan", "Aire"],
    correctIndex: 0,
    explanation: "'Hånom' means 'water'. 'Tåsi' means 'sea/ocean', and 'Uchan' means 'rain'.",
    category: "language"
  },
  {
    question: "How do you say 'Good morning' in Chamorro?",
    options: ["Buenas tåtdes", "Buenas noches", "Buenas dias", "Adios"],
    correctIndex: 2,
    explanation: "'Buenas dias' means 'Good morning' or 'Good day' in Chamorro.",
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
    question: "What is 'kelaguen'?",
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
    options: ["Niyok", "Månha", "Dågu", "Lemmai"],
    correctIndex: 0,
    explanation: "'Niyok' is coconut/coconut palm in Chamorro; 'månha' is green coconut with tender meat.",
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
const CATEGORY_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  all: { label: 'All Categories', icon: Target },
  culture: { label: 'Culture', icon: Drama },
  history: { label: 'History', icon: ScrollText },
  geography: { label: 'Geography', icon: Map },
  language: { label: 'Language', icon: Languages },
  food: { label: 'Food', icon: UtensilsCrossed },
  nature: { label: 'Nature', icon: Flower2 },
  modern: { label: 'Modern', icon: Building2 },
};

export function CulturalTrivia() {
  const navigate = useNavigate();
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 120);
    return () => window.clearTimeout(timer);
  }, [gameState]);

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
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
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

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timerActive, timeLeft]);

  useEffect(() => {
    if (timerActive && timeLeft === 0 && !showResult) {
      handleAnswer(-1);
    }
  }, [timeLeft, timerActive, showResult, handleAnswer]);

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

  const handleBack = () => {
    if (gameState === 'playing') {
      setTimerActive(false);
      setShowQuitConfirm(true);
      return;
    }
    navigate('/games');
  };

  const keepPlaying = () => {
    setShowQuitConfirm(false);
    if (!showResult) {
      setTimerActive(true);
    }
  };

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
      <GamePage>
        <GamePageHeader
          title="Cultural Trivia"
          subtitle="Test what you know about Guam and Chamorro culture."
          icon={Landmark}
          onBack={handleBack}
        />

        <main className="mx-auto max-w-2xl space-y-4 px-3 py-4 sm:px-4 sm:py-6">
          <section className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-brown-800 dark:text-white">
              <Zap className="h-5 w-5 text-coral-600 dark:text-teal-300" aria-hidden="true" />
              Choose Difficulty
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDifficulty('easy')}
                aria-pressed={difficulty === 'easy'}
                className={`min-h-20 rounded-xl p-3 text-center transition-all duration-200 ${
                  difficulty === 'easy'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                }`}
              >
                <Sparkles className={`mx-auto mb-1 h-5 w-5 ${difficulty === 'easy' ? 'text-white' : 'text-emerald-600'}`} aria-hidden="true" />
                <p className={`text-sm font-medium ${difficulty === 'easy' ? 'text-white' : 'text-brown-800 dark:text-white'}`}>Easy</p>
                <p className={`text-xs ${difficulty === 'easy' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>30s</p>
              </button>
              <button
                type="button"
                onClick={() => setDifficulty('medium')}
                aria-pressed={difficulty === 'medium'}
                className={`min-h-20 rounded-xl p-3 text-center transition-all duration-200 ${
                  difficulty === 'medium'
                    ? 'bg-amber-600 text-white shadow-lg'
                    : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                }`}
              >
                <Zap className={`mx-auto mb-1 h-5 w-5 ${difficulty === 'medium' ? 'text-white' : 'text-amber-600'}`} aria-hidden="true" />
                <p className={`text-sm font-medium ${difficulty === 'medium' ? 'text-white' : 'text-brown-800 dark:text-white'}`}>Medium</p>
                <p className={`text-xs ${difficulty === 'medium' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>20s</p>
              </button>
              <button
                type="button"
                onClick={() => setDifficulty('hard')}
                aria-pressed={difficulty === 'hard'}
                className={`min-h-20 rounded-xl p-3 text-center transition-all duration-200 ${
                  difficulty === 'hard'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                }`}
              >
                <Flame className={`mx-auto mb-1 h-5 w-5 ${difficulty === 'hard' ? 'text-white' : 'text-red-600'}`} aria-hidden="true" />
                <p className={`text-sm font-medium ${difficulty === 'hard' ? 'text-white' : 'text-brown-800 dark:text-white'}`}>Hard</p>
                <p className={`text-xs ${difficulty === 'hard' ? 'text-white/80' : 'text-brown-500 dark:text-gray-400'}`}>10s</p>
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-3 font-semibold text-brown-800 dark:text-white">Choose a topic</h2>
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Choose a trivia topic">
              {Object.entries(CATEGORY_CONFIG).map(([key, { label, icon }]) => {
                const count = key === 'all' 
                  ? TRIVIA_QUESTIONS.length 
                  : TRIVIA_QUESTIONS.filter(q => q.category === key).length;
                const isDisabled = count === 0;
                const CategoryIcon = icon;
                
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => !isDisabled && setSelectedCategory(key)}
                    disabled={isDisabled}
                    aria-pressed={selectedCategory === key}
                    className={`min-h-20 min-w-24 flex-none rounded-xl p-2 text-center transition-all duration-200 ${
                      isDisabled
                        ? 'bg-cream-50 dark:bg-slate-900 opacity-40 cursor-not-allowed'
                        : selectedCategory === key
                          ? 'bg-coral-600 text-white shadow-lg dark:bg-teal-600'
                          : 'bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <CategoryIcon className="mx-auto mb-1 h-5 w-5" aria-hidden="true" />
                    <p className="truncate text-xs font-medium">{label}</p>
                    <p className={`text-[10px] ${selectedCategory === key && !isDisabled ? 'text-white/80' : 'text-brown-400 dark:text-gray-500'}`}>{count} questions</p>
                  </button>
                );
              })}
            </div>
          </section>

          <details className="rounded-2xl border border-cream-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
            <summary className="cursor-pointer font-semibold text-brown-800 dark:text-white">How scoring works</summary>
            <p className="mt-3 leading-relaxed text-brown-600 dark:text-gray-400">Correct answers earn points. Faster answers and answer streaks earn bonuses.</p>
          </details>

          <button
            type="button"
            onClick={startGame}
            disabled={availableQuestionCount === 0 || isStarting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral-600 px-4 font-bold text-white transition-colors hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-700"
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
          
          <p className="text-center text-xs text-brown-400 dark:text-gray-500">
            {formatUsageSummary(getCount('game'), getLimit('game'))}
          </p>
        </main>
        
        {showUpgradePrompt && <UpgradePrompt feature="game" onClose={() => setShowUpgradePrompt(false)} />}
      </GamePage>
    );
  }

  // Game complete
  if (gameState === 'complete') {
    const stars = getStars();
    
    return (
      <GamePage>
        <GamePageHeader title="Cultural Trivia" subtitle="Your results" icon={Landmark} onBack={handleBack} />
        <main className="mx-auto max-w-md px-3 py-6 sm:px-4">
          <section className="text-center" aria-labelledby="trivia-result-title">
            <span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <Trophy className="h-10 w-10" aria-hidden="true" />
            </span>
            <p className="mb-1 text-sm font-semibold text-coral-700 dark:text-teal-300">Game complete</p>
            <h2 id="trivia-result-title" className="text-2xl font-bold text-brown-950 dark:text-white">Trivia complete</h2>

            <div className="my-5 flex justify-center gap-1" aria-label={`${stars} out of 3 stars`}>
              {[1, 2, 3].map(star => (
                <Star key={star} className={`h-9 w-9 ${star <= stars ? 'fill-amber-400 text-amber-400' : 'text-cream-300 dark:text-slate-600'}`} aria-hidden="true" />
              ))}
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-2xl font-bold text-brown-950 dark:text-white">{score}</p>
                <p className="text-sm text-brown-500 dark:text-gray-400">Points</p>
              </div>
              <div className="rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-2xl font-bold text-brown-950 dark:text-white">{maxStreak}</p>
                <p className="text-sm text-brown-500 dark:text-gray-400">Best streak</p>
              </div>
            </div>

            <p className="mb-6 text-brown-600 dark:text-gray-400">
              {stars === 3
                ? "Excellent—you know Guam well."
                : stars === 2
                  ? 'Great work. Keep exploring Chamorro culture.'
                  : 'Good start. Play again to learn more about Guam.'}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  hasSavedRef.current = false;
                  startGame();
                }}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-4 font-semibold text-brown-700 hover:bg-cream-100 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
                Play again
              </button>
              <button type="button" onClick={() => navigate('/games')} className="min-h-12 rounded-xl bg-coral-600 px-4 font-semibold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700">
                More games
              </button>
            </div>
          </section>
        </main>
      </GamePage>
    );
  }

  // Playing state
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <GamePage>
      {/* Quit Confirmation Modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" role="dialog" aria-modal="true" aria-labelledby="quit-trivia-title">
            <h2 id="quit-trivia-title" className="mb-2 text-lg font-bold text-brown-800 dark:text-white">Leave this game?</h2>
            <p className="text-brown-600 dark:text-gray-400 mb-6">
              Your progress will be lost and this game won't count towards your stats.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={keepPlaying}
                className="flex-1 py-2 px-4 bg-cream-100 dark:bg-slate-700 text-brown-700 dark:text-gray-300 rounded-xl font-medium hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQuitConfirm(false);
                  setTimerActive(false);
                  navigate('/games');
                }}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                Leave game
              </button>
            </div>
          </div>
        </div>
      )}
      
      <GamePageHeader
        title="Cultural Trivia"
        subtitle={`Question ${currentQuestionIndex + 1} of ${questions.length}`}
        icon={Landmark}
        onBack={handleBack}
        trailing={(
          <div className={`flex min-h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-bold ${timeLeft <= 5 ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' : 'bg-cream-100 text-brown-700 dark:bg-slate-700 dark:text-gray-200'}`} aria-label={`${timeLeft} seconds remaining`}>
            <Timer className="h-4 w-4" aria-hidden="true" />
            {timeLeft}s
          </div>
        )}
      />

      <main className="mx-auto max-w-lg space-y-4 px-3 py-4 sm:px-4 sm:py-6">
        <GameProgress current={currentQuestionIndex + 1} total={questions.length} score={score} streak={streak} />

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
                  type="button"
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={showResult}
                  aria-pressed={isSelected}
                  className={`w-full p-4 rounded-xl text-left font-medium transition-all flex items-center gap-3 ${
                    showCorrect
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 text-green-800 dark:text-green-300'
                      : showWrong
                      ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500 text-red-800 dark:text-red-300'
                      : isSelected
                      ? 'bg-coral-100 dark:bg-teal-950/30 border-2 border-coral-500 dark:border-teal-400 text-brown-800 dark:text-white'
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
              <Lightbulb className="mr-1 inline h-4 w-4" aria-hidden="true" />
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        {/* Next Button */}
        {showResult && (
          <button
            type="button"
            onClick={nextQuestion}
            className="min-h-12 w-full rounded-xl bg-coral-600 px-4 font-bold text-white transition-colors hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next Question →' : 'See Results'}
          </button>
        )}
      </main>
    </GamePage>
  );
}

export default CulturalTrivia;
