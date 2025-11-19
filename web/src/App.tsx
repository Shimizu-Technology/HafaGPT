import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Chat } from './components/Chat';
import { FlashcardDeckList } from './components/FlashcardDeckList';
import { FlashcardViewer } from './components/FlashcardViewer';
import { MyDecks } from './components/MyDecks';
import { SavedDeckViewer } from './components/SavedDeckViewer';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route - anyone can see the chat UI */}
        <Route path="/" element={<Chat />} />
        
        {/* Protected routes - require authentication */}
        <Route path="/flashcards" element={<ProtectedRoute><FlashcardDeckList /></ProtectedRoute>} />
        <Route path="/flashcards/:topic" element={<ProtectedRoute><FlashcardViewer /></ProtectedRoute>} />
        <Route path="/flashcards/my-decks" element={<ProtectedRoute><MyDecks /></ProtectedRoute>} />
        <Route path="/flashcards/my-deck/:deckId" element={<ProtectedRoute><SavedDeckViewer /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
