/**
 * React Query hooks for Flashcard Progress API
 * 
 * Handles:
 * - Fetching user decks
 * - Fetching cards in a deck with progress
 * - Saving decks
 * - Reviewing cards (spaced repetition)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ===========================
// Types
// ===========================

interface FlashcardCard {
  front: string;
  back: string;
  pronunciation?: string | null;
  example?: string | null;
}

interface FlashcardProgressInfo {
  times_reviewed: number;
  last_reviewed: string | null;
  next_review: string | null;
  confidence: number;
}

interface FlashcardWithProgress {
  id: string;
  front: string;
  back: string;
  pronunciation: string | null;
  example: string | null;
  progress: FlashcardProgressInfo | null;
}

interface UserDeck {
  id: string;
  topic: string;
  title: string;
  card_type: string;
  total_cards: number;
  cards_reviewed: number;
  cards_due: number;
  created_at: string;
}

interface SaveDeckRequest {
  user_id: string;
  topic: string;
  title: string;
  card_type: string;
  cards: FlashcardCard[];
}

interface SaveDeckResponse {
  deck_id: string;
  message: string;
}

interface DeckCardsResponse {
  deck_id: string;
  topic: string;
  title: string;
  cards: FlashcardWithProgress[];
}

interface ReviewCardRequest {
  user_id: string;
  flashcard_id: string;
  confidence: 1 | 2 | 3;
}

interface ReviewCardResponse {
  next_review: string;
  message: string;
  days_until_next: number;
}

// ===========================
// Query Keys
// ===========================

export const flashcardKeys = {
  all: ['flashcards'] as const,
  decks: (userId: string) => ['flashcards', 'decks', userId] as const,
  deck: (deckId: string, userId: string) => ['flashcards', 'deck', deckId, userId] as const,
};

// ===========================
// API Functions
// ===========================

async function fetchUserDecks(userId: string): Promise<{ decks: UserDeck[] }> {
  const response = await fetch(`${API_URL}/api/flashcards/decks?user_id=${userId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch decks');
  }
  
  return response.json();
}

async function fetchDeckCards(deckId: string, userId: string): Promise<DeckCardsResponse> {
  const response = await fetch(`${API_URL}/api/flashcards/decks/${deckId}/cards?user_id=${userId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch deck cards');
  }
  
  return response.json();
}

async function saveDeck(request: SaveDeckRequest): Promise<SaveDeckResponse> {
  const response = await fetch(`${API_URL}/api/flashcards/decks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error('Failed to save deck');
  }
  
  return response.json();
}

async function reviewCard(request: ReviewCardRequest): Promise<ReviewCardResponse> {
  const response = await fetch(`${API_URL}/api/flashcards/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error('Failed to review card');
  }
  
  return response.json();
}

// ===========================
// React Query Hooks
// ===========================

/**
 * Fetch all decks for a user
 */
export function useUserDecks(userId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: flashcardKeys.decks(userId || ''),
    queryFn: () => fetchUserDecks(userId!),
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch cards in a specific deck with progress
 */
export function useDeckCards(deckId: string | undefined, userId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: flashcardKeys.deck(deckId || '', userId || ''),
    queryFn: () => fetchDeckCards(deckId!, userId!),
    enabled: enabled && !!deckId && !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Save a deck of flashcards
 */
export function useSaveDeck() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: saveDeck,
    onSuccess: (data, variables) => {
      // Invalidate user decks query to refetch the list
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.decks(variables.user_id),
      });
    },
  });
}

/**
 * Review a flashcard (spaced repetition)
 */
export function useReviewCard(deckId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: reviewCard,
    onSuccess: (data, variables) => {
      // Invalidate deck cards query to update progress
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.deck(deckId, variables.user_id),
      });
      
      // Also invalidate user decks to update statistics
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.decks(variables.user_id),
      });
    },
  });
}

