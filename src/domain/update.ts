// Post-meet WAVE projection (4.2.2): insert this meet's score as the most
// recent meet and recompute the dog's Breed or Mixed WAVE.

import { computeWave, round3 } from './wave';
import { meetScores } from './scoring';
import type { Division, Entry, ProgramDraw } from './types';
import { computeStandings } from './scoring';

export interface WaveProjection {
  entryId: string;
  kind: 'breed' | 'mixed';
  meetScore: number;
  complete: boolean;
  oldWave: number | null;
  newWave: number | null;
}

/**
 * Projected new WAVEs for every starter in a division. A dog racing as a
 * leftover in a breed division has its score applied to its Mixed WAVE
 * (4.2.2); guide meets are assumed complete (the guide does not flag them).
 */
export function projectWaves(
  division: Division,
  draws: ProgramDraw[],
  entries: Map<string, Entry>
): WaveProjection[] {
  const scores = meetScores(division, draws);
  const standings = computeStandings(division, draws, entries);
  const out: WaveProjection[] = [];
  // A dog that ran all programs without competition ran a schooling meet:
  // no WAVE is assigned/changed (4.2.2.4).
  if (standings.length === 1) {
    const e = entries.get(standings[0].entryId)!;
    const asMixed = division.type === 'mixed' || division.leftoverIds.includes(e.id);
    return [
      {
        entryId: e.id,
        kind: asMixed ? 'mixed' : 'breed',
        meetScore: scores[e.id] ?? 0,
        complete: standings[0].completedMeet,
        oldWave: asMixed ? e.mwave : e.bwave,
        newWave: asMixed ? e.mwave : e.bwave,
      },
    ];
  }
  for (const s of standings) {
    const e = entries.get(s.entryId)!;
    const asMixed = division.type === 'mixed' || division.leftoverIds.includes(e.id);
    const history = (asMixed ? e.guideMixedMeets : e.guideBreedMeets)
      .filter((m) => m.score !== null)
      .map((m) => ({ score: m.score as number, complete: true }));
    const withThis = [{ score: scores[s.entryId] ?? 0, complete: s.completedMeet }, ...history];
    out.push({
      entryId: s.entryId,
      kind: asMixed ? 'mixed' : 'breed',
      meetScore: scores[s.entryId] ?? 0,
      complete: s.completedMeet,
      oldWave: asMixed ? e.mwave : e.bwave,
      newWave: round3(computeWave(withThis)),
    });
  }
  return out;
}
