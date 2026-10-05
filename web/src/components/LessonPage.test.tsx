import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LessonPage } from './LessonPage';
const mocks = vi.hoisted(() => ({ mutate: vi.fn(), update: vi.fn(), exposure: vi.fn(), xp: vi.fn(), completeStep: vi.fn(), owner: 'lesson-learner' }));
vi.mock('@clerk/clerk-react', () => ({ useUser: () => ({ user: { id: mocks.owner } }) }));
vi.mock('../hooks/useLearningPath', () => ({ useUpdateProgress: () => ({ mutate: mocks.mutate, mutateAsync: mocks.update }), useAllProgress: () => ({ data: { topics: [] } }) }));
vi.mock('../hooks/useConceptEvidence', () => ({ useRecordLessonExposure: () => ({ mutateAsync: mocks.exposure, isPending: false }) }));
vi.mock('../hooks/useXP', () => ({ useAwardXP: () => ({ mutateAsync: mocks.xp }) }));
vi.mock('../hooks/useTodaySession', () => ({ useTodaySessionProgress: () => ({ completeStep: mocks.completeStep }) }));
vi.mock('./LessonIntro', () => ({ LessonIntro: ({ onComplete }: { onComplete: () => void }) => <button onClick={onComplete}>Start cards</button> }));
vi.mock('./LessonFlashcards', () => ({ LessonFlashcards: ({ onComplete }: { onComplete: (count: number, concepts: string[]) => void }) => <button onClick={() => onComplete(1, ['fixture-concept'])}>Finish cards</button> }));
vi.mock('./LessonQuiz', () => ({ LessonQuiz: ({ onComplete }: { onComplete: (score: number) => void }) => <button onClick={() => onComplete(80)}>Finish quiz</button> }));
vi.mock('./XPDisplay', () => ({ XPToast: () => <p>XP award notification</p> }));
const tree = () => (<MemoryRouter initialEntries={['/learn/greetings?topic=greetings&category=greetings&source=today&return_to=%2F']}><Routes><Route path="/learn/:topicId" element={<LessonPage />} /></Routes></MemoryRouter>);
const view = () => render(tree());
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); mocks.owner = 'lesson-learner';
  mocks.update.mockResolvedValue({}); mocks.exposure.mockResolvedValue({}); mocks.xp.mockResolvedValue({ xp_earned: 10 });
});
describe('lesson continuity and save recovery', () => {
  it('does not show a departed learner XP notification or continue their awards', async () => {
    const user = userEvent.setup();
    let finishXP!: (value: { xp_earned: number }) => void;
    mocks.xp.mockImplementation(({ activity_type }: { activity_type: string }) => activity_type === 'quiz_complete'
      ? new Promise(resolve => { finishXP = resolve; }) : Promise.resolve({ xp_earned: 0 }));
    const mounted = view();
    await user.click(screen.getByRole('button', { name: 'Start cards' }));
    await user.click(screen.getByRole('button', { name: 'Finish cards' }));
    await user.click(screen.getByRole('button', { name: 'Finish quiz' }));
    await waitFor(() => expect(finishXP).toBeTypeOf('function'));
    mocks.owner = 'another-learner'; mounted.rerender(tree());
    await act(async () => { finishXP({ xp_earned: 10 }); });
    expect(screen.queryByText('XP award notification')).not.toBeInTheDocument();
    expect(mocks.xp.mock.calls.filter(([payload]) => payload.activity_type === 'topic_complete')).toHaveLength(0);
  });
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
  it('does not start another progress write when exposure resolves after an account switch', async () => {
    const user = userEvent.setup();
    let finishExposure!: () => void;
    mocks.exposure.mockImplementationOnce(() => new Promise<void>(resolve => { finishExposure = resolve; }));
    const mounted = view();
    await user.click(screen.getByRole('button', { name: 'Start cards' }));
    await user.click(screen.getByRole('button', { name: 'Finish cards' }));
    mocks.owner = 'another-learner'; mounted.rerender(tree());
    await act(async () => { finishExposure(); });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.xp).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Start cards' })).toBeInTheDocument();
  });
  it('keeps a failed XP award retryable after course progress saved and the page reloads', async () => {
    const user = userEvent.setup();
    let failed = false;
    mocks.xp.mockImplementation(async ({ activity_type }: { activity_type: string }) => {
      if (activity_type === 'quiz_complete' && !failed) { failed = true; throw new Error('XP unavailable'); }
      return { xp_earned: 0 };
    });
    const first = view();
    await user.click(screen.getByRole('button', { name: 'Start cards' }));
    await user.click(screen.getByRole('button', { name: 'Finish cards' }));
    await user.click(screen.getByRole('button', { name: 'Finish quiz' }));
    expect(await screen.findByRole('button', { name: 'Retry saving lesson' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lesson complete' })).toBeInTheDocument();
    first.unmount(); view();
    await user.click(screen.getByRole('button', { name: 'Retry saving lesson' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Retry saving lesson' })).not.toBeInTheDocument());
    expect(mocks.xp.mock.calls.filter(([payload]) => payload.activity_type === 'quiz_complete')).toHaveLength(2);
    expect(mocks.xp.mock.calls.filter(([payload]) => payload.activity_type === 'topic_complete')).toHaveLength(1);
  });

});
