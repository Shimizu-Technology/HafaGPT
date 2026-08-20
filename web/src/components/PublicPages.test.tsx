import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AboutPage } from './AboutPage';
import PricingPage from './PricingPage';
import PrivacyPolicy from './PrivacyPolicy';
import { SharedConversation } from './SharedConversation';
import SupportPage from './SupportPage';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isSignedIn: false }),
  useClerk: () => ({ openUserProfile: vi.fn() }),
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  PricingTable: () => <div>Checkout options</div>,
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => ({ isPremium: false, isLoading: false }),
}));

const sharedConversation = {
  share_id: 'share-one',
  title: 'A family school message',
  created_at: '2026-08-20T00:00:00Z',
  view_count: 1,
  messages: [
    {
      id: 1,
      role: 'user',
      content: 'What does this mean?',
      timestamp: '2026-08-20T00:00:00Z',
      sources: [],
      used_rag: false,
      used_web_search: false,
      file_urls: [{ url: 'https://example.com/message.jpg', filename: 'message.jpg', content_type: 'image/jpeg' }],
    },
    {
      id: 2,
      role: 'assistant',
      content: 'It means **good morning**. [Learn more](https://example.com/source).',
      timestamp: '2026-08-20T00:01:00Z',
      sources: [{ name: 'School guide', url: 'https://example.com/guide', page: 2 }],
      used_rag: true,
      used_web_search: false,
    },
  ],
};

function renderSharedConversation() {
  return render(
    <MemoryRouter initialEntries={['/share/share-one']}>
      <Routes>
        <Route path="/share/:shareId" element={<SharedConversation />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('public information pages', () => {
  it('uses a consistent public shell while preserving each page purpose', () => {
    const { rerender } = render(<MemoryRouter><AboutPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /why i built håfagpt/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ask håfagpt/i })).toHaveAttribute('href', '/chat');

    rerender(<MemoryRouter><SupportPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /how can we help/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /email support/i })).toHaveAttribute('href', 'mailto:support@shimizutechnology.com');

    rerender(<MemoryRouter><PrivacyPolicy /></MemoryRouter>);
    expect(screen.getByText(/last updated: august 18, 2026/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /children's privacy/i })).toBeInTheDocument();

    rerender(<MemoryRouter><PricingPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /unlock unlimited learning/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up & upgrade/i })).toBeInTheDocument();
  });

  it('takes Back home to the home route instead of the previous history entry', () => {
    render(
      <MemoryRouter initialEntries={['/settings', '/about']} initialIndex={1}>
        <Routes>
          <Route path="/" element={<p>Home destination</p>} />
          <Route path="/settings" element={<p>Previous destination</p>} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back home' }));

    expect(screen.getByText('Home destination')).toBeInTheDocument();
    expect(screen.queryByText('Previous destination')).not.toBeInTheDocument();
  });
});

describe('shared conversations', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sharedConversation,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders shared messages, citations, and safe external markdown links', async () => {
    renderSharedConversation();

    expect(await screen.findByRole('heading', { name: 'A family school message' })).toBeInTheDocument();
    expect(screen.getByText(/good morning/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /school guide/i })).toHaveAttribute('href', 'https://example.com/guide');
    expect(screen.getByRole('link', { name: /learn more/i })).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('retries a failed share request without leaving the recovery page', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => sharedConversation } as Response);
    renderSharedConversation();

    expect(await screen.findByRole('alert')).toHaveTextContent(/offline/i);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: 'A family school message' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('opens an image in a labeled dialog and closes it with Escape', async () => {
    renderSharedConversation();
    const imageTrigger = await screen.findByRole('button', { name: /open image message.jpg/i });
    imageTrigger.focus();
    fireEvent.click(imageTrigger);

    expect(screen.getByRole('dialog', { name: /image preview/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /image preview/i })).not.toBeInTheDocument());
    await waitFor(() => expect(imageTrigger).toHaveFocus());
  });
});
