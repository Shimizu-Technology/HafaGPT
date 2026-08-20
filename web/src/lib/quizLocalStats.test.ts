import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browserStorage } from './browserStorage';
import { saveQuizAttempt } from './quizLocalStats';

vi.mock('./browserStorage', () => ({
  browserStorage: { get: vi.fn(), set: vi.fn() },
}));

describe('saveQuizAttempt', () => {
  beforeEach(() => {
    vi.mocked(browserStorage.get).mockReset();
    vi.mocked(browserStorage.set).mockReset();
  });

  it('preserves the local quiz fallback when the helper is used outside the dashboard', () => {
    vi.mocked(browserStorage.get).mockReturnValue(JSON.stringify({
      attempts: [{ categoryId: 'family', score: 3, total: 5, timestamp: 1 }],
    }));

    vi.spyOn(Date, 'now').mockReturnValue(1234);
    saveQuizAttempt('greetings', 4, 5);

    expect(browserStorage.set).toHaveBeenCalledWith(
      'hafagpt_quiz_stats',
      JSON.stringify({
        attempts: [
          { categoryId: 'family', score: 3, total: 5, timestamp: 1 },
          { categoryId: 'greetings', score: 4, total: 5, timestamp: 1234 },
        ],
      }),
    );
  });
});
