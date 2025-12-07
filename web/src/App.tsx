import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Chat } from './components/Chat';
import { HomePage } from './components/HomePage';
import { FlashcardDeckList } from './components/FlashcardDeckList';
import { FlashcardViewer } from './components/FlashcardViewer';
import { MyDecks } from './components/MyDecks';
import { SavedDeckViewer } from './components/SavedDeckViewer';
import { QuizList } from './components/QuizList';
import { QuizViewer } from './components/QuizViewer';
import { QuizReview } from './components/QuizReview';
import { QuizHistory } from './components/QuizHistory';
import { StoryList } from './components/StoryList';
import { StoryViewer } from './components/StoryViewer';
import { LengguahitaStoryViewer } from './components/LengguahitaStoryViewer';
import { Dashboard } from './components/Dashboard';
import { VocabularyList } from './components/VocabularyList';
import { VocabularyCategory } from './components/VocabularyCategory';
import { ConversationList } from './components/ConversationList';
import { ConversationPractice } from './components/ConversationPractice';
import { Games } from './components/Games';
import { MemoryMatch } from './components/MemoryMatch';
import { WordScramble } from './components/WordScramble';
import { FallingWords } from './components/FallingWords';
import { WordCatch } from './components/WordCatch';
import { ChamorroWordle } from './components/ChamorroWordle';
import { PricingPage } from './components/PricingPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Homepage - Learning dashboard */}
        <Route path="/" element={<HomePage />} />
        
        {/* Chat route - AI tutor */}
        <Route path="/chat" element={<Chat />} />
        
        {/* Protected routes - require authentication */}
        <Route path="/flashcards" element={<ProtectedRoute><FlashcardDeckList /></ProtectedRoute>} />
        <Route path="/flashcards/:topic" element={<ProtectedRoute><FlashcardViewer /></ProtectedRoute>} />
        <Route path="/flashcards/my-decks" element={<ProtectedRoute><MyDecks /></ProtectedRoute>} />
        <Route path="/flashcards/my-deck/:deckId" element={<ProtectedRoute><SavedDeckViewer /></ProtectedRoute>} />
        
        {/* Quiz routes */}
        <Route path="/quiz" element={<ProtectedRoute><QuizList /></ProtectedRoute>} />
        <Route path="/quiz/:categoryId" element={<ProtectedRoute><QuizViewer /></ProtectedRoute>} />
        <Route path="/quiz/review/:resultId" element={<ProtectedRoute><QuizReview /></ProtectedRoute>} />
        
        {/* Vocabulary routes - public (no auth required) */}
        <Route path="/vocabulary" element={<VocabularyList />} />
        <Route path="/vocabulary/:categoryId" element={<VocabularyCategory />} />
        
        {/* Story routes - public (no auth required) */}
        <Route path="/stories" element={<StoryList />} />
        <Route path="/stories/:storyId" element={<StoryViewer />} />
        <Route path="/stories/lengguahita/:storyId" element={<LengguahitaStoryViewer />} />
        
        {/* Dashboard routes - detailed progress */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/quiz-history" element={<ProtectedRoute><QuizHistory /></ProtectedRoute>} />
        
        {/* Conversation Practice routes */}
        <Route path="/practice" element={<ProtectedRoute><ConversationList /></ProtectedRoute>} />
        <Route path="/practice/:scenarioId" element={<ProtectedRoute><ConversationPractice /></ProtectedRoute>} />
        
        {/* Games routes - require authentication */}
        <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
        <Route path="/games/memory" element={<ProtectedRoute><MemoryMatch /></ProtectedRoute>} />
        <Route path="/games/scramble" element={<ProtectedRoute><WordScramble /></ProtectedRoute>} />
        <Route path="/games/falling" element={<ProtectedRoute><FallingWords /></ProtectedRoute>} />
        <Route path="/games/catch" element={<ProtectedRoute><WordCatch /></ProtectedRoute>} />
        <Route path="/games/wordle" element={<ProtectedRoute><ChamorroWordle /></ProtectedRoute>} />
        
        {/* Pricing page - public */}
        <Route path="/pricing" element={<PricingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
