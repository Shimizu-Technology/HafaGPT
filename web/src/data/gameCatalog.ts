import { type ComponentType } from 'react';
import {
  Grid3X3,
  Hand,
  Headphones,
  Image,
  Landmark,
  ListOrdered,
  Palette,
  Puzzle,
  Shuffle,
  Swords,
  Target,
  Zap,
} from 'lucide-react';

export type GameGroup = 'listen' | 'words' | 'quick' | 'challenge';

export interface GameDefinition {
  to: string;
  title: string;
  description: string;
  difficulty: string;
  group: GameGroup;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

export const gameGroups: Array<{ id: 'all' | GameGroup; label: string }> = [
  { id: 'all', label: 'All games' },
  { id: 'listen', label: 'Listen & tap' },
  { id: 'words', label: 'Build words' },
  { id: 'quick', label: 'Quick play' },
  { id: 'challenge', label: 'Challenges' },
];
export const GAME_GROUP_IDS = gameGroups.map((group) => group.id);

export const games: GameDefinition[] = [
  { to: '/games/sound-match', title: 'Sound Match', description: 'Hear a Chamorro word and tap the matching picture.', difficulty: 'No reading', group: 'listen', icon: Headphones },
  { to: '/games/picture-pairs', title: 'Picture Pairs', description: 'Match pictures while hearing and learning each word.', difficulty: 'No reading', group: 'listen', icon: Image },
  { to: '/games/color-touch', title: 'Color Touch', description: 'Listen for a color, then tap the matching square.', difficulty: 'No reading', group: 'listen', icon: Palette },
  { to: '/games/number-tap', title: 'Number Tap', description: 'Count the items and choose the number you hear.', difficulty: 'No reading', group: 'listen', icon: ListOrdered },
  { to: '/games/simon-says', title: 'Simon Says', description: 'Learn body words by listening and following along.', difficulty: 'No reading', group: 'listen', icon: Hand },
  { to: '/games/memory', title: 'Memory Match', description: 'Pair Chamorro words with their English meanings.', difficulty: 'All ages', group: 'words', icon: Puzzle },
  { to: '/games/scramble', title: 'Word Scramble', description: 'Put mixed-up letters back into Chamorro words.', difficulty: 'Some reading', group: 'words', icon: Shuffle },
  { to: '/games/hangman', title: 'Word Guess', description: 'Use the meaning as a clue and reveal the Chamorro word.', difficulty: 'Some reading', group: 'words', icon: Target },
  { to: '/games/falling', title: 'Falling Words', description: 'Choose the right translation before the word reaches the bottom.', difficulty: 'Fast paced', group: 'quick', icon: Zap },
  { to: '/games/catch', title: 'Word Catch', description: 'Catch matching word pairs and build a combo.', difficulty: 'Fast paced', group: 'quick', icon: Swords },
  { to: '/games/wordle', title: 'Chamorro Wordle', description: 'Find the Chamorro word in six tries.', difficulty: 'Challenge', group: 'challenge', icon: Grid3X3 },
  { to: '/games/trivia', title: 'Cultural Trivia', description: 'Explore Guam history, traditions, language, and culture.', difficulty: 'All levels', group: 'challenge', icon: Landmark },
];
