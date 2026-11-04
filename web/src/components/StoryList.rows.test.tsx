import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { StoryList } from './StoryList';

vi.mock('../hooks/useStoryQuery', () => ({
  useAvailableStories: () => ({ data: undefined, isLoading: false }),
}));
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));

describe('story list rows', () => {
  it('shows each story as a text row with its details on one meta line and no tile', () => {
    const { container } = render(<MemoryRouter><StoryList /></MemoryRouter>);
    const rows = screen.getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);
    const link = within(rows[0]).getByRole('link');
    expect(link.getAttribute('href')).toMatch(/^\/stories\//);
    expect(link).toHaveTextContent(/(beginner|intermediate|advanced) · \d+ min · \d+ words · \d+ questions/);
    expect(link.querySelector('svg')).toBeNull();
    expect(container.querySelector('.h-12.w-12')).toBeNull();
    const meta = Array.from(link.querySelectorAll('span')).find((span) => span.textContent?.includes(' min · '));
    expect(meta).toHaveClass('text-sm');
  });
});
