import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TodayPlan } from '../lib/todayPlan';
import { guamDay, saveTodaySession } from '../lib/todaySession';
import { TodayPlanCard } from './TodayPlanCard';
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ userId: 'learner-one' }) }));
const plan: TodayPlan = { budgetMinutes: 10, remainingMinutes: 10, totalMinutes: 7, goalComplete: false, goalDisabled: false, headline: '', summary: '', primaryLabel: '', activities: [
  { id: 'review', kind: 'review', title: 'Review due cards', description: 'Recall words', minutes: 2, to: '/flashcards/review' },
  { id: 'learn', kind: 'lesson', title: 'Learn greetings', description: 'Introduce words', minutes: 5, to: '/learn/greetings' },
] };
beforeEach(() => localStorage.clear());
describe('stable Today checklist', () => {
  it('labels estimates honestly and keeps the original steps after homepage data changes', () => {
    const { rerender } = render(<MemoryRouter><TodayPlanCard plan={plan} /></MemoryRouter>);
    expect(screen.getByText('About 7 min · at your pace')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start today' })).toHaveAttribute('href', expect.stringContaining('/flashcards/review?today_step=review'));
    rerender(<MemoryRouter><TodayPlanCard plan={{ ...plan, activities: [{ ...plan.activities[1], id: 'new-topic', title: 'Learn numbers' }] }} /></MemoryRouter>);
    expect(screen.getByText('2. Learn greetings')).toBeInTheDocument();
    expect(screen.queryByText(/Learn numbers/)).not.toBeInTheDocument();
  });
  it('continues with the unfinished step and shows a recap only when all planned steps finish', () => {
    saveTodaySession('learner-one', { version: 1, day: guamDay(), plan, completed: ['review'] });
    const { unmount } = render(<MemoryRouter><TodayPlanCard plan={plan} /></MemoryRouter>);
    expect(screen.getByText('1 of 2 steps complete')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue today' })).toHaveAttribute('href', expect.stringContaining('/learn/greetings?today_step=learn'));
    unmount();
    saveTodaySession('learner-one', { version: 1, day: guamDay(), plan, completed: ['review', 'learn'] });
    render(<MemoryRouter><TodayPlanCard plan={plan} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Your session is complete' })).toBeInTheDocument();
    expect(screen.getByText('2 of 2 steps complete')).toBeInTheDocument();
  });
});
