import { describe, expect, it } from 'vitest';
import { raceSizesHpFirst, raceSizesRunOrder } from '../chart';

describe('Figure 8.1 race set-up chart', () => {
  it('matches the published rows quoted in the requirements', () => {
    expect(raceSizesHpFirst(10)).toEqual([4, 3, 3]); // one 4-dog and two 3-dog races
    expect(raceSizesHpFirst(5)).toEqual([3, 2]);
    expect(raceSizesHpFirst(9)).toEqual([4, 2, 3]); // published oddity: 2-dog mid, 3-dog low
    expect(raceSizesHpFirst(11)).toEqual([4, 3, 4]);
    expect(raceSizesHpFirst(13)).toEqual([4, 3, 3, 3]);
    expect(raceSizesHpFirst(48)).toEqual(Array(12).fill(4));
  });

  it('sizes always sum to the total number of dogs (2..48)', () => {
    for (let n = 2; n <= 48; n++) {
      const sizes = raceSizesHpFirst(n);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
      // HP race has 4 dogs from 6 entries up (published row 5 uses a 3-dog HP)
      if (n >= 6) expect(sizes[0]).toBe(4);
      // no race bigger than 4 or smaller than 2
      for (const s of sizes) {
        expect(s).toBeGreaterThanOrEqual(2);
        expect(s).toBeLessThanOrEqual(4);
      }
    }
  });

  it('run order is the reverse of the printed HP-first order', () => {
    expect(raceSizesRunOrder(10)).toEqual([3, 3, 4]);
    expect(raceSizesRunOrder(9)).toEqual([3, 2, 4]);
  });

  it('rejects totals outside the chart', () => {
    expect(() => raceSizesHpFirst(1)).toThrow();
    expect(() => raceSizesHpFirst(49)).toThrow();
  });
});
