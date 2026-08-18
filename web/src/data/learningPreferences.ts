export type LearnerMode = 'self' | 'with_child' | 'helping_family';
export type ReadingSupport = 'audio_pictures' | 'short_text_audio' | 'independent';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type LearningGoal = 'conversation' | 'culture' | 'family' | 'travel' | 'all';
export type DailySessionMinutes = 5 | 10 | 15 | 20;
export type DailyGoalMinutes = 0 | DailySessionMinutes;
export const DEFAULT_DAILY_SESSION_MINUTES: DailySessionMinutes = 10;

export function normalizeDailySessionMinutes(value: unknown): DailySessionMinutes {
  return value === 5 || value === 10 || value === 15 || value === 20
    ? value
    : DEFAULT_DAILY_SESSION_MINUTES;
}

export function normalizeDailyGoalMinutes(value: unknown): DailyGoalMinutes {
  return value === 0 ? 0 : normalizeDailySessionMinutes(value);
}

export interface LearningPreferenceOption<T extends string | number> {
  id: T;
  title: string;
  description: string;
}

export const LEARNER_MODE_OPTIONS: LearningPreferenceOption<LearnerMode>[] = [
  {
    id: 'self',
    title: 'Learning for myself',
    description: 'Build my own Chamorro skills and confidence.',
  },
  {
    id: 'with_child',
    title: 'Learning with a child',
    description: 'Learn together on a caregiver-managed account.',
  },
  {
    id: 'helping_family',
    title: 'Helping family',
    description: 'Get practical support for family learning and school messages.',
  },
];

export const READING_SUPPORT_OPTIONS: LearningPreferenceOption<ReadingSupport>[] = [
  {
    id: 'audio_pictures',
    title: 'Audio and pictures first',
    description: 'Use listening and visual cues before longer text.',
  },
  {
    id: 'short_text_audio',
    title: 'Short text with audio',
    description: 'Pair brief reading with listening support.',
  },
  {
    id: 'independent',
    title: 'Comfortable reading',
    description: 'I can read instructions and explanations independently.',
  },
];

export const CONFIDENCE_OPTIONS: LearningPreferenceOption<SkillLevel>[] = [
  {
    id: 'beginner',
    title: 'Just starting',
    description: 'I know little or no Chamorro yet.',
  },
  {
    id: 'intermediate',
    title: 'I know some Chamorro',
    description: 'I recognize useful words and phrases.',
  },
  {
    id: 'advanced',
    title: 'Comfortable with Chamorro',
    description: 'I can understand or use Chamorro in conversation.',
  },
];

export const LEARNING_GOAL_OPTIONS: LearningPreferenceOption<LearningGoal>[] = [
  { id: 'conversation', title: 'Conversation', description: 'Speak with family and friends.' },
  { id: 'culture', title: 'Culture and heritage', description: 'Connect language with Chamorro culture.' },
  { id: 'family', title: 'Family learning', description: 'Learn, teach, or practice together.' },
  { id: 'travel', title: 'Travel and daily life', description: 'Use practical Chamorro around Guam.' },
  { id: 'all', title: 'A little of everything', description: 'Build a broad foundation over time.' },
];

export const DAILY_SESSION_OPTIONS: LearningPreferenceOption<DailySessionMinutes>[] = [
  { id: 5, title: '5 minutes', description: 'A quick daily win.' },
  { id: 10, title: '10 minutes', description: 'A balanced everyday session.' },
  { id: 15, title: '15 minutes', description: 'More time for practice and review.' },
  { id: 20, title: '20 minutes', description: 'A deeper learning session.' },
];

export const DAILY_GOAL_OPTIONS: LearningPreferenceOption<DailyGoalMinutes>[] = [
  { id: 0, title: 'No time goal', description: 'Learn whenever it feels useful.' },
  ...DAILY_SESSION_OPTIONS,
];
