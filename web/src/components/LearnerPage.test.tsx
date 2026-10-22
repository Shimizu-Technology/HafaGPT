import { fireEvent, render, screen } from '@testing-library/react';
import { MessageCircle } from 'lucide-react';
import { MemoryRouter, Link, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LearnerPageHeader } from './LearnerPage';

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

function Destination() {
  const location = useLocation();
  const action = useNavigationType();
  return <output data-testid="destination">{location.pathname}:{action}</output>;
}
afterEach(() => { window.history.replaceState(null, ''); });

describe('LearnerPageHeader', () => {
  it('honors the labelled parent despite unrelated browser history and replaces the activity', () => {
    window.history.replaceState({ idx: 4 }, '');
    render(<MemoryRouter initialEntries={['/unrelated', '/learning/greetings', '/learn/greetings']}>
      <Destination /><Routes>
        <Route path="/learn/greetings" element={<LearnerPageHeader title="Lesson" icon={MessageCircle} backTo="/learning/greetings" backLabel="Back to topic" />} />
        <Route path="/learning/greetings" element={<LearnerPageHeader title="Topic" icon={MessageCircle} backTo="/learning" backLabel="Back to learning path" />} />
        <Route path="/learning" element={<Link to="/learn/greetings">Start again</Link>} />
      </Routes>
    </MemoryRouter>);
    const back = screen.getByRole('link', { name: 'Back to topic' });
    expect(back).toHaveAttribute('href', '/learning/greetings');
    // React Router must leave modified clicks to the browser. Suppress jsdom's
    // unsupported native navigation only after the React event has bubbled.
    document.addEventListener('click', event => event.preventDefault(), { once: true });
    fireEvent.click(back, { ctrlKey: true });
    expect(screen.getByTestId('destination')).toHaveTextContent('/learn/greetings:POP');
    fireEvent.click(back);
    expect(screen.getByTestId('destination')).toHaveTextContent('/learning/greetings:REPLACE');
    fireEvent.click(screen.getByRole('link', { name: 'Back to learning path' }));
    expect(screen.getByTestId('destination')).toHaveTextContent('/learning:REPLACE');
  });
  it('uses a session-specific exit handler when one is provided', () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <LearnerPageHeader
          title="Maria"
          subtitle="Meeting Someone New"
          icon={MessageCircle}
          backLabel="Leave conversation"
          onBack={onBack}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Leave conversation' }));

    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { name: 'Maria' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
  });

  it('renders shared progress content accessibly', () => {
    render(
      <MemoryRouter>
        <LearnerPageHeader
          title="Greetings & Basics"
          icon={MessageCircle}
          below={(
            <div
              role="progressbar"
              aria-label="Practice progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={25}
            />
          )}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('progressbar', { name: 'Practice progress' })).toHaveAttribute('aria-valuenow', '25');
  });
});
