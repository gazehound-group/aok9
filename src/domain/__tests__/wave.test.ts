import { describe, expect, it } from 'vitest';
import { computeWave, gradeForWave } from '../wave';

describe('WAVE calculation (4.2.2)', () => {
  it('three complete meets: [m1 + 0.7 m2 + 0.5 m3] / 2.2', () => {
    expect(computeWave([
      { score: 20, complete: true },
      { score: 10, complete: true },
      { score: 11, complete: true },
    ])).toBeCloseTo((20 + 7 + 5.5) / 2.2, 10);
  });

  it('two complete meets: [c1 + 0.7 c2] / 1.7', () => {
    expect(computeWave([
      { score: 20, complete: true },
      { score: 10, complete: true },
    ])).toBeCloseTo((20 + 7) / 1.7, 10);
  });

  it('two complete within last three skips the incomplete one', () => {
    expect(computeWave([
      { score: 20, complete: true },
      { score: 3, complete: false },
      { score: 10, complete: true },
    ])).toBeCloseTo((20 + 7) / 1.7, 10);
  });

  it('one complete meet within the last three: that score', () => {
    expect(computeWave([
      { score: 4, complete: false },
      { score: 15, complete: true },
      { score: 2, complete: false },
    ])).toBe(15);
  });

  it('all incomplete: plain average', () => {
    expect(computeWave([
      { score: 6, complete: false },
      { score: 3, complete: false },
      { score: 3, complete: false },
    ])).toBe(4);
  });

  it('only meet on record: its score', () => {
    expect(computeWave([{ score: 9, complete: false }])).toBe(9);
    expect(computeWave([])).toBeNull();
  });

  it('only considers the last three meets', () => {
    expect(computeWave([
      { score: 10, complete: true },
      { score: 10, complete: true },
      { score: 10, complete: true },
      { score: 22, complete: true },
    ])).toBeCloseTo(10, 10);
  });
});

describe('grade bands (4.2.2.5)', () => {
  it('maps WAVE to grades', () => {
    expect(gradeForWave(11)).toBe('A');
    expect(gradeForWave(22)).toBe('A');
    expect(gradeForWave(10.999)).toBe('B');
    expect(gradeForWave(8)).toBe('B');
    expect(gradeForWave(7.999)).toBe('C');
    expect(gradeForWave(5.5)).toBe('C');
    expect(gradeForWave(5.499)).toBe('D');
    expect(gradeForWave(null)).toBe('D');
  });
});
