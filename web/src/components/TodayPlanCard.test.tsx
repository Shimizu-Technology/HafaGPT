import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { TodayPlan } from '../lib/todayPlan';
import { TodayPlanCard } from './TodayPlanCard';

const ACTIVE_PLAN: TodayPlan = {
  budgetMinutes: 10,
  remainingMinutes: 10,
  totalMinutes: 7,
  goalComplete: false,
  headline: 'Your plan for today',
  summary: '2 focused steps chosen for your goals and pace.',
  primaryLabel: 'Start today',
  activities: [
    {
      id: 'review',
      kind: 'review',
      title: 'Review 3 due cards',
      description: 'Refresh what you learned before adding more.',
      minutes: 3,
      to: '/flashcards/review',
    },
    {
      id: 'practice',
      kind: 'practice',
      title: 'Say it out loud',
      description: 'Practice a short everyday conversation.',
      minutes: 4,
      to: '/practice',
    },
  ],
};

describe('TodayPlanCard', () => {
  it('renders ordered, time-bounded steps and starts with the first activity', () => {
    render(
      <MemoryRouter>
        <TodayPlanCard plan={ACTIVE_PLAN} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Your plan for today' })).toBeInTheDocument();
    expect(screen.getByText('7 min')).toBeInTheDocument();
    expect(screen.getByText('1. Review 3 due cards')).toBeInTheDocument();
    expect(screen.getByText('2. Say it out loud')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start today/i })).toHaveAttribute('href', '/flashcards/review');
  });

  it('celebrates a completed goal without inventing more required steps', () => {
    const completedPlan: TodayPlan = {
      ...ACTIVE_PLAN,
      remainingMinutes: 0,
      totalMinutes: 0,
      goalComplete: true,
      headline: 'Daily goal complete',
      summary: 'You reached your 10-minute goal. Explore anything that sounds fun next.',
      primaryLabel: 'Choose another activity',
      activities: [],
    };

    render(
      <MemoryRouter>
        <TodayPlanCard plan={completedPlan} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Daily goal complete' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /today's learning steps/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /choose another activity/i })).toHaveAttribute('href', '/learning');
  });
});
