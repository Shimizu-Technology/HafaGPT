import { keepPreviousData, queryOptions, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ContentTrust } from '../data/contentTrust';

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
  word_id?: string;
  source_id?: string;
  chamorro: string;
  part_of_speech: string;
  definition: string;
  examples: {
    chamorro: string;
    english: string;
  }[];
  trust?: ContentTrust;
}

export interface CategoriesResponse {
  categories: VocabularyCategory[];
  total_words: number;
}

export interface CategoryWordsResponse {
  words: VocabularyWord[];
  total: number;
  category_total?: number;
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

/** Search first, then paginate; each query owns its pages and cannot mix categories. */
export function useCategoryWordPages(categoryId: string | undefined, query: string, limit = 50) {
  return useInfiniteQuery({
    queryKey: ['vocabulary', 'category-pages', categoryId, query.trim(), limit],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }): Promise<CategoryWordsResponse> => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(pageParam), q: query.trim() });
      const response = await fetch(`${API_URL}/api/vocabulary/categories/${encodeURIComponent(categoryId!)}?${params}`, { signal });
      if (!response.ok) throw new Error('Could not load dictionary words');
      let result: CategoryWordsResponse = await response.json();
      if (!query.trim() || result.category_total !== undefined) return result;
      // A web deploy may precede the API deploy. Older APIs ignore q, so read
      // every category page before filtering instead of calling those words matches.
      if (pageParam > 0) {
        const first = await fetch(`${API_URL}/api/vocabulary/categories/${encodeURIComponent(categoryId!)}?limit=500&offset=0`, { signal });
        if (!first.ok) throw new Error('Could not search all dictionary words');
        result = await first.json();
      }
      const allWords = [...result.words];
      while (allWords.length < result.total) {
        const next = await fetch(`${API_URL}/api/vocabulary/categories/${encodeURIComponent(categoryId!)}?limit=500&offset=${allWords.length}`, { signal });
        if (!next.ok) throw new Error('Could not search all dictionary words');
        const page: CategoryWordsResponse = await next.json();
        if (!page.words.length) throw new Error('Category search is temporarily unavailable');
        allWords.push(...page.words);
      }
      const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f'’`]/g, '').toLowerCase().trim();
      const search = normalize(query);
      const matches = allWords.filter(word => normalize(word.chamorro).includes(search) || normalize(word.definition).includes(search));
      return { ...result, words: matches.slice(pageParam, pageParam + limit), total: matches.length, category_total: result.total };
    },
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.words.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[2] === categoryId ? keepPreviousData(previous) : undefined,
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 60,
  });
}

export function useVocabularySearch(query: string) {
  return useQuery({
    queryKey: ['vocabulary', 'search', query],
    queryFn: () => searchVocabulary(query),
    // Avoid collapsing the scroll container between keystrokes.
    placeholderData: keepPreviousData,
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Word of the Day types and hook
export interface WordOfTheDay {
  word_id?: string;
  chamorro: string;
  english: string;
  part_of_speech: string;
  example: {
    chamorro: string;
    english: string;
  } | null;
  category: string;
  date: string;
  /** The API's clock (UTC, ISO 8601), which lets a device whose clock is off still follow the Guam date. */
  server_time?: string;
  trust?: ContentTrust;
}

const WORD_OF_THE_DAY_TIMEOUT_MS = 10_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const GUAM_UTC_OFFSET_MS = 10 * 60 * 60 * 1000; // Guam has no daylight saving time

class WordOfTheDayTimeout extends Error {}

// The API picks the word by the Guam date on its own clock. A device clock a few
// minutes fast or slow would turn the date over at the wrong moment, so the
// offset between the two is learned from each response and applied here.
let serverClockOffsetMs = 0;
const serverClockListeners = new Set<() => void>();
const SERVER_CLOCK_JITTER_MS = 1_000;
// With an API that does not report its time, a device that is ahead keeps asking until the API turns over.
const STALE_WORD_RETRY_MS = [30_000, 60_000, 2 * 60_000, 5 * 60_000];

function serverNow(): number {
  return Date.now() + serverClockOffsetMs;
}

function learnServerClock(serverTime: string | undefined, sentAt: number, receivedAt: number): void {
  const server = Date.parse(serverTime ?? '');
  if (!Number.isFinite(server)) return;
  // The reply was written about halfway through the round trip.
  const offset = server - (sentAt + receivedAt) / 2;
  if (Math.abs(offset - serverClockOffsetMs) < SERVER_CLOCK_JITTER_MS) return;
  serverClockOffsetMs = offset;
  serverClockListeners.forEach((listener) => listener());
}

/** Test hook: forget what a previous response taught about the device clock. */
export function resetServerClockOffset(): void {
  serverClockOffsetMs = 0;
}

/** The Guam calendar date ("2026-11-04"), which is how the API picks the word. */
export function guamDateKey(now: number = serverNow()): string {
  return new Date(now + GUAM_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

export function msUntilGuamMidnight(now: number = serverNow()): number {
  return DAY_MS - ((now + GUAM_UTC_OFFSET_MS) % DAY_MS);
}

async function fetchWordOfTheDay({ signal }: { signal?: AbortSignal } = {}): Promise<WordOfTheDay> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, WORD_OF_THE_DAY_TIMEOUT_MS);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const sentAt = Date.now();
  try {
    const response = await fetch(`${API_URL}/api/vocabulary/word-of-the-day`, { signal: controller.signal });
    if (!response.ok) {
      throw new Error('Failed to fetch word of the day');
    }
    const word: WordOfTheDay = await response.json();
    learnServerClock(word.server_time, sentAt, Date.now());
    return word;
  } catch (error) {
    if (timedOut) throw new WordOfTheDayTimeout('Word of the day timed out');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

/**
 * Shared by the hook and by callers that start the request before the card's code has loaded.
 * The Guam date is part of the key so a word cached yesterday is never served as today's.
 */
export function wordOfTheDayQueryOptions(date: string = guamDateKey()) {
  return queryOptions({
    queryKey: ['vocabulary', 'word-of-the-day', date],
    queryFn: fetchWordOfTheDay,
    // A reply for another day (the device asked for a date the API had not reached) is not this key's word.
    staleTime: (query) => (query.state.data && query.state.data.date !== date ? 0 : 1000 * 60 * 60), // word changes daily
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    // A stalled request already waited the full timeout; show the unavailable state instead of waiting again.
    retry: (failureCount, error) => !(error instanceof WordOfTheDayTimeout) && failureCount < 1,
  });
}

/** Tracks the Guam date, moving at Guam midnight and when a sleeping tab or restored page resumes. */
function useGuamDate(): string {
  const [date, setDate] = useState(() => guamDateKey());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const sync = () => {
      clearTimeout(timer);
      setDate(guamDateKey());
      // The extra second keeps a slightly early timer from firing before the date turns over.
      timer = setTimeout(sync, msUntilGuamMidnight() + 1000);
    };
    const onResume = () => { if (document.visibilityState === 'visible') sync(); };
    sync();
    serverClockListeners.add(sync);
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('pageshow', onResume);
    return () => {
      clearTimeout(timer);
      serverClockListeners.delete(sync);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('pageshow', onResume);
    };
  }, []);
  return date;
}

export function useWordOfTheDay() {
  const queryClient = useQueryClient();
  const date = useGuamDate();
  // Keep showing the word on screen while the next day's loads, so midnight never blanks the card.
  const query = useQuery({ ...wordOfTheDayQueryOptions(date), placeholderData: keepPreviousData });
  const { data, refetch } = query;
  const servedDate = data?.date;

  // The word the API sent belongs to the date the API says, whatever date the device asked for.
  useEffect(() => {
    if (data && servedDate && servedDate !== date) {
      queryClient.setQueryData(wordOfTheDayQueryOptions(servedDate).queryKey, data);
    }
  }, [data, servedDate, date, queryClient]);

  // The device says it is a later day than the API does and the API did not say what time it is:
  // ask again until the API turns over rather than leaving yesterday's word up.
  const deviceAhead = Boolean(servedDate && servedDate < date && !data?.server_time);
  useEffect(() => {
    if (!deviceAhead) return undefined;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;
    const retry = () => {
      void refetch();
      timer = setTimeout(retry, STALE_WORD_RETRY_MS[Math.min(++attempt, STALE_WORD_RETRY_MS.length - 1)]);
    };
    timer = setTimeout(retry, STALE_WORD_RETRY_MS[0]);
    return () => clearTimeout(timer);
  }, [deviceAhead, refetch]);

  return query;
}

// Dictionary Quiz types and hook
export interface DictionaryQuizQuestion {
  id: string;
  word_id?: string;
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
  trust?: ContentTrust;
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
    word_id?: string;
    source_id?: string;
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

async function fetchVocabularyWordById(wordId: string): Promise<VocabularyWord> {
  const response = await fetch(
    `${API_URL}/api/vocabulary/words/${encodeURIComponent(wordId)}`,
  );
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? 'Dictionary word not found'
        : 'Failed to fetch dictionary word',
    );
  }
  return response.json();
}

/** Load the one exact dictionary record addressed by a stable word ID. */
export function useVocabularyWordById(wordId: string | undefined) {
  return useQuery({
    queryKey: ['vocabulary', 'word-id', wordId],
    queryFn: () => fetchVocabularyWordById(wordId!),
    enabled: !!wordId,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
  });
}
