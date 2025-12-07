# 🌺 HåfaGPT - Chamorro Language Learning Chatbot

A beautiful, modern React web interface for learning Chamorro (the native language of Guam) powered by AI and Retrieval-Augmented Generation (RAG).

**Live Demo:** [Your Netlify URL]

## ✨ Features

### 🤖 AI-Powered Learning
- **3 Learning Modes:**
  - 🇺🇸 **English Mode** - Ask anything about Chamorro in English
  - 🇬🇺 **Chamorro Mode** - Full immersion with Chamorro-only responses
  - 📚 **Learn Mode** - Chamorro with detailed English breakdowns

- **Smart AI Responses:**
  - RAG-enhanced answers from authoritative grammar books and dictionaries
  - 45,000+ knowledge chunks from grammar books, dictionaries, and bilingual articles
  - Source citations with page numbers
  - Response time tracking

- **🎤 Speech-to-Text & 🔊 Text-to-Speech:**
  - Click microphone button to speak your question
  - Listen to Chamorro pronunciations with OpenAI TTS
  - Visual feedback with red pulse when recording

### 🎮 Learning Games (5 Games!)
- **Memory Match** - Flip cards to match Chamorro ↔ English pairs
- **Word Scramble** - Unscramble letters to spell Chamorro words
- **Falling Words** - Catch falling words by tapping correct translations
- **Word Catch** - Fruit Ninja-style word pair catching game
- **Chamorro Wordle** - Daily word puzzle with Chamorro keyboard
  - Daily Challenge (same word for everyone)
  - Practice Mode (Beginner/Challenge, Easy/Medium/Hard)

### 📚 Learning Tools
- **📝 Quizzes** - 6 categories, multiple question types, score tracking
- **🎴 Flashcards** - Curated decks + AI-generated cards
- **📖 Stories** - 24 bilingual stories with tap-to-translate
- **💬 Conversation Practice** - 7 AI role-play scenarios
- **📚 Vocabulary Browser** - 10,350+ dictionary words
- **📅 Daily Word** - New word every day with pronunciation

### 📊 Progress Tracking
- **Dashboard** - Track quizzes, games, and conversations
- **Stats** - Average scores, best categories, streaks
- **Game History** - Recent games with star ratings

### 💬 Conversation Management
- **Create & Organize** - Multiple conversations for different learning topics
- **Auto-naming** - Conversations titled from your first message
- **Rename** - Update conversation titles anytime (double-click or right-click)
- **Persistent** - Conversations saved and restored across sessions
- **Message History** - Full conversation history with automatic context
- **Soft Delete** - Clean up cluttered lists while preserving learning data

### 🎨 Beautiful UI/UX
- **Modern Design** - Clean, ChatGPT-inspired interface
- **Dark Mode** - Easy on the eyes for extended learning sessions
- **Responsive** - Optimized for desktop, tablet, and mobile
- **Sidebar Navigation** - Easy conversation switching
- **Context Menu** - Right-click for quick actions
- **Loading States** - Visual feedback with response times
- **Rotating Greetings** - "Håfa Adai" in multiple languages

### 🔐 Authentication & Security
- **Clerk Integration** - Secure user authentication
- **Required Sign-in** - Must be logged in to use chat
- **Public Landing Page** - Beautiful read-only demo for new users
- **User Accounts** - Save your conversations across devices
- **Profile Management** - Update settings and preferences

### 📊 Analytics & Monitoring
- **PostHog Integration** - User behavior analytics and product insights
- **Session Replay** - Watch user sessions to debug issues (privacy-protected)
- **Event Tracking** - Monitor feature usage and user engagement
- **Privacy-First** - Input fields masked, only metadata tracked
- **Performance Monitoring** - Track page load times and app performance

### ⚡ Performance
- **Progressive Web App (PWA)** - Install as native app on mobile/desktop
- **Fast Loading** - Optimized bundle size with code splitting
- **Offline Ready** - Service worker for offline functionality
- **Auto-deploy** - GitHub commits automatically deploy to Netlify

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Backend API running (see [HafaGPT-API](../HafaGPT-API))

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the root:

```env
# Backend API URL
VITE_API_URL=http://localhost:8000  # Development
# VITE_API_URL=https://your-api.onrender.com  # Production

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-key

# PostHog Analytics (Optional)
VITE_PUBLIC_POSTHOG_KEY=phc_your-posthog-key
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Get your Clerk key from: https://clerk.com
Get your PostHog key from: https://posthog.com

### 3. Start Development Server

**Local Development (Desktop Only):**
```bash
npm run dev
```

Visit: http://localhost:5173

**Mobile Testing (Network Access):**
```bash
./dev-network.sh
```

This will:
- ✅ Auto-detect your local IP address
- ✅ Start the dev server on your network (accessible from phone)
- ✅ Display the URL to access from your mobile device
- ✅ Example: `http://192.168.1.190:5173`

**Requirements:**
- Phone and computer must be on the same WiFi network
- Make sure firewall allows port 5173

### 4. Build for Production

```bash
npm run build
```

Output in `dist/` directory.

## 🎯 Usage

### Basic Chat
1. Select a learning mode (English/Chamorro/Learn)
2. Type your message or click 🎤 to speak
3. Get AI-powered responses with sources
4. Continue the conversation naturally

### Using Voice Input
1. Click the microphone button 🎤
2. Allow microphone access (first time only)
3. Speak your question clearly
4. Text appears automatically in the input box
5. Edit if needed, then press Send

### Managing Conversations
- **New Chat**: Click "+ New chat" button
- **Switch Chat**: Click any conversation in sidebar
- **Rename**: Double-click title or right-click → Rename
- **Delete**: Right-click → Delete (soft delete, data preserved)
- **Clear**: Red button to clear current conversation

### Keyboard Shortcuts
- `Enter` - Send message
- `Shift + Enter` - New line in message
- `Esc` - Close modals

## 🛠️ Tech Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Authentication:** Clerk
- **Analytics:** PostHog
- **State Management:** React Query (TanStack Query)
- **HTTP Client:** Fetch API
- **PWA:** Vite PWA Plugin
- **Deployment:** Netlify (auto-deploy on push)

## 📁 Project Structure

```
src/
├── components/
│   ├── Chat.tsx                    # Main chat interface
│   ├── ChatMessage.tsx             # Individual message display
│   ├── MessageInput.tsx            # Message input with send button
│   ├── ModeSelector.tsx            # Learning mode toggle
│   ├── ConversationSidebar.tsx     # Conversation list + management
│   ├── LoadingIndicator.tsx        # Loading animation
│   ├── UserProfile.tsx             # User profile dropdown
│   ├── SourcesList.tsx             # Source citations display
│   ├── ClearChatModal.tsx          # Confirmation modal
│   └── ThemeToggle.tsx             # Dark/light mode toggle
│
├── hooks/
│   ├── useChatbot.ts               # Chat API integration
│   ├── useConversations.ts         # Conversation CRUD operations
│   ├── useRotatingGreeting.ts      # Multi-language greetings
│   └── useScrollToBottom.ts        # Auto-scroll for new messages
│
├── App.tsx                          # Root component with Clerk provider
├── main.tsx                         # Entry point
├── index.css                        # Global styles + Tailwind
└── vite-env.d.ts                    # TypeScript declarations

public/
├── pwa-*.png                        # PWA icons (various sizes)
├── icon.png                         # App icon
└── manifest.webmanifest             # PWA manifest

dist/                                # Production build output (generated)
```

## 🔌 API Integration

The frontend connects to the HafaGPT FastAPI backend:

### Endpoints Used

**Chat:**
- `POST /api/chat` - Send messages, get responses

**Conversations:**
- `POST /api/conversations` - Create conversation
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/{id}/messages` - Get message history
- `PATCH /api/conversations/{id}` - Rename conversation
- `DELETE /api/conversations/{id}` - Delete conversation (soft)

**Authentication:**
- Clerk JWT tokens in `Authorization: Bearer {token}` header
- Anonymous mode supported (no auth header)

See [API Documentation](../HafaGPT-API/api/README.md) for details.

## 🚢 Deployment

### Netlify (Recommended)

**Automatic Setup:**
1. Push to GitHub
2. Connect repository to Netlify
3. Netlify auto-detects Vite configuration
4. Set environment variables in Netlify dashboard:
   ```
   VITE_API_URL=https://your-api.onrender.com
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_your-key
   VITE_PUBLIC_POSTHOG_KEY=phc_your-posthog-key
   VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```
5. Deploy! 🚀

**Auto-deploy:**
- Every push to `main` branch triggers automatic deployment
- Build command: `npm run build`
- Publish directory: `dist`

### Manual Deployment

Build and serve the `dist/` folder:

```bash
npm run build
npx serve dist
```

## 🎨 Customization

### Themes
Update `src/index.css` for colors and styles. The app uses Tailwind CSS with a dark theme by default.

### Branding
- Update icons in `public/`
- Modify `public/manifest.webmanifest` for PWA metadata
- Edit greetings in `src/hooks/useRotatingGreeting.ts`

### API URL
Set `VITE_API_URL` in `.env` to point to your backend.

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

### Environment Variables

**Development (`.env`):**
```env
VITE_API_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_PUBLIC_POSTHOG_KEY=phc_...
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**Production (Netlify):**
```env
VITE_API_URL=https://your-api.onrender.com
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_PUBLIC_POSTHOG_KEY=phc_...
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## 🐛 Troubleshooting

**"Failed to fetch" errors:**
- Check backend API is running
- Verify `VITE_API_URL` is correct
- Check CORS settings in backend

**Authentication issues:**
- Verify Clerk publishable key is correct
- Check if user is signed in
- Backend must have `CLERK_SECRET_KEY` set

**Conversations not loading:**
- Check browser console for errors
- Verify API endpoints are accessible
- Clear localStorage: `localStorage.clear()`

## 📚 Related Documentation

- **Backend API:** [HafaGPT-API README](../HafaGPT-API/README.md)
- **API Endpoints:** [API Documentation](../HafaGPT-API/api/README.md)
- **Clerk Auth:** https://clerk.com/docs
- **PostHog Analytics:** https://posthog.com/docs
- **Vite:** https://vitejs.dev
- **React:** https://react.dev

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (desktop + mobile)
5. Submit a pull request

## 📄 License

Educational project for learning Chamorro language.

## 🙏 Acknowledgments

- Chamorro language community
- Dr. Sandra Chung's Chamorro Grammar
- Clerk for authentication
- PostHog for analytics
- OpenAI for GPT-4o-mini
- Netlify for hosting

---

**Håfa Adai!** Enjoy learning Chamorro! 🌺
