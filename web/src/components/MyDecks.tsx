import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ArrowLeft, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { useUserDecks } from '../hooks/useFlashcardsQuery';

export function MyDecks() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  
  // Use React Query hook
  const { data, isLoading, isError, error, refetch } = useUserDecks(user?.id, isLoaded && !!user);
  
  const decks = data?.decks || [];

  // Show sign-in prompt
  if (isLoaded && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between safe-area-top">
            <button
              onClick={() => navigate('/flashcards')}
              className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
            </button>
            
            <h1 className="text-lg font-semibold text-brown-800 dark:text-white">
              My Decks
            </h1>
            
            <div className="w-10" /> {/* Spacer */}
          </div>
        </div>

        {/* Sign-in prompt */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <BookOpen className="w-16 h-16 text-coral-400 dark:text-ocean-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-brown-800 dark:text-white mb-2">
              Sign in to view your decks
            </h2>
            <p className="text-brown-600 dark:text-gray-400 mb-6">
              Save custom flashcard decks and track your progress!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-coral-200/20 dark:border-ocean-500/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between safe-area-top">
          <button
            onClick={() => navigate('/flashcards')}
            className="p-2 rounded-lg hover:bg-coral-50 dark:hover:bg-ocean-900/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-coral-600 dark:text-ocean-400" />
          </button>
          
          <h1 className="text-lg font-semibold text-brown-800 dark:text-white">
            My Decks
          </h1>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-coral-600 dark:text-ocean-400 animate-spin" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 dark:text-red-400">{error?.message || 'Failed to load decks'}</p>
                <button
                  onClick={() => refetch()}
                  className="mt-4 px-4 py-2 rounded-lg bg-coral-500 hover:bg-coral-600 text-white font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-coral-400 dark:text-ocean-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-brown-800 dark:text-white mb-2">
                No saved decks yet
              </h2>
              <p className="text-brown-600 dark:text-gray-400 mb-6">
                Generate custom flashcards and save them to track your progress!
              </p>
              <Link
                to="/flashcards"
                className="inline-block px-6 py-3 rounded-lg bg-coral-500 hover:bg-coral-600 dark:bg-ocean-600 dark:hover:bg-ocean-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Browse Flashcards
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {decks.map((deck) => (
                <Link
                  key={deck.id}
                  to={`/flashcards/my-deck/${deck.id}`}
                  className="block p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-brown-800 dark:text-white mb-1">
                        {deck.title}
                      </h3>
                      <p className="text-sm text-brown-600 dark:text-gray-400 capitalize">
                        {deck.topic.replace('-', ' ')}
                      </p>
                    </div>
                    <BookOpen className="w-6 h-6 text-coral-500 dark:text-ocean-500 flex-shrink-0" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-coral-600 dark:text-ocean-400">
                        {deck.total_cards}
                      </p>
                      <p className="text-xs text-brown-600 dark:text-gray-400 mt-1">
                        Total Cards
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {deck.cards_reviewed}
                      </p>
                      <p className="text-xs text-brown-600 dark:text-gray-400 mt-1">
                        Reviewed
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {deck.cards_due}
                      </p>
                      <p className="text-xs text-brown-600 dark:text-gray-400 mt-1">
                        Due Today
                      </p>
                    </div>
                  </div>

                  {/* Created date */}
                  <p className="text-xs text-brown-500 dark:text-gray-500 mt-4">
                    Created {new Date(deck.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

