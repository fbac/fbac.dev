import { describe, it, expect } from 'vitest';
import { formatList, formatLong } from '../src/lib/date';

describe('formatList', () => {
  it('formats as zero-padded YYYY-MM in UTC', () => {
    expect(formatList(new Date('2022-09-01T00:00:00Z'))).toBe('2022-09');
    expect(formatList(new Date('2024-02-01T00:00:00Z'))).toBe('2024-02');
  });

  it('does not roll to the previous month at UTC midnight', () => {
    expect(formatList(new Date('2024-02-01T00:00:00Z'))).toBe('2024-02');
  });
});

describe('formatLong', () => {
  it('formats a long human date in UTC', () => {
    expect(formatLong(new Date('2024-02-01T00:00:00Z'))).toBe('February 1, 2024');
    expect(formatLong(new Date('2022-09-01T00:00:00Z'))).toBe('September 1, 2022');
  });
});
