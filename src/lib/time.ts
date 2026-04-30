const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'day', ms: 1000 * 60 * 60 * 24 },
  { unit: 'hour', ms: 1000 * 60 * 60 },
  { unit: 'minute', ms: 1000 * 60 },
  { unit: 'second', ms: 1000 },
];

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);

  for (const { unit, ms } of UNITS) {
    const value = Math.round(abs / ms);
    if (value > 0) {
      return rtf.format(diff > 0 ? value : -value, unit);
    }
  }

  return 'just now';
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
