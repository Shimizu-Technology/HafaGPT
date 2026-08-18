export function getGuamDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Pacific/Guam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';

  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function validateSeasonalThemeSettings(
  theme: string,
  enabled: boolean,
  endDate: string,
  today: string = getGuamDateKey(),
): string | null {
  if (!enabled || (theme !== 'christmas' && theme !== 'newyear')) {
    return null;
  }

  if (!endDate) {
    return 'Choose an end date before enabling seasonal effects.';
  }

  const parsedEndDate = new Date(`${endDate}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    || Number.isNaN(parsedEndDate.getTime())
    || parsedEndDate.toISOString().slice(0, 10) !== endDate
  ) {
    return 'Choose a valid calendar date.';
  }

  if (endDate < today) {
    return 'Choose today or a future date in Guam time.';
  }

  return null;
}
