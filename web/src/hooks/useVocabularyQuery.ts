import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export interface VocabularyCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  word_count: number;
}

export interface VocabularyWord {
  chamorro: string;
  part_of_speech: string;
  definition: string;
  examples: {
    chamorro: string;
    english: string;
  }[];
}

export interface CategoriesResponse {
  categories: VocabularyCategory[];
  total_words: number;
}

export interface CategoryWordsResponse {
  words: VocabularyWord[];
  total: number;
  category: {
    id: string;
    title: string;
    icon: string;
    description: string;
  } | null;
}

export interface SearchResponse {
  results: VocabularyWord[];
  query: string;
  total: number;
}

// Fetch functions
async function fetchCategories(): Promise<CategoriesResponse> {
  const response = await fetch(`${API_URL}/api/vocabulary/categories`);
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  return response.json();
}

async function fetchCategoryWords(categoryId: string, limit: number = 50, offset: number = 0): Promise<CategoryWordsResponse> {
  const response = await fetch(`${API_URL}/api/vocabulary/categories/${categoryId}?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error('Failed to fetch category words');
  }
  return response.json();
}

async function searchVocabulary(query: string): Promise<SearchResponse> {
  if (query.length < 2) {
    return { results: [], query, total: 0 };
  }
  const response = await fetch(`${API_URL}/api/vocabulary/search?q=${encodeURIComponent(query)}&limit=50`);
  if (!response.ok) {
    throw new Error('Failed to search vocabulary');
  }
  return response.json();
}

// Hooks
export function useVocabularyCategories() {
  return useQuery({
    queryKey: ['vocabulary', 'categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 60, // 1 hour - dictionary data doesn't change often
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useCategoryWords(categoryId: string | undefined, limit: number = 50, offset: number = 0) {
  return useQuery({
    queryKey: ['vocabulary', 'category', categoryId, limit, offset],
    queryFn: () => fetchCategoryWords(categoryId!, limit, offset),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useVocabularySearch(query: string) {
  return useQuery({
    queryKey: ['vocabulary', 'search', query],
    queryFn: () => searchVocabulary(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Word of the Day types and hook
export interface WordOfTheDay {
  chamorro: string;
  english: string;
  part_of_speech: string;
  example: {
    chamorro: string;
    english: string;
  } | null;
  category: string;
  date: string;
}

async function fetchWordOfTheDay(): Promise<WordOfTheDay> {
  const response = await fetch(`${API_URL}/api/vocabulary/word-of-the-day`);
  if (!response.ok) {
    throw new Error('Failed to fetch word of the day');
  }
  return response.json();
}

export function useWordOfTheDay() {
  return useQuery({
    queryKey: ['vocabulary', 'word-of-the-day'],
    queryFn: fetchWordOfTheDay,
    staleTime: 1000 * 60 * 60, // 1 hour - word changes daily
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

// Dictionary Quiz types and hook
export interface DictionaryQuizQuestion {
  id: string;
  type: 'multiple_choice' | 'type_answer';
  question: string;
  options?: string[];
  correct_answer: number | string;
  acceptable_answers?: string[];
  hint?: string;
  explanation: string;
  chamorro_word: string;
  english_meaning: string;
}

export interface DictionaryQuizResponse {
  questions: DictionaryQuizQuestion[];
  total: number;
  category: string;
  available_words: number;
}

async function fetchDictionaryQuiz(
  categoryId: string,
  count: number = 10,
  types: string = 'multiple_choice,type_answer'
): Promise<DictionaryQuizResponse> {
  const response = await fetch(
    `${API_URL}/api/vocabulary/quiz/${categoryId}?count=${count}&types=${types}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch quiz');
  }
  return response.json();
}

export function useDictionaryQuiz(
  categoryId: string | undefined,
  count: number = 10,
  types: string = 'multiple_choice,type_answer',
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['vocabulary', 'quiz', categoryId, count, types],
    queryFn: () => fetchDictionaryQuiz(categoryId!, count, types),
    enabled: enabled && !!categoryId,
    staleTime: 0, // Always fetch fresh questions
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Single word lookup types and hook (enhanced with morphology)
export interface EnhancedWordResponse {
  found: boolean;
  word: string;
  definition: {
    chamorro: string;
    definition: string;
    part_of_speech: string;
    examples: { chamorro: string; english: string }[];
  } | null;
  root_word: string | null;
  morphology_note: string | null;
  suggestions: string[];
}

export interface SingleWordResponse {
  chamorro: string;
  definition: string;
  partOfSpeech?: string;
  pronunciation?: string;
  examples?: string[];
  rootWord?: string;
  morphologyNote?: string;
  suggestions?: string[];
  found: boolean;
}

async function fetchWord(word: string): Promise<SingleWordResponse> {
  try {
    // Use enhanced API with morphology
    const response = await fetch(`${API_URL}/api/vocabulary/word/${encodeURIComponent(word)}?enhanced=true`);
    if (!response.ok) {
      throw new Error('Failed to fetch word');
    }
    const data: EnhancedWordResponse = await response.json();
    
    return {
      found: data.found,
      chamorro: data.definition?.chamorro || data.root_word || word,
      definition: data.definition?.definition || '',
      partOfSpeech: data.definition?.part_of_speech,
      examples: data.definition?.examples?.map((e) => 
        e.chamorro || e.english || ''
      ).filter(Boolean),
      rootWord: data.root_word || undefined,
      morphologyNote: data.morphology_note || undefined,
      suggestions: data.suggestions,
    };
  } catch {
    return {
      found: false,
      chamorro: word,
      definition: '',
      suggestions: [],
    };
  }
}

export function useVocabularyWord(word: string | undefined) {
  return useQuery({
    queryKey: ['vocabulary', 'word', word],
    queryFn: () => fetchWord(word!),
    enabled: !!word && word.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour - word definitions don't change
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: false, // Don't retry if word not found
  });
}

