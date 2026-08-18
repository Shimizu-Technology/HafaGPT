export function formatUsageSummary(count: number, limit: number): string {
  if (limit < 0 || !Number.isFinite(limit)) return 'Unlimited today';
  return `${count}/${limit} used today`;
}
