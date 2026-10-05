import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LessonPage } from './LessonPage';
const mocks = vi.hoisted(() => ({ mutate: vi.fn(), update: vi.fn(), exposure: vi.fn(), xp: vi.fn(), completeStep: vi.fn() }));
vi.mock('@clerk/clerk-react', () => ({ useUser: () => ({ user: { id: 'lesson-learner' } }) }));
vi.mock('../hooks/useLearningPath', () => ({ useUpdateProgress: () => ({ mutate: mocks.mutate, mutateAsync: mocks.update }), useAllProgress: () => ({ data: { topics: [] } }) }));
vi.mock('../hooks/useConceptEvidence', () => ({ useRecordLessonExposure: () => ({ mutateAsync: mocks.exposure, isPending: false }) }));
vi.mock('../hooks/useXP', () => ({ useAwardXP: () => ({ mutateAsync: mocks.xp }) }));
vi.mock('../hooks/useTodaySession', () => ({ useTodaySessionProgress: () => ({ completeStep: mocks.completeStep }) }));
vi.mock('./LessonIntro', () => ({ LessonIntro: ({ onComplete }: { onComplete: () => void }) => <button onClick={onComplete}>Start cards</button> }));
vi.mock('./LessonFlashcards', () => ({ LessonFlashcards: ({ onComplete }: { onComplete: (count: number, concepts: string[]) => void }) => <button onClick={() => onComplete(1, ['fixture-concept'])}>Finish cards</button> }));
vi.mock('./LessonQuiz', () => ({ LessonQuiz: ({ onComplete }: { onComplete: (score: number) => void }) => <button onClick={() => onComplete(80)}>Finish quiz</button> }));
vi.mock('./XPDisplay', () => ({ XPToast: () => null }));
const view = () => render(<MemoryRouter initialEntries={['/learn/greetings?topic=greetings&category=greetings&source=today&return_to=%2F']}><Routes><Route path="/learn/:topicId" element={<LessonPage />} /></Routes></MemoryRouter>);
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  mocks.update.mockResolvedValue({}); mocks.exposure.mockResolvedValue({}); mocks.xp.mockResolvedValue({ xp_earned: 10 });
});
describe('lesson continuity and save recovery', () => {
  it('resumes the actual stage instead of repeating the introduction', async () => {
    const user = userEvent.setup();
    const first = view(); await user.click(screen.getByRole('button', { name: 'Start cards' })); first.unmount();
    view(); expect(screen.getByRole('button', { name: 'Finish cards' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start cards' })).not.toBeInTheDocument();
  });
  it('retains an unsaved completion across reload and marks Today only after retry succeeds', async () => {
    const user = userEvent.setup();
    mocks.update.mockImplementation(async (payload: { action: string }) => { if (payload.action === 'quiz_completed') throw new Error('offline'); return {}; });
    const first = view(); await user.click(screen.getByRole('button', { name: 'Start cards' })); await user.click(screen.getByRole('button', { name: 'Finish cards' })); await user.click(screen.getByRole('button', { name: 'Finish quiz' }));
    expect(await screen.findByRole('button', { name: 'Retry saving lesson' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quiz finished' })).toBeInTheDocument();
    expect(mocks.completeStep).not.toHaveBeenCalled();
    first.unmount(); view();
    expect(screen.getByRole('button', { name: 'Retry saving lesson' })).toBeInTheDocument();
    mocks.update.mockResolvedValue({}); await user.click(screen.getByRole('button', { name: 'Retry saving lesson' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Lesson complete' })).toBeInTheDocument());
    expect(mocks.completeStep).toHaveBeenCalledWith('learn');
    expect(screen.getByRole('link', { name: 'Continue Today' })).toHaveAttribute('href', '/');
  });
});
