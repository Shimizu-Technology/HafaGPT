import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Chat } from './components/Chat';
import { FlashcardDeckList } from './components/FlashcardDeckList';
import { FlashcardViewer } from './components/FlashcardViewer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/flashcards" element={<FlashcardDeckList />} />
        <Route path="/flashcards/:topic" element={<FlashcardViewer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
