const DAY_MS = 86_400_000;

// Whole days from `from` to `to` (§2.1.3: days open = now − createdAt), never negative.
export function daysOpen(from: number, to: number): number {
  return Math.max(0, Math.floor((to - from) / DAY_MS));
}

export function daysLabel(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}
