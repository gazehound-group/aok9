// WAVE (weighted average) calculation (4.2.2) and grade bands (4.2.2.5).

import type { Grade } from './types';

export interface WaveMeet {
  score: number;
  complete: boolean;
}

/**
 * Compute a WAVE from up to the last three meets (index 0 = most recent).
 * Rules 4.2.2.1 - 4.2.2.3:
 * - 3 complete meets in the last three: [m1 + 0.7*m2 + 0.5*m3] / 2.2
 * - exactly 2 complete: [c1 + 0.7*c2] / 1.7 (using the complete meets)
 * - exactly 1 complete: that meet's score
 * - none complete: plain average of the scores on record
 * Returns null when there are no meets.
 */
export function computeWave(meets: WaveMeet[]): number | null {
  const last3 = meets.slice(0, 3);
  if (last3.length === 0) return null;
  const complete = last3.filter((m) => m.complete);
  if (complete.length === 3) {
    return (complete[0].score + 0.7 * complete[1].score + 0.5 * complete[2].score) / 2.2;
  }
  if (complete.length === 2) {
    return (complete[0].score + 0.7 * complete[1].score) / 1.7;
  }
  if (complete.length === 1) {
    return complete[0].score;
  }
  const sum = last3.reduce((s, m) => s + m.score, 0);
  return sum / last3.length;
}

/** Grade bands (4.2.2.5): A 11-22, B 8-10.999, C 5.5-7.999, D < 5.5. */
export function gradeForWave(wave: number | null): Grade {
  if (wave === null) return 'D';
  if (wave >= 11) return 'A';
  if (wave >= 8) return 'B';
  if (wave >= 5.5) return 'C';
  return 'D';
}

/** Nominal WAVE used to slot an FTE dog into a graded sort by its assigned grade. */
export function nominalWaveForGrade(grade: Grade): number {
  switch (grade) {
    case 'A':
      return 11;
    case 'B':
      return 8;
    case 'C':
      return 5.5;
    case 'D':
      return 0;
  }
}

export function round3(n: number | null): number | null {
  return n === null ? null : Math.round(n * 1000) / 1000;
}
