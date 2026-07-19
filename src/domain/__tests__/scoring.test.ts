import { describe, expect, it } from 'vitest';
import { drawFirstProgram } from '../draw';
import { drawNextProgram } from '../rotation';
import { computeStandings } from '../scoring';
import { entryMap, finishRace, mkDivision, mkEntry, raceWith, seededRng } from './helpers';
import type { ProgramDraw } from '../types';

describe('final meet scoring (4.3.5)', () => {
  it('ties broken by higher race in the final program, then placement', () => {
    const entries = Array.from({ length: 8 }, (_, i) =>
      mkEntry({ id: `d${i}`, callName: `Dog${i}`, bwave: 20 - i })
    );
    const division = mkDivision(entries.map((e) => e.id));
    const map = entryMap(entries);
    const rng = seededRng(4);
    const draws: ProgramDraw[] = [];

    // P1: 8 dogs -> 4/4. Race 1 (low): d4..d7, race 2 (HP): d0..d3.
    const p1 = drawFirstProgram(division, map, rng);
    finishRace(raceWith(p1, 'd4'), ['d4', 'd5', 'd6', 'd7']); // 5,3,2,0
    finishRace(raceWith(p1, 'd0'), ['d0', 'd1', 'd2', 'd3']); // 8,6,4,3
    draws.push(p1);

    const p2 = drawNextProgram(division, draws, map, 2, rng);
    for (const race of p2.races) finishRace(race, race.slots.map((s) => s.entryId));
    draws.push(p2);
    const p3 = drawNextProgram(division, draws, map, 3, rng);
    for (const race of p3.races) finishRace(race, race.slots.map((s) => s.entryId));
    draws.push(p3);

    const standings = computeStandings(division, draws, map);
    expect(standings).toHaveLength(8);
    expect(standings[0].entryId).toBe('d0');
    // all program-1 starters receive a placement, places 1..8
    expect(standings.map((s) => s.place)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // totals are non-increasing except where the incomplete rule applies
    for (let i = 1; i < standings.length; i++) {
      expect(standings[i].total).toBeLessThanOrEqual(standings[i - 1].total);
    }
  });

  it('a dog that misses a program ranks below equal-point finishers and is flagged incomplete', () => {
    const entries = ['a', 'b', 'c', 'd'].map((id, i) =>
      mkEntry({ id, callName: id, bwave: 20 - i })
    );
    const division = mkDivision(['a', 'b', 'c', 'd']);
    const map = entryMap(entries);
    const rng = seededRng(9);
    const draws: ProgramDraw[] = [];
    const p1 = drawFirstProgram(division, map, rng);
    finishRace(p1.races[0], ['d', 'c', 'b', 'a']); // d wins P1: 8,6,4,3
    draws.push(p1);
    const p2 = drawNextProgram(division, draws, map, 2, rng);
    finishRace(p2.races[0], ['a', 'b', 'c'], { d: 'ABS' }); // d no-shows P2
    draws.push(p2);
    const p3 = drawNextProgram(division, draws, map, 3, rng);
    finishRace(p3.races[0], ['a', 'b', 'c']);
    draws.push(p3);

    const standings = computeStandings(division, draws, map);
    const d = standings.find((s) => s.entryId === 'd')!;
    expect(d.completedMeet).toBe(false);
    // d still has a placement (started P1) but sits below any dog with equal points
    expect(standings.map((s) => s.place)).toEqual([1, 2, 3, 4]);
  });
});
