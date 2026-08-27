import {
  Component,
  lazy,
  Suspense,
  useEffect,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/admin/AdminRoute';
import { BottomNav } from './components/BottomNav';
import { ScrollToTop } from './components/ScrollToTop';

function lazyNamed<TModule>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return lazy(async () => ({
    default: (await loader())[exportName] as ComponentType,
  }));
}

// Each page is loaded only when its route is visited. This keeps games,
// administration, charts, and the AI chat out of the initial home-page bundle.
const HomePage = lazyNamed(() => import('./components/HomePage'), 'HomePage');
const Chat = lazyNamed(() => import('./components/Chat'), 'Chat');
const LearningPathPage = lazyNamed(() => import('./components/LearningPathPage'), 'LearningPathPage');
const TopicWorkspacePage = lazyNamed(() => import('./components/TopicWorkspacePage'), 'TopicWorkspacePage');
const LessonPage = lazyNamed(() => import('./components/LessonPage'), 'LessonPage');
const FlashcardDeckList = lazyNamed(() => import('./components/FlashcardDeckList'), 'FlashcardDeckList');
const FlashcardViewer = lazyNamed(() => import('./components/FlashcardViewer'), 'FlashcardViewer');
const ReviewQueue = lazyNamed(() => import('./components/ReviewQueue'), 'ReviewQueue');
const MyDecks = lazyNamed(() => import('./components/MyDecks'), 'MyDecks');
const SavedDeckViewer = lazyNamed(() => import('./components/SavedDeckViewer'), 'SavedDeckViewer');
const QuizList = lazyNamed(() => import('./components/QuizList'), 'QuizList');
const QuizViewer = lazyNamed(() => import('./components/QuizViewer'), 'QuizViewer');
const QuizReview = lazyNamed(() => import('./components/QuizReview'), 'QuizReview');
const QuizHistory = lazyNamed(() => import('./components/QuizHistory'), 'QuizHistory');
const VocabularyList = lazyNamed(() => import('./components/VocabularyList'), 'VocabularyList');
const VocabularyCategory = lazyNamed(() => import('./components/VocabularyCategory'), 'VocabularyCategory');
const StoryList = lazyNamed(() => import('./components/StoryList'), 'StoryList');
const StoryViewer = lazyNamed(() => import('./components/StoryViewer'), 'StoryViewer');
const LengguahitaStoryViewer = lazyNamed(() => import('./components/LengguahitaStoryViewer'), 'LengguahitaStoryViewer');
const Dashboard = lazyNamed(() => import('./components/Dashboard'), 'Dashboard');
const ConversationList = lazyNamed(() => import('./components/ConversationList'), 'ConversationList');
const ConversationPractice = lazyNamed(() => import('./components/ConversationPractice'), 'ConversationPractice');
const Games = lazyNamed(() => import('./components/Games'), 'Games');
const MemoryMatch = lazyNamed(() => import('./components/MemoryMatch'), 'MemoryMatch');
const SoundMatch = lazyNamed(() => import('./components/SoundMatch'), 'SoundMatch');
const PicturePairs = lazyNamed(() => import('./components/PicturePairs'), 'PicturePairs');
const WordScramble = lazyNamed(() => import('./components/WordScramble'), 'WordScramble');
const FallingWords = lazyNamed(() => import('./components/FallingWords'), 'FallingWords');
const WordCatch = lazyNamed(() => import('./components/WordCatch'), 'WordCatch');
const ChamorroWordle = lazyNamed(() => import('./components/ChamorroWordle'), 'ChamorroWordle');
const Hangman = lazyNamed(() => import('./components/Hangman'), 'Hangman');
const CulturalTrivia = lazyNamed(() => import('./components/CulturalTrivia'), 'CulturalTrivia');
const ColorTouch = lazyNamed(() => import('./components/ColorTouch'), 'ColorTouch');
const NumberTap = lazyNamed(() => import('./components/NumberTap'), 'NumberTap');
const SimonSays = lazyNamed(() => import('./components/SimonSays'), 'SimonSays');
const PricingPage = lazyNamed(() => import('./components/PricingPage'), 'PricingPage');
const AboutPage = lazyNamed(() => import('./components/AboutPage'), 'AboutPage');
const SharedConversation = lazyNamed(() => import('./components/SharedConversation'), 'SharedConversation');
const SettingsPage = lazyNamed(() => import('./components/SettingsPage'), 'SettingsPage');
const AdminDashboard = lazyNamed(() => import('./components/admin/AdminDashboard'), 'AdminDashboard');
const AdminUsers = lazyNamed(() => import('./components/admin/AdminUsers'), 'AdminUsers');
const AdminUserDetail = lazyNamed(() => import('./components/admin/AdminUserDetail'), 'AdminUserDetail');
const AdminAnalytics = lazyNamed(() => import('./components/admin/AdminAnalytics'), 'AdminAnalytics');
const AdminAudioReview = lazyNamed(() => import('./components/admin/AdminAudioReview'), 'AdminAudioReview');
const AdminSettings = lazyNamed(() => import('./components/admin/AdminSettings'), 'AdminSettings');
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const SupportPage = lazy(() => import('./components/SupportPage'));

function RouteLoadingFallback() {
  return (
    <main
      className="flex min-h-[60vh] items-center justify-center px-4 pb-24"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-white px-5 py-4 text-brown-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-teal-200 border-t-teal-600 dark:border-gray-600 dark:border-t-ocean-400"
          aria-hidden="true"
        />
        <span className="text-sm font-medium">Loading page…</span>
      </div>
    </main>
  );
}

function BootSuccessMarker() {
  useEffect(() => {
    window.__hafagptMarkBootSuccessful?.();
  }, []);

  return null;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unable to load route', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-[60vh] items-center justify-center px-4 pb-24">
          <div className="max-w-sm rounded-2xl border border-cream-300 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h1 className="text-lg font-semibold text-brown-800 dark:text-white">
              This page needs a refresh
            </h1>
            <p className="mt-2 text-sm text-brown-600 dark:text-gray-300">
              A newer version may be available. Refresh to load the latest page.
            </p>
            <button
              type="button"
              className="mt-5 min-h-11 rounded-xl bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600 focus:outline-none focus:ring-2 focus:ring-coral-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RouteErrorBoundary>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
        {/* Homepage - Learning dashboard */}
        <Route path="/" element={<HomePage />} />
        
        {/* Chat route - AI tutor */}
        <Route path="/chat" element={<Chat />} />
        
        {/* Learning Path - Full map view */}
        <Route path="/learning" element={<ProtectedRoute><LearningPathPage /></ProtectedRoute>} />

        {/* Stable topic workspace */}
        <Route path="/learning/:topicId" element={<ProtectedRoute><TopicWorkspacePage /></ProtectedRoute>} />
        
        {/* Learning Path - Mini-Lessons */}
        <Route path="/learn/:topicId" element={<ProtectedRoute><LessonPage /></ProtectedRoute>} />
        
        {/* Protected routes - require authentication */}
        <Route path="/flashcards" element={<ProtectedRoute><FlashcardDeckList /></ProtectedRoute>} />
        <Route path="/flashcards/:topic" element={<ProtectedRoute><FlashcardViewer /></ProtectedRoute>} />
        <Route path="/flashcards/review" element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
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
        <Route path="/games/color-touch" element={<ProtectedRoute><ColorTouch /></ProtectedRoute>} />
        <Route path="/games/number-tap" element={<ProtectedRoute><NumberTap /></ProtectedRoute>} />
        <Route path="/games/simon-says" element={<ProtectedRoute><SimonSays /></ProtectedRoute>} />
        
        {/* Pricing page - public */}
        <Route path="/pricing" element={<PricingPage />} />
        
        {/* About page - public */}
        <Route path="/about" element={<AboutPage />} />
        
        {/* Privacy Policy - public */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        
        {/* Support page - public */}
        <Route path="/support" element={<SupportPage />} />
        
        {/* Shared conversation - public, no auth required */}
        <Route path="/share/:shareId" element={<SharedConversation />} />
        
        {/* Settings page - requires authentication */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        
        {/* Admin routes - require admin role */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/users/:userId" element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
        <Route path="/admin/audio" element={<AdminRoute><AdminAudioReview /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
          </Routes>
          {/* This commits only after the initial lazy route has loaded. */}
          <BootSuccessMarker />
        </Suspense>
      </RouteErrorBoundary>
      
      {/* Mobile bottom navigation - shows on mobile only */}
      <BottomNav />
    </BrowserRouter>
  );
}

export default App;
