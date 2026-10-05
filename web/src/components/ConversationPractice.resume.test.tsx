import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationPractice } from './ConversationPractice';

vi.mock('@clerk/clerk-react', () => ({ useUser: () => ({ isSignedIn: true, user: { id: 'practice-learner' } }) }));
vi.mock('./PronunciationButton', () => ({ PronunciationButton: () => null }));
vi.mock('./ContentTrustNote', () => ({ ContentTrustNote: () => <p>AI practice is not a proficiency grade.</p> }));
vi.mock('./TTSDisclaimer', () => ({ TTSDisclaimer: () => null }));

function practice() {
  return render(<MemoryRouter initialEntries={['/practice/meeting-someone']}><Routes><Route path="/practice/:scenarioId" element={<ConversationPractice />} /></Routes></MemoryRouter>);
}

function response() {
  return new Response(JSON.stringify({ chamorro_response: 'Håfa Adai!', english_translation: 'Hello!',
    objective_evidence: [{ objective: 'Greet Maria properly', quote: 'Håfa Adai!', assisted: false }],
    objectives_completed: ['Greet Maria properly'], is_complete: true, final_score: null }));
}

describe('guided conversation continuity', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); HTMLElement.prototype.scrollIntoView = vi.fn(); vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false }))); });

  it('retains a failed response for retry, displays evidence, and restores the recap', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response());
    const first = practice();
    fireEvent.click(await screen.findByRole('button', { name: 'Start conversation' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Conversation response' }), { target: { value: 'Håfa Adai!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send response' }));
    expect(await screen.findByText('Your response was not sent. Try again.')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Håfa Adai!');
    fireEvent.click(screen.getByRole('button', { name: 'Send response' }));
    expect(await screen.findByRole('heading', { name: 'Practice recap' })).toBeInTheDocument();
    expect(screen.getByText(/AI-observed response/)).toBeInTheDocument();
    expect(screen.getAllByText('Try this goal next time')).toHaveLength(3);
    const secondRequest = JSON.parse(fetchMock.mock.calls[1][1]!.body as string);
    expect(secondRequest.conversation_history.filter((message: { role: string }) => message.role === 'user')).toHaveLength(0);
    await waitFor(() => expect(localStorage.getItem('hafagpt:practice:practice-learner:meeting-someone')).toContain('objectiveEvidence'));
    first.unmount();
    practice();
    fireEvent.click(await screen.findByRole('button', { name: 'Review last practice' }));
    expect(screen.getByRole('heading', { name: 'Practice recap' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review conversation and suggestions' }));
    expect(screen.getByRole('button', { name: 'Back to recap' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Back to recap' }));
    fireEvent.click(screen.getByRole('button', { name: 'Practice this goal: Introduce yourself (name)' }));
    expect(screen.getByText('Next goal: Introduce yourself (name)')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).not.toBeDisabled();
  });
});
