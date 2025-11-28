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
import { Dashboard } from './components/Dashboard';
import { VocabularyList } from './components/VocabularyList';
import { VocabularyCategory } from './components/VocabularyCategory';
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
        
        {/* Dashboard route - detailed progress */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
