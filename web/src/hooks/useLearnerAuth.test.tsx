import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateProgress } from './useLearningPath';
import { useAwardXP } from './useXP';
import { useRecordLessonExposure } from './useConceptEvidence';
import { useSaveQuizResult } from './useQuizQuery';
const auth = vi.hoisted(() => ({ userId: 'a' as string | null, isSignedIn: true, getToken: vi.fn<() => Promise<string | null>>() }));
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => auth }));
function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
const cases = [
  { name: 'lesson progress', useAction: () => { const mutation = useUpdateProgress(); return () => mutation.mutateAsync({ topicId: 'greetings', action: 'quiz_completed', quizScore: 80 }); } },
  { name: 'lesson exposure', useAction: () => { const mutation = useRecordLessonExposure(); return () => mutation.mutateAsync({ topicId: 'greetings', conceptIds: ['fixture'] }); } },
  { name: 'lesson XP', useAction: () => { const mutation = useAwardXP(); return () => mutation.mutateAsync({ activity_type: 'quiz_complete', activity_id: 'greetings', deduplicate: true }); } },
  { name: 'quiz result', useAction: () => { const mutation = useSaveQuizResult(); return () => mutation.mutateAsync({ category_id: 'greetings', category_title: 'Greetings', score: 4, total: 5 }); } },
];
beforeEach(() => { auth.userId = 'a'; auth.getToken.mockReset(); });
describe('learning token ownership across pending writes', () => {
  it.each(cases)('rejects $name before posting if account changes while waiting for a token', async ({ useAction }) => {
    let finishToken!: (token: string) => void;
    auth.getToken.mockImplementationOnce(() => new Promise(resolve => { finishToken = resolve; }));
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(() => useAction(), { wrapper: makeWrapper() });
    let pending!: Promise<unknown>;
    act(() => { pending = result.current(); });
    await waitFor(() => expect(finishToken).toBeDefined());
    auth.userId = 'b'; rerender();
    await act(async () => { finishToken('token-b'); await expect(pending).rejects.toThrow('Learning account changed'); });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects a token that resolves after the writing component unmounts', async () => {
    let finishToken!: (token: string) => void;
    auth.getToken.mockImplementationOnce(() => new Promise(resolve => { finishToken = resolve; }));
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const { result, unmount } = renderHook(() => cases[2].useAction(), { wrapper: makeWrapper() });
    let pending!: Promise<unknown>;
    act(() => { pending = result.current(); });
    await waitFor(() => expect(finishToken).toBeDefined());
    unmount();
    await act(async () => { finishToken('token-a'); await expect(pending).rejects.toThrow('Learning account changed'); });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
