import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { getScenarioById, ConversationScenario, UsefulPhrase } from '../data/conversationScenarios';

interface Message {
  id: string;
  role: 'character' | 'user' | 'system';
  chamorro: string;
  english?: string;
  feedback?: {
    corrections?: string[];
    encouragement?: string;
  };
}

interface ConversationState {
  messages: Message[];
  turnCount: number;
  objectivesCompleted: string[];
  isComplete: boolean;
  finalScore?: number;
}

// Simple TTS function
const speakText = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES'; // Spanish is closest to Chamorro pronunciation
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  }
};

export function ConversationPractice() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();
  const [scenario, setScenario] = useState<ConversationScenario | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [showPhrases, setShowPhrases] = useState(false);
  const [conversation, setConversation] = useState<ConversationState>({
    messages: [],
    turnCount: 0,
    objectivesCompleted: [],
    isComplete: false
  });
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTranslations, setShowTranslations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load scenario
  useEffect(() => {
    if (scenarioId) {
      const s = getScenarioById(scenarioId);
      if (s) {
        setScenario(s);
      } else {
        navigate('/practice');
      }
    }
  }, [scenarioId, navigate]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  // Start conversation
  const startConversation = useCallback(() => {
    if (!scenario) return;
    
    setShowIntro(false);
    setConversation({
      messages: [{
        id: '1',
        role: 'character',
        chamorro: scenario.openingLine.chamorro,
        english: scenario.openingLine.english
      }],
      turnCount: 1,
      objectivesCompleted: [],
      isComplete: false
    });
    
    // Focus input after starting
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [scenario]);

  // Send message to AI
  const sendMessage = async () => {
    if (!userInput.trim() || !scenario || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      chamorro: userInput.trim()
    };

    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      turnCount: prev.turnCount + 1
    }));
    setUserInput('');
    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_URL}/api/conversation-practice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario_id: scenario.id,
          scenario_context: {
            setting: scenario.setting,
            character_name: scenario.characterName,
            character_role: scenario.characterRole,
            objectives: scenario.objectives,
            useful_phrases: scenario.usefulPhrases.map(p => p.chamorro)
          },
          conversation_history: conversation.messages.map(m => ({
            role: m.role,
            content: m.chamorro
          })),
          user_message: userInput.trim(),
          turn_count: conversation.turnCount,
          user_id: user?.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const characterMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'character',
        chamorro: data.chamorro_response,
        english: data.english_translation,
        feedback: data.feedback
      };

      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, characterMessage],
        turnCount: prev.turnCount + 1,
        objectivesCompleted: data.objectives_completed || prev.objectivesCompleted,
        isComplete: data.is_complete || false,
        finalScore: data.final_score
      }));

    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: (Date.now() + 1).toString(),
          role: 'system',
          chamorro: 'Sorry, there was an error. Please try again.',
          english: 'Sorry, there was an error. Please try again.'
        }]
      }));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Handle key press - Ctrl/Cmd+Enter to send (allows Enter for new lines on mobile)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Restart conversation
  const restartConversation = () => {
    setShowIntro(true);
    setConversation({
      messages: [],
      turnCount: 0,
      objectivesCompleted: [],
      isComplete: false
    });
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-2xl mx-auto pt-20 text-center">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Sign in Required
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Please sign in to practice conversations
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral-500"></div>
      </div>
    );
  }

  // Introduction Screen
  if (showIntro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link
                to="/practice"
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  {scenario.icon} {scenario.title}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {scenario.titleChamorro}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Scenario Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-3">
              📖 Scenario
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              {scenario.setting}
            </p>
            
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="text-3xl">🗣️</div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {scenario.characterName}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {scenario.characterRole}
                </p>
              </div>
            </div>
          </div>

          {/* Objectives */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-3">
              🎯 Objectives
            </h2>
            <ul className="space-y-2">
              {scenario.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">○</span>
                  {obj}
                </li>
              ))}
            </ul>
          </div>

          {/* Useful Phrases */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-3">
              💡 Useful Phrases
            </h2>
            <div className="space-y-3">
              {scenario.usefulPhrases.map((phrase, i) => (
                <PhraseCard key={i} phrase={phrase} />
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startConversation}
            className="w-full py-4 bg-gradient-to-r from-coral-500 to-coral-600 text-white font-semibold rounded-xl hover:from-coral-600 hover:to-coral-700 transition-all shadow-lg hover:shadow-xl"
          >
            ▶️ Start Conversation
          </button>
        </div>
      </div>
    );
  }

  // Conversation Complete Screen
  if (conversation.isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-700 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Conversation Complete!
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {scenario.title}
            </p>

            {/* Score */}
            {conversation.finalScore !== undefined && (
              <div className="mb-6">
                <div className="text-4xl font-bold text-coral-500 mb-2">
                  {conversation.finalScore}/5 ⭐
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {conversation.finalScore >= 4 ? 'Excellent work!' : 
                   conversation.finalScore >= 3 ? 'Good job!' : 
                   'Keep practicing!'}
                </p>
              </div>
            )}

            {/* Objectives Completed */}
            <div className="text-left mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Objectives:
              </h3>
              <ul className="space-y-1">
                {scenario.objectives.map((obj, i) => {
                  const completed = conversation.objectivesCompleted.includes(obj);
                  return (
                    <li key={i} className={`flex items-center gap-2 text-sm ${completed ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                      {completed ? '✅' : '○'} {obj}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={restartConversation}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                🔄 Try Again
              </button>
              <Link
                to="/practice"
                className="flex-1 py-3 px-4 bg-coral-500 text-white font-medium rounded-lg hover:bg-coral-600 transition-colors text-center"
              >
                📚 More Scenarios
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Conversation UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (conversation.messages.length > 1 && !window.confirm('Leave this conversation? Your progress will be lost.')) {
                    return;
                  }
                  navigate('/practice');
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">
                  {scenario.icon} {scenario.characterName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Turn {conversation.turnCount}/{scenario.estimatedTurns * 2}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTranslations(!showTranslations)}
                className={`p-2 rounded-lg transition-colors ${showTranslations ? 'bg-coral-100 dark:bg-coral-900/30 text-coral-600' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'}`}
                title={showTranslations ? 'Hide translations' : 'Show translations'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </button>
              <button
                onClick={() => setShowPhrases(!showPhrases)}
                className={`p-2 rounded-lg transition-colors ${showPhrases ? 'bg-coral-100 dark:bg-coral-900/30 text-coral-600' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'}`}
                title="Useful phrases"
              >
                💡
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Phrases Panel (collapsible) */}
      {showPhrases && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-2">💡 Useful Phrases:</p>
            <div className="flex flex-wrap gap-2">
              {scenario.usefulPhrases.slice(0, 5).map((phrase, i) => (
                <button
                  key={i}
                  onClick={() => setUserInput(prev => prev + (prev ? ' ' : '') + phrase.chamorro)}
                  className="text-xs px-2 py-1 bg-white dark:bg-slate-800 rounded border border-yellow-300 dark:border-yellow-700 text-slate-700 dark:text-slate-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                >
                  {phrase.chamorro}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {conversation.messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              characterName={scenario.characterName}
              showTranslation={showTranslations}
            />
          ))}
          
          {isLoading && (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <div className="animate-pulse">💬</div>
              <span className="text-sm">{scenario.characterName} is typing...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response in Chamorro..."
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-coral-500"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!userInput.trim() || isLoading}
              className="px-4 py-3 bg-coral-500 text-white rounded-xl hover:bg-coral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Phrase Card Component
function PhraseCard({ phrase }: { phrase: UsefulPhrase }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
      <div>
        <p className="font-medium text-slate-900 dark:text-white">
          {phrase.chamorro}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {phrase.english}
        </p>
        {phrase.pronunciation && (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            /{phrase.pronunciation}/
          </p>
        )}
      </div>
      <button
        onClick={() => speakText(phrase.chamorro)}
        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
        title="Listen"
      >
        🔊
      </button>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ 
  message, 
  characterName,
  showTranslation 
}: { 
  message: Message; 
  characterName: string;
  showTranslation: boolean;
}) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="text-center py-2">
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          {message.chamorro}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'order-1' : ''}`}>
        {/* Name */}
        <p className={`text-xs text-slate-500 dark:text-slate-400 mb-1 ${isUser ? 'text-right' : ''}`}>
          {isUser ? 'You' : characterName}
        </p>
        
        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-coral-500 text-white rounded-br-md' 
            : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-md shadow-sm border border-slate-200 dark:border-slate-600'
        }`}>
          {/* Chamorro text */}
          <p className="mb-1">{message.chamorro}</p>
          
          {/* English translation */}
          {showTranslation && message.english && !isUser && (
            <p className={`text-sm mt-2 pt-2 border-t ${
              isUser 
                ? 'border-coral-400 text-coral-100' 
                : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
            }`}>
              {message.english}
            </p>
          )}
        </div>

        {/* Feedback (for character messages after user input) */}
        {message.feedback && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            {message.feedback.corrections && message.feedback.corrections.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">📝 Suggestions:</p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  {message.feedback.corrections.map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </div>
            )}
            {message.feedback.encouragement && (
              <p className="text-sm text-green-700 dark:text-green-300">
                ✨ {message.feedback.encouragement}
              </p>
            )}
          </div>
        )}

        {/* Listen button for character messages */}
        {!isUser && (
          <button
            onClick={() => speakText(message.chamorro)}
            className="mt-1 text-xs text-slate-400 hover:text-coral-500 transition-colors"
          >
            🔊 Listen
          </button>
        )}
      </div>
    </div>
  );
}

