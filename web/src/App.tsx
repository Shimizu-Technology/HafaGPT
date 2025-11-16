import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Chat } from './components/Chat';
import { FlashcardDeckList } from './components/FlashcardDeckList';
import { FlashcardViewer } from './components/FlashcardViewer';
import { MyDecks } from './components/MyDecks';
import { SavedDeckViewer } from './components/SavedDeckViewer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/flashcards" element={<FlashcardDeckList />} />
        <Route path="/flashcards/:topic" element={<FlashcardViewer />} />
        <Route path="/flashcards/my-decks" element={<MyDecks />} />
        <Route path="/flashcards/my-deck/:deckId" element={<SavedDeckViewer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
