import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BEGINNER_PATH } from '../data/learningPath';
import { LessonQuiz } from './LessonQuiz';
import { XPToast } from './XPDisplay';
import { UpgradePrompt } from './UpgradePrompt';
import { PronunciationButton } from './PronunciationButton';

const mocks = vi.hoisted(() => ({ speak: vi.fn(), stop: vi.fn(), error: null as string | null, source: null as string | null }));
vi.mock('@clerk/clerk-react', () => ({ useUser: () => ({ isSignedIn: false }) }));
vi.mock('../hooks/useQuizQuery', () => ({ useSaveQuizResult: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('../hooks/useXP', () => ({ useXP: () => ({}), getLevelInfo: vi.fn() }));
vi.mock('../hooks/useSpeech', () => ({ useSpeech: () => ({ speak: mocks.speak, stop: mocks.stop, isSpeaking: false, speechError: mocks.error, playbackSource: mocks.source }) }));
vi.mock('../data/quizData', () => ({ QUIZ_CATEGORIES: [{ id: 'greetings', questions: [
  { id: 'choice', type: 'multiple_choice', question: 'Choose a greeting', options: ['Hello', 'Goodbye'], correctAnswer: 'Hello', hint: 'The first word', explanation: 'Hello greets someone.' },
  { id: 'typed', type: 'type_answer', question: 'Type a greeting', correctAnswer: 'Hello', hint: 'Start with H', explanation: 'Hello greets someone.' },
] }] }));
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); mocks.error = null; mocks.source = null; });
const quiz = () => {
  localStorage.setItem('hafagpt_quiz_anonymous_greetings', JSON.stringify({ topicId: 'greetings', questionIds: ['choice', 'typed'], currentIndex: 0, correctCount: 0, answeredQuestions: {}, timestamp: Date.now() }));
  return render(<LessonQuiz topic={BEGINNER_PATH[0]} onComplete={vi.fn()} />);
};
describe('PR5 lesson accessibility regressions', () => {
  it('names and expands the hint, exposes changed selection, and announces one result', async () => {
    const user = userEvent.setup(); quiz();
    const hint = screen.getByRole('button', { name: 'Show hint' });
    expect(hint).toHaveAttribute('aria-expanded', 'false');
    await user.click(hint);
    expect(screen.getByRole('button', { name: 'Hide hint' })).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(hint.getAttribute('aria-controls')!)).toHaveTextContent('The first word');
    const group = screen.getByRole('group', { name: 'Choose a greeting' });
    const yes = within(group).getByRole('button', { name: 'Hello' });
    const no = within(group).getByRole('button', { name: 'Goodbye' });
    await user.click(no); expect(no).toHaveAttribute('aria-pressed', 'true');
    await user.click(yes); expect(yes).toHaveAttribute('aria-pressed', 'true'); expect(no).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Check Answer' }));
    expect(screen.getAllByRole('status').filter(e => e.textContent === 'Correct.')).toHaveLength(1);
  });
  it('does not autoplay, and independently plays the prompt, options, hint and feedback', async () => {
    const user = userEvent.setup(); quiz(); expect(mocks.speak).not.toHaveBeenCalled();
    for (const text of ['Choose a greeting', 'Hello', 'Goodbye']) {
      await user.click(screen.getByRole('button', { name: `Hear it: ${text}` }));
      expect(mocks.speak).toHaveBeenLastCalledWith(text);
    }
    await user.click(screen.getByRole('button', { name: 'Show hint' }));
    await user.click(screen.getByRole('button', { name: 'Hear it: The first word' }));
    expect(mocks.speak).toHaveBeenLastCalledWith('The first word');
    await user.click(screen.getByRole('button', { name: 'Hello' }));
    await user.click(screen.getByRole('button', { name: 'Check Answer' }));
    await user.click(screen.getByRole('button', { name: 'Hear it: Hello greets someone.' }));
    expect(mocks.speak).toHaveBeenLastCalledWith('Hello greets someone.');
  });
  it('focuses the next question and associates typed answers with instructions', async () => {
    const user = userEvent.setup(); quiz();
    await user.click(screen.getByRole('button', { name: 'Hello' }));
    await user.click(screen.getByRole('button', { name: 'Check Answer' }));
    await user.click(screen.getByRole('button', { name: 'Next Question' }));
    expect(screen.getByRole('heading', { name: 'Type a greeting' })).toHaveFocus();
    const input = screen.getByRole('textbox', { name: 'Type a greeting' });
    expect(input).toHaveAccessibleDescription(/Type your answer/);
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /I don't know/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Incorrect. Correct answer: Hello');
  });
  it('keeps audio provenance and provides an adult-assisted fallback on failure', () => {
    mocks.error = 'Pronunciation audio could not play.';
    const view = render(<PronunciationButton text="Hello" label="Hear it" showLabel />);
    expect(screen.getByText(/Ask a grown-up to read this with you/)).toBeInTheDocument();
    mocks.error = null; mocks.source = 'generated'; view.rerender(<PronunciationButton text="Hello" label="Hear it" showLabel />);
    expect(screen.getByText('AI-generated audio · pronunciation may vary')).toBeInTheDocument();
  });
  it('announces XP politely and has a keyboard-operable dismiss action', async () => {
    const user = userEvent.setup(); const close = vi.fn();
    render(<XPToast xpEarned={20} levelUp newLevel={2} onClose={close} />);
    expect(screen.getByRole('status')).toHaveTextContent('+20 XP');
    const dismiss = screen.getByRole('button', { name: 'Dismiss XP notification' });
    dismiss.focus(); await user.keyboard('{Enter}'); expect(close).toHaveBeenCalledOnce();
  });
  it('restores focus after an async quota dialog replaced its vanished trigger', async () => {
    const user = userEvent.setup(); const close = vi.fn();
    const view = render(<MemoryRouter><main><h1>Quiz</h1><button>Start quiz</button></main></MemoryRouter>);
    screen.getByRole('button', { name: 'Start quiz' }).focus();
    view.rerender(<MemoryRouter><main><h1>Quiz</h1></main><UpgradePrompt feature="quiz" onClose={close} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close upgrade offer' })).toHaveFocus());
    await user.keyboard('{Escape}'); expect(close).toHaveBeenCalledOnce();
    view.rerender(<MemoryRouter><main><h1>Quiz</h1></main></MemoryRouter>);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(screen.getByRole('heading', { name: 'Quiz' })).toHaveFocus();
  });
});
