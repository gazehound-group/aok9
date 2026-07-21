// The bundled sample meet is a shipped feature (Home → "Load sample meet"),
// and it is cast to MeetState on import, so nothing else would catch it going
// stale if the state shape changes. These assertions run the real domain
// engine over it and pin the results.

import { describe, expect, it } from 'vitest';
import sample from '../sample-meet.json';
import { computeDivisionResults } from '../../domain/championship';
import type { Entry, MeetState } from '../../domain/types';

const state = sample as unknown as MeetState;
const entryMap = new Map<string, Entry>(state.entries.map((e) => [e.id, e]));

const resultsFor = (name: string) => {
  const div = state.divisions.find((d) => d.name === name)!;
  const res = computeDivisionResults(div, state.draws, entryMap);
  return res.standings.map((s) => ({
    name: entryMap.get(s.entryId)!.callName,
    total: s.total,
    ...res.awards[s.entryId],
  }));
};

describe('bundled sample meet', () => {
  it('is a complete, finished meet that opens on the home page', () => {
    expect(state.phase).toBe('home');
    expect(state.info.meetId).toBe('2026-A01');
    expect(state.entries).toHaveLength(19);
    expect(state.divisions).toHaveLength(4);
    expect([...new Set(state.draws.map((d) => d.program))].sort()).toEqual([1, 2, 3]);
    expect(state.draws.every((d) => d.races.every((r) => r.finished))).toBe(true);
  });

  it('covers the outcome types a secretary needs to see demonstrated', () => {
    const kinds = new Set(
      state.draws.flatMap((d) => d.races.flatMap((r) => Object.values(r.outcomes).map((o) => o.kind)))
    );
    for (const kind of ['placed', 'ABS', 'DNF', 'OC', 'DQ']) expect(kinds).toContain(kind);
    expect(state.entries.some((e) => e.preScratched)).toBe(true);
  });

  it('scores every division without error', () => {
    for (const div of state.divisions) {
      expect(() => computeDivisionResults(div, state.draws, entryMap)).not.toThrow();
    }
  });

  it('splits championship points between dogs tied on race points (5.2)', () => {
    const jrt = resultsFor('JACK RUSSELL TERRIER');
    // 7 starters -> chart row [2.0, 1.0]; Coco Puff and Arthur both finish on
    // 17 points, so they share the 1st+2nd values: (2.0 + 1.0) / 2 = 1.5 each.
    expect(jrt.slice(0, 2)).toEqual([
      expect.objectContaining({ name: 'Coco Puff', total: 17, brc: 1.5 }),
      expect.objectContaining({ name: 'Arthur', total: 17, brc: 1.5 }),
    ]);
  });

  it('awards an MRC champion breed points but withholds TRC from unfinished dogs', () => {
    // Azhidar holds an MRC title, which does not bar him from BRC points.
    const taigan = resultsFor('TAIGAN');
    expect(taigan[0]).toEqual(expect.objectContaining({ name: 'Ak-Tosh', brc: 1 }));
    expect(taigan[1]).toEqual(expect.objectContaining({ name: 'Azhidar', brc: 0.5 }));

    // The only last-place dog that finished every race is Birdie, so she is the
    // only Turtle Racing point earner in the meet (5.7).
    const trcWinners = state.divisions
      .flatMap((d) => resultsFor(d.name))
      .filter((r) => r.trc > 0)
      .map((r) => r.name);
    expect(trcWinners).toEqual(['Birdie']);
  });
});
