import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReviewRatingButtons } from './ReviewRatingButtons';

describe('ReviewRatingButtons', () => {
  it('maps the four learner choices to canonical review qualities', async () => {
    const user = userEvent.setup();
    const onRate = vi.fn();
    render(<ReviewRatingButtons onRate={onRate} />);

    await user.click(screen.getByRole('button', { name: /again/i }));
    await user.click(screen.getByRole('button', { name: /hard/i }));
    await user.click(screen.getByRole('button', { name: /good/i }));
    await user.click(screen.getByRole('button', { name: /easy/i }));

    expect(onRate.mock.calls).toEqual([[2], [3], [4], [5]]);
  });

  it('disables every rating while a review is saving and announces failures', () => {
    render(
      <ReviewRatingButtons
        onRate={() => undefined}
        disabled
        error="Your review was not saved. Please try again."
      />,
    );

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByRole('alert')).toHaveTextContent('Your review was not saved');
  });
});
