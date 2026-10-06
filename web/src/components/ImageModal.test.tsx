import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ImageModal } from './ImageModal';

function Preview() {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>View image</button>{open && <ImageModal imageUrl="/portrait.jpg" onClose={() => setOpen(false)} />}</>;
}

describe('Image preview', () => {
  it('focuses its visible close control and returns to the opener on Escape', async () => {
    const user = userEvent.setup();
    render(<Preview />);
    const opener = screen.getByRole('button', { name: 'View image' });
    await user.click(opener);
    expect(screen.getByRole('dialog', { name: 'Image preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download image' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close image preview' })).toHaveFocus());
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
