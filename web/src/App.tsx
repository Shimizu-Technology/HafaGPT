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
import { SoundMatch } from './components/SoundMatch';
import { PicturePairs } from './components/PicturePairs';
import { WordScramble } from './components/WordScramble';
import { FallingWords } from './components/FallingWords';
import { WordCatch } from './components/WordCatch';
import { ChamorroWordle } from './components/ChamorroWordle';
import { Hangman } from './components/Hangman';
import { CulturalTrivia } from './components/CulturalTrivia';
import { PricingPage } from './components/PricingPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/admin/AdminRoute';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminUserDetail } from './components/admin/AdminUserDetail';
import { AdminAnalytics } from './components/admin/AdminAnalytics';
import { AdminSettings } from './components/admin/AdminSettings';
import { SettingsPage } from './components/SettingsPage';
import { AboutPage } from './components/AboutPage';
import { SharedConversation } from './components/SharedConversation';
import { BottomNav } from './components/BottomNav';
import { PWAUpdateBanner } from './components/PWAUpdateBanner';

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
        <Route path="/games/sound-match" element={<ProtectedRoute><SoundMatch /></ProtectedRoute>} />
        <Route path="/games/picture-pairs" element={<ProtectedRoute><PicturePairs /></ProtectedRoute>} />
        <Route path="/games/scramble" element={<ProtectedRoute><WordScramble /></ProtectedRoute>} />
        <Route path="/games/falling" element={<ProtectedRoute><FallingWords /></ProtectedRoute>} />
        <Route path="/games/catch" element={<ProtectedRoute><WordCatch /></ProtectedRoute>} />
        <Route path="/games/wordle" element={<ProtectedRoute><ChamorroWordle /></ProtectedRoute>} />
        <Route path="/games/hangman" element={<ProtectedRoute><Hangman /></ProtectedRoute>} />
        <Route path="/games/trivia" element={<ProtectedRoute><CulturalTrivia /></ProtectedRoute>} />
        
        {/* Pricing page - public */}
        <Route path="/pricing" element={<PricingPage />} />
        
        {/* About page - public */}
        <Route path="/about" element={<AboutPage />} />
        
        {/* Shared conversation - public, no auth required */}
        <Route path="/share/:shareId" element={<SharedConversation />} />
        
        {/* Settings page - requires authentication */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        
        {/* Admin routes - require admin role */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/users/:userId" element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
      </Routes>
      
      {/* Mobile bottom navigation - shows on mobile only */}
      <BottomNav />
      
      {/* PWA update notification */}
      <PWAUpdateBanner />
    </BrowserRouter>
  );
}

export default App;
