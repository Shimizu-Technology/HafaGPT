type UsageType = 'chat' | 'game' | 'quiz';

export const FREE_TIER_LIMITS: Record<UsageType, number> = {
  chat: 8,
  game: 10,
  quiz: 5,
};

export const PREMIUM_PRICING = {
  monthly: '$2.99',
  annual: '$23.88',
  annualSavings: '33%',
} as const;

export function getFreeLimitLabel(type: UsageType): string {
  const unit = type === 'chat' ? 'AI chat messages' : type === 'game' ? 'learning games' : 'quizzes';
  return `${FREE_TIER_LIMITS[type]} ${unit} per day`;
}
