import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import css from './index.css?raw';
import { StoryViewer } from './components/StoryViewer';
import dictionaryEntryRowSource from './components/DictionaryEntryRow.tsx?raw';
import quizViewerSource from './components/QuizViewer.tsx?raw';
import lessonQuizSource from './components/LessonQuiz.tsx?raw';
import soundMatchSource from './components/SoundMatch.tsx?raw';
import memoryCardSource from './components/games/MemoryCard.tsx?raw';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => null, isSignedIn: false }),
  useUser: () => ({ isSignedIn: false, user: null }),
}));
vi.mock('./hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('./hooks/useLearningPath', () => ({
  useUpdateProgress: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(async () => ({})) }),
  useAllProgress: () => ({ data: undefined }),
}));

// Touch baseline: controls only. Content (Chamorro words, tutor answers) stays selectable.
describe('touch baseline in index.css', () => {
  const selectNone = [...css.matchAll(/([^{}]+)\{[^{}]*user-select:\s*none/g)].map(match => match[1].trim());

  it('blocks selection on navigation chrome only, never on buttons in general', () => {
    expect(selectNone).toEqual([':where(nav a, nav button, [role="tab"])']);
  });

  it('asks for selection explicitly with .selectable', () => {
    expect(css).toMatch(/\.selectable\s*\{[^}]*user-select:\s*text/);
  });

  it.each([
    ['DictionaryEntryRow', dictionaryEntryRowSource, 'selectable ${rowInteractive}'],
    ['QuizViewer', quizViewerSource, 'selectable min-h-12 flex-1 rounded-xl p-3 text-left'],
    ['LessonQuiz', lessonQuizSource, 'selectable w-full p-4 rounded-xl border-2 text-left'],
    ['SoundMatch audio word', soundMatchSource, 'selectable w-full py-5 rounded-2xl'],
    ['SoundMatch answer', soundMatchSource, 'selectable p-6 sm:p-8 rounded-2xl'],
    ['MemoryCard', memoryCardSource, 'selectable relative w-full aspect-square'],
  ])('keeps learning text in the %s button selectable', (_name, source, classes) => {
    expect(source).toContain(classes);
  });

  it('removes the tap delay on controls without blocking pan or zoom of content', () => {
    expect(css).toMatch(/:where\(button, a, \[role="button"\][^)]*\)\s*\{\s*touch-action:\s*manipulation/);
  });

  it('animates overlays with transform and opacity only, and fades only for reduced motion', () => {
    for (const name of ['sheet-in', 'sheet-out', 'dialog-in', 'dialog-out', 'popover-in', 'overlay-fade-in', 'overlay-fade-out']) {
      const body = css.match(new RegExp(`@keyframes ${name}\\s*\\{([^]*?\\})\\s*\\}`))![1];
      expect(body.replace(/transform:[^;]*;|opacity:[^;]*;/g, '')).not.toMatch(/(top|left|right|bottom|width|height|margin|padding)\s*:/);
    }
    const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.overlay-panel\[data-state="open"\][^}]*animation-name:\s*overlay-fade-in/);
    expect(reduced).toMatch(/\.story-word-popover[^}]*animation-name:\s*overlay-fade-in/);
    expect(reduced).toMatch(/\.overlay-panel\[data-state="closed"\][^}]*animation-name:\s*overlay-fade-out/);
  });

  it('pins the spec durations', () => {
    expect(css).toMatch(/\.overlay-panel\[data-variant="sheet"\]\s*\{\s*animation:\s*sheet-in 240ms var\(--ease-drawer\)/);
    expect(css).toMatch(/\.overlay-panel\[data-variant="sheet"\]\[data-state="closed"\]\s*\{\s*animation:\s*sheet-out 160ms/);
    expect(css).toMatch(/\.overlay-panel\[data-variant="dialog"\]\s*\{\s*animation:\s*dialog-in 180ms/);
    expect(css).toMatch(/\.overlay-panel\[data-variant="dialog"\]\[data-state="closed"\]\s*\{\s*animation:\s*dialog-out 120ms/);
    expect(css).toMatch(/\.story-word-popover\s*\{\s*animation:\s*popover-in 150ms/);
  });
});

describe('story words', () => {
  it('stay selectable and their gloss uses the popover motion class', () => {
    render(
      <MemoryRouter initialEntries={['/stories/hafa-adai-maria']}>
        <Routes><Route path="/stories/:storyId" element={<StoryViewer />} /></Routes>
      </MemoryRouter>,
    );
    const word = screen.getAllByRole('button', { name: /^Meaning of / })[0];
    expect(word).toHaveClass('selectable');
    fireEvent.click(word);
    expect(document.querySelector('.story-word-popover')).not.toBeNull();
  });
});
