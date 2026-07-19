// Figure 8.1 — Race Set-Up Chart, encoded verbatim from the rule book (page 28).
// For each total number of dogs (2..48): race sizes listed from High Point (HP)
// race down to Low Point (LP) race, exactly as published. Races are RUN in the
// opposite order (LP first, HP last).

/** Race sizes ordered HP -> LP, exactly as printed in Figure 8.1. */
const CHART: Record<number, number[]> = {
  2: [2],
  3: [3],
  4: [4],
  5: [3, 2],
  6: [4, 2],
  7: [4, 3],
  8: [4, 4],
  9: [4, 2, 3],
  10: [4, 3, 3],
  11: [4, 3, 4],
  12: [4, 4, 4],
  13: [4, 3, 3, 3],
  14: [4, 3, 3, 4],
  15: [4, 4, 3, 4],
  16: [4, 4, 4, 4],
  17: [4, 3, 3, 3, 4],
  18: [4, 4, 3, 3, 4],
  19: [4, 4, 4, 3, 4],
  20: [4, 4, 4, 4, 4],
  21: [4, 4, 3, 3, 3, 4],
  22: [4, 4, 4, 3, 3, 4],
  23: [4, 4, 4, 4, 3, 4],
  24: [4, 4, 4, 4, 4, 4],
  25: [4, 4, 4, 3, 3, 3, 4],
  26: [4, 4, 4, 4, 3, 3, 4],
  27: [4, 4, 4, 4, 4, 3, 4],
  28: [4, 4, 4, 4, 4, 4, 4],
  29: [4, 4, 4, 4, 3, 3, 3, 4],
  30: [4, 4, 4, 4, 4, 3, 3, 4],
  31: [4, 4, 4, 4, 4, 4, 3, 4],
  32: [4, 4, 4, 4, 4, 4, 4, 4],
  33: [4, 4, 4, 4, 4, 3, 3, 3, 4],
  34: [4, 4, 4, 4, 4, 4, 3, 3, 4],
  35: [4, 4, 4, 4, 4, 4, 4, 3, 4],
  36: [4, 4, 4, 4, 4, 4, 4, 4, 4],
  37: [4, 4, 4, 4, 4, 4, 3, 3, 3, 4],
  38: [4, 4, 4, 4, 4, 4, 4, 3, 3, 4],
  39: [4, 4, 4, 4, 4, 4, 4, 4, 3, 4],
  40: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  41: [4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 4],
  42: [4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 4],
  43: [4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 4],
  44: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  45: [4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 4],
  46: [4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 4],
  47: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 4],
  48: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
};

export const MAX_CHART_DOGS = 48;
export const MIN_CHART_DOGS = 2;

/**
 * Race sizes for a division of `n` dogs, ordered HP race first (as printed).
 * Index 0 is the High Point race; the last element is the Low Point race.
 */
export function raceSizesHpFirst(n: number): number[] {
  const row = CHART[n];
  if (!row) throw new Error(`Figure 8.1 has no row for ${n} dogs (valid: 2-48)`);
  return [...row];
}

/**
 * Race sizes in RUN order (race 1 runs first = LP; last race = HP).
 * raceNo is 1-based in this order throughout the app.
 */
export function raceSizesRunOrder(n: number): number[] {
  return raceSizesHpFirst(n).reverse();
}
