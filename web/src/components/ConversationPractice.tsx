import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { getScenarioById, ConversationScenario, UsefulPhrase } from '../data/conversationScenarios';
import { PronunciationButton } from './PronunciationButton';
import { BookOpenCheck, Check, Circle, Languages, Lightbulb, MessageCircle, PartyPopper, Play, RotateCcw, Send, Sparkles, Target, UserRound } from 'lucide-react';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { ContentTrustNote } from './ContentTrustNote';
import { TTSDisclaimer } from './TTSDisclaimer';
import { CONVERSATION_CONTENT_TRUST } from '../data/contentTrust';
import { hasVisiblePracticeFeedback, serializeConversationHistory } from '../lib/conversationPractice';

interface Message {
  id: string;
  role: 'character' | 'user' | 'system';
  chamorro: string;
  english?: string;
  groundingStatus?: 'canonical_support' | 'source_support' | 'ai_only';
  feedback?: {
    corrections?: string[];
    suggestions?: string[];
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

/** Run a guided scenario while distinguishing authored content from AI feedback. */
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
          conversation_history: serializeConversationHistory(conversation.messages),
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
        feedback: data.feedback,
        groundingStatus: data.grounding_status === 'canonical_support'
          ? 'canonical_support'
          : data.grounding_status === 'source_support'
            ? 'source_support'
            : 'ai_only',
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

  // Handle key press - device-dependent Enter behavior
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Detect if mobile device (small screen or touch device)
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    
    if (e.key === 'Enter') {
      if (isMobile) {
        // Mobile: Don't send on Enter, use Send button instead
        // (This is a single-line input, so Enter would just be ignored anyway)
      } else {
        // Desktop: Enter = send
        e.preventDefault();
        sendMessage();
      }
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
          <MessageCircle className="mx-auto mb-4 h-14 w-14 text-coral-500 dark:text-ocean-300" aria-hidden="true" />
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
      <LearnerPageShell>
        <LearnerPageHeader title={scenario.title} subtitle={scenario.titleChamorro} icon={MessageCircle} backTo="/practice" backLabel="Back to conversation scenarios" maxWidthClassName="max-w-2xl" />

        {/* Content */}
        <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:py-8">
          <ContentTrustNote trust={CONVERSATION_CONTENT_TRUST} />
          {/* Scenario Card */}
          <div className="rounded-2xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-brown-950 dark:text-white">
              <MessageCircle className="h-5 w-5 text-coral-700 dark:text-ocean-300" aria-hidden="true" /> Scenario
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              {scenario.setting}
            </p>
            
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <UserRound className="h-7 w-7 text-coral-700 dark:text-ocean-300" aria-hidden="true" />
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
          <div className="rounded-2xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-brown-950 dark:text-white">
              <Target className="h-5 w-5 text-coral-700 dark:text-ocean-300" aria-hidden="true" /> Goals for this practice
            </h2>
            <ul className="space-y-2">
              {scenario.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-coral-600 dark:text-ocean-300" aria-hidden="true" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>

          {/* Useful Phrases */}
          <div className="rounded-2xl border border-cream-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-brown-950 dark:text-white">
              <Lightbulb className="h-5 w-5 text-coral-700 dark:text-ocean-300" aria-hidden="true" /> Useful phrases
            </h2>
            <div className="space-y-3">
              {scenario.usefulPhrases.map((phrase, i) => (
                <PhraseCard key={i} phrase={phrase} />
              ))}
            </div>
            <TTSDisclaimer variant="inline" className="mt-4" />
          </div>

          {/* Start Button */}
          <button
            onClick={startConversation}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral-600 py-4 font-semibold text-white hover:bg-coral-700 dark:bg-ocean-600 dark:hover:bg-ocean-700"
          >
            <Play className="h-5 w-5" aria-hidden="true" /> Start conversation
          </button>
        </main>
      </LearnerPageShell>
    );
  }

  // Conversation Complete Screen
  if (conversation.isComplete) {
    return (
      <LearnerPageShell>
        <LearnerPageHeader title="Practice complete" subtitle={scenario.title} icon={Check} backTo="/practice" backLabel="Back to conversation scenarios" maxWidthClassName="max-w-2xl" />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-2xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800 sm:p-8">
            <PartyPopper className="mx-auto mb-4 h-14 w-14 text-coral-500 dark:text-ocean-300" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Conversation Complete!
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {scenario.title}
            </p>

            {/* AI practice estimate */}
            {conversation.finalScore !== undefined && (
              <div className="mb-6">
                <div className="text-4xl font-bold text-coral-500 mb-2">
                  {conversation.finalScore}/5
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  AI practice estimate—not a proficiency grade
                </p>
              </div>
            )}

            <ContentTrustNote trust={CONVERSATION_CONTENT_TRUST} className="mb-6 text-left" compact />

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
                      {completed ? <Check className="h-4 w-4 flex-none" aria-hidden="true" /> : <Circle className="h-4 w-4 flex-none" aria-hidden="true" />} {obj}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={restartConversation}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-cream-100 px-4 py-3 font-semibold text-brown-700 hover:bg-cream-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                <RotateCcw className="h-5 w-5" aria-hidden="true" /> Try again
              </button>
              <Link
                to="/practice"
                className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-coral-600 px-4 py-3 text-center font-semibold text-white hover:bg-coral-700 dark:bg-ocean-600 dark:hover:bg-ocean-700"
              >
                More scenarios
              </Link>
            </div>
          </div>
        </main>
      </LearnerPageShell>
    );
  }

  // Main Conversation UI
  return (
    <LearnerPageShell className="flex min-h-[100dvh] flex-col !pb-0">
      <LearnerPageHeader
        title={scenario.characterName}
        subtitle={`${scenario.title} · Turn ${conversation.turnCount} of about ${scenario.estimatedTurns * 2}`}
        icon={MessageCircle}
        backTo="/practice"
        backLabel="Leave conversation"
        onBack={() => {
          if (conversation.messages.length > 1 && !window.confirm('Leave this conversation? Your progress will be lost.')) return;
          navigate('/practice');
        }}
        maxWidthClassName="max-w-2xl"
        trailing={(
          <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowTranslations(!showTranslations)}
                aria-label={showTranslations ? 'Hide translations' : 'Show translations'}
                aria-pressed={showTranslations}
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${showTranslations ? 'bg-coral-100 text-coral-700 dark:bg-ocean-950 dark:text-ocean-300' : 'text-brown-500 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-800'}`}
              >
                <Languages className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setShowPhrases(!showPhrases)}
                aria-label={showPhrases ? 'Hide useful phrases' : 'Show useful phrases'}
                aria-pressed={showPhrases}
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${showPhrases ? 'bg-coral-100 text-coral-700 dark:bg-ocean-950 dark:text-ocean-300' : 'text-brown-500 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-800'}`}
              >
                <Lightbulb className="h-5 w-5" aria-hidden="true" />
              </button>
          </div>
        )}
        below={(
          <div className="h-1.5 overflow-hidden rounded-full bg-cream-200 dark:bg-slate-700" role="progressbar" aria-label="Conversation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, (conversation.turnCount / (scenario.estimatedTurns * 2)) * 100)}>
            <div className="h-full bg-coral-600 transition-all dark:bg-ocean-500" style={{ width: `${Math.min(100, (conversation.turnCount / (scenario.estimatedTurns * 2)) * 100)}%` }} />
          </div>
        )}
      />

      {/* Phrases Panel (collapsible) */}
      {showPhrases && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-yellow-800 dark:text-yellow-200"><Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />Useful phrases</p>
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
              <MessageCircle className="h-4 w-4 animate-pulse" aria-hidden="true" />
              <span className="text-sm">{scenario.characterName} is typing...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t border-cream-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyPress}
              aria-label="Conversation response"
              placeholder="Write in Chamorro..."
              className="min-w-0 flex-1 rounded-xl bg-cream-100 px-4 py-3 text-base text-brown-950 placeholder-brown-500 focus:outline-none focus:ring-2 focus:ring-coral-500 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!userInput.trim() || isLoading}
              aria-label="Send response"
              className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-coral-600 text-white hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-ocean-600 dark:hover:bg-ocean-700"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </LearnerPageShell>
  );
}

/** Display an authored useful phrase with translation and pronunciation support. */
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
      <PronunciationButton text={phrase.chamorro} />
    </div>
  );
}

/** Render one practice message and any non-authoritative AI feedback. */
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

  const feedbackSuggestions = [
    ...(message.feedback?.suggestions ?? []),
    ...(message.feedback?.corrections ?? []),
  ];

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

        {!isUser && message.groundingStatus && (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {message.groundingStatus === 'canonical_support' ? (
              <><BookOpenCheck className="h-3 w-3" aria-hidden="true" />Canonical term matches included</>
            ) : message.groundingStatus === 'source_support' ? (
              <><BookOpenCheck className="h-3 w-3" aria-hidden="true" />Dictionary source matches included</>
            ) : (
              <><Sparkles className="h-3 w-3" aria-hidden="true" />AI-generated practice response</>
            )}
          </p>
        )}

        {/* Feedback (for character messages after user input) */}
        {message.feedback && hasVisiblePracticeFeedback(feedbackSuggestions, message.feedback.encouragement) && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            {feedbackSuggestions.length > 0 && (
              <div className="mb-2">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-blue-800 dark:text-blue-200"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />AI suggestions</p>
                <ul className="list-disc space-y-1 pl-4 text-sm text-blue-700 dark:text-blue-300">
                  {feedbackSuggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
            {message.feedback.encouragement && (
              <p className="flex items-start gap-1.5 text-sm text-green-700 dark:text-green-300">
                <Sparkles className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />{message.feedback.encouragement}
              </p>
            )}
          </div>
        )}

        {/* Listen button for character messages */}
        {!isUser && (
          <PronunciationButton text={message.chamorro} showLabel className="mt-1 px-2 text-slate-500 hover:text-coral-600" />
        )}
      </div>
    </div>
  );
}
