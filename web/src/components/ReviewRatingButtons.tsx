import type { QualityRating } from '../hooks/useSpacedRepetition';

const RATINGS: Array<{
  quality: QualityRating;
  label: string;
  hint: string;
  className: string;
}> = [
  {
    quality: 2,
    label: 'Again',
    hint: 'I did not remember',
    className: 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
  },
  {
    quality: 3,
    label: 'Hard',
    hint: 'I remembered with help',
    className: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
  },
  {
    quality: 4,
    label: 'Good',
    hint: 'I remembered',
    className: 'border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100',
  },
  {
    quality: 5,
    label: 'Easy',
    hint: 'I knew it right away',
    className: 'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100',
  },
];

interface ReviewRatingButtonsProps {
  onRate: (quality: QualityRating) => void;
  disabled?: boolean;
  error?: string | null;
}

export function ReviewRatingButtons({ onRate, disabled = false, error }: ReviewRatingButtonsProps) {
  return (
    <div className="mt-6 w-full max-w-xl" aria-label="How well did you remember?">
      <p className="mb-3 text-center text-sm font-semibold text-brown-700 dark:text-gray-200">
        How well did you remember?
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {RATINGS.map((rating) => (
          <button
            key={rating.quality}
            type="button"
            onClick={() => onRate(rating.quality)}
            disabled={disabled}
            className={`min-h-14 rounded-xl border-2 px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 ${rating.className}`}
          >
            <span className="block font-bold">{rating.label}</span>
            <span className="mt-0.5 block text-[11px] leading-tight opacity-80">{rating.hint}</span>
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-3 text-center text-sm font-medium text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
