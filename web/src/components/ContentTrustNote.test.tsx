import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentTrustNote } from './ContentTrustNote';
import { getLessonTrust } from '../data/contentTrust';

describe('ContentTrustNote', () => {
  it('reveals source lineage and review status on request', () => {
    render(<ContentTrustNote trust={getLessonTrust('days')} />);

    const toggle = screen.getByRole('button', { name: /current-source aligned/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).not.toHaveAttribute('aria-controls');
    expect(screen.queryByText('Not completed')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls');
    expect(screen.getByText('Not completed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /kumisión i fino' chamoru specialized lists/i })).toHaveAttribute(
      'href',
      expect.stringContaining('kumisionchamoru.guam.gov'),
    );
  });
});
