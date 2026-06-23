/** Compact, zero-padded `YYYY-MM` for the article index. UTC-based to avoid
 *  timezone rollover (a `-01` date can become the prior month in negative TZs). */
export function formatList(d: Date): string {
  return d.toISOString().slice(0, 7);
}

const longFmt = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' });

/** Human-readable `Month D, YYYY` for post headers. */
export function formatLong(d: Date): string {
  return longFmt.format(d);
}
