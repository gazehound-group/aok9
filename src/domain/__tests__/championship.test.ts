import { describe, expect, it } from 'vitest';
import { chartRow, computeDivisionResults } from '../championship';
import { drawFirstProgram } from '../draw';
import { drawNextProgram } from '../rotation';
import { entryMap, finishRace, mkDivision, mkEntry, raceWith, seededRng } from './helpers';
import type { Division, Entry, ProgramDraw } from '../types';

describe('championship points chart (5.2/5.3/5.6)', () => {
  it('matches the published bands', () => {
    expect(chartRow(2)).toEqual([1.0, 0.5, 0, 0]);
    expect(chartRow(4)).toEqual([1.0, 0.5, 0, 0]);
    expect(chartRow(5)).toEqual([2.0, 1.0, 0, 0]);
    expect(chartRow(8)).toEqual([3.0, 1.5, 0.5, 0]);
    expect(chartRow(11)).toEqual([4.0, 2.0, 1.0, 0]);
    expect(chartRow(16)).toEqual([5.0, 3.0, 1.5, 0]);
    expect(chartRow(22)).toEqual([6.0, 4.0, 2.0, 0]);
    expect(chartRow(31)).toEqual([7.0, 5.0, 3.0, 0]);
    expect(chartRow(41)).toEqual([8.0, 6.0, 4.0, 2.0]);
  });
});

/** Run a clean 3-program meet where finish order always follows the listed ranking. */
function runCleanMeet(division: Division, entries: Entry[], ranking: string[]): ProgramDraw[] {
  const map = entryMap(entries);
  const rng = seededRng(11);
  const byRank = (ids: string[]) => [...ids].sort((a, b) => ranking.indexOf(a) - ranking.indexOf(b));
  const draws: ProgramDraw[] = [];
  const p1 = drawFirstProgram(division, map, rng);
  for (const race of p1.races) finishRace(race, byRank(race.slots.map((s) => s.entryId)));
  draws.push(p1);
  for (const prog of [2, 3] as const) {
    const p = drawNextProgram(division, draws, map, prog, rng);
    for (const race of p.races) finishRace(race, byRank(race.slots.map((s) => s.entryId)));
    draws.push(p);
  }
  return draws;
}

describe('TRC examples from 5.7', () => {
  it('example 1: champions above and below — 3rd (non-champ) gets points, no TRC', () => {
    const entries = [
      mkEntry({ id: 'a', callName: 'ChampA', bwave: 20, hasBRC: true }),
      mkEntry({ id: 'b', callName: 'ChampB', bwave: 18, hasBRC: true }),
      mkEntry({ id: 'c', callName: 'Plain', bwave: 16 }),
      mkEntry({ id: 'd', callName: 'ChampD', bwave: 14, hasBRC: true }),
    ];
    const division = mkDivision(['a', 'b', 'c', 'd']);
    const draws = runCleanMeet(division, entries, ['a', 'b', 'c', 'd']);
    const res = computeDivisionResults(division, draws, entryMap(entries));

    // eligible entry: first non-titled is 3rd place -> 2 dogs
    expect(res.eligibleEntryBreed).toBe(2);
    expect(res.awards['c'].brc).toBe(1.0); // High Score of the eligible entry
    expect(res.awards['a'].brc).toBe(0); // champions earn no BRC
    expect(res.awards['d'].brc).toBe(0);
    // last place is a champion -> no TRC at all
    for (const id of ['a', 'b', 'c', 'd']) expect(res.awards[id].trc).toBe(0);
  });

  it('example 2: no champions — 1st 1.0, 2nd 0.5, last gets 1.0 TRC', () => {
    const entries = ['a', 'b', 'c', 'd'].map((id, i) =>
      mkEntry({ id, callName: id.toUpperCase(), bwave: 20 - i })
    );
    const division = mkDivision(['a', 'b', 'c', 'd']);
    const draws = runCleanMeet(division, entries, ['a', 'b', 'c', 'd']);
    const res = computeDivisionResults(division, draws, entryMap(entries));

    expect(res.eligibleEntryBreed).toBe(4);
    expect(res.awards['a'].brc).toBe(1.0);
    expect(res.awards['b'].brc).toBe(0.5);
    expect(res.awards['c'].brc).toBe(0);
    expect(res.awards['d'].brc).toBe(0); // last place: not eligible for BRC
    expect(res.awards['d'].trc).toBe(1.0); // turtle points = first-place value
    expect(res.awards['a'].trc).toBe(0);
  });
});

describe('eligible entry example from 5.2', () => {
  it('entry of 12 with two champions on top and a leftover 3rd -> eligible 9', () => {
    const entries: Entry[] = [];
    for (let i = 0; i < 12; i++) {
      entries.push(
        mkEntry({
          id: `d${i}`,
          callName: `Dog${i}`,
          bwave: 22 - i,
          mwave: 22 - i,
          hasBRC: i < 2, // 1st and 2nd placing dogs are BRCs
        })
      );
    }
    const division = mkDivision(entries.map((e) => e.id), { leftoverIds: ['d2'] });
    const draws = runCleanMeet(division, entries, entries.map((e) => e.id));
    const res = computeDivisionResults(division, draws, entryMap(entries));

    // Rule book: "1st and 2nd placing dogs are both BRC's, and the 3rd place
    // dog is a leftover. The eligible entry for BRC points is therefore 9."
    expect(res.eligibleEntryBreed).toBe(9);

    // Final standings under full meet dynamics: d0, d1, d2(leftover), d4, d3...
    // (d4 overtakes d3 after promotion to the P2 High Score race.)
    const order = res.standings.map((s) => s.entryId);
    expect(order.slice(0, 6)).toEqual(['d0', 'd1', 'd2', 'd4', 'd3', 'd6']);

    // chart 8-10 -> 3.0/1.5/0.5. d4 and d3 tied on 11 racing points, so they
    // split the 1st+2nd high score values: (3.0 + 1.5) / 2 = 2.25 each (5.2).
    expect(res.awards['d4'].brc).toBe(2.25);
    expect(res.awards['d3'].brc).toBe(2.25);
    expect(res.awards['d6'].brc).toBe(0.5);
    expect(res.awards['d2'].brc).toBe(0); // leftover: mixed points only
    // Leftover placed 3rd overall -> 3rd High Score mixed slot of chart(12)
    expect(res.awards['d2'].mrc).toBe(1.0);
    // National Breed points on 11 starters (leftover not counted): 4/2/1/0.
    // The tied d4/d3 split the 3rd+4th slots: (1.0 + 0) / 2 = 0.5 each.
    expect(res.startersForNational).toBe(11);
    expect(res.awards['d0'].nbrc).toBe(4.0); // champions DO earn national points
    expect(res.awards['d1'].nbrc).toBe(2.0);
    expect(res.awards['d4'].nbrc).toBe(0.5);
    expect(res.awards['d3'].nbrc).toBe(0.5);
  });
});

describe('eligibility conditions (Ch. V)', () => {
  it('a dog that never defeated anyone earns nothing', () => {
    const entries = ['a', 'b'].map((id, i) => mkEntry({ id, callName: id, bwave: 10 - i }));
    const division = mkDivision(['a', 'b']);
    const draws = runCleanMeet(division, entries, ['a', 'b']);
    const res = computeDivisionResults(division, draws, entryMap(entries));
    expect(res.awards['a'].brc).toBe(1.0);
    // b: finished last AND never defeated anyone -> nothing, but gets TRC
    expect(res.awards['b'].brc).toBe(0);
    expect(res.awards['b'].trc).toBe(1.0);
  });

  it('a dog with an OC anywhere is not eligible for championship points', () => {
    const entries = ['a', 'b', 'c', 'd'].map((id, i) =>
      mkEntry({ id, callName: id, bwave: 20 - i })
    );
    const division = mkDivision(['a', 'b', 'c', 'd']);
    const map = entryMap(entries);
    const rng = seededRng(2);
    const draws: ProgramDraw[] = [];
    const p1 = drawFirstProgram(division, map, rng);
    finishRace(p1.races[0], ['a', 'c', 'd'], { b: 'OC' }); // b off course in P1
    draws.push(p1);
    for (const prog of [2, 3] as const) {
      const p = drawNextProgram(division, draws, map, prog, rng);
      for (const race of p.races) {
        const ids = race.slots.map((s) => s.entryId);
        finishRace(race, [...ids].sort()); // alphabetical: b beats c/d in P2/P3
      }
      draws.push(p);
    }
    const res = computeDivisionResults(division, draws, map);
    // b won races later but did not finish ALL races -> no championship points
    expect(res.awards['b'].brc).toBe(0);
    expect(res.awards['b'].nbrc).toBe(0);
  });
});
