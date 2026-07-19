import type { Division, Entry, ProgramDraw, Race, RaceOutcome } from '../types';

let seq = 0;

/** Deterministic RNG (mulberry32) so draws are reproducible in tests. */
export function seededRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mkEntry(over: Partial<Entry> & { callName: string }): Entry {
  seq += 1;
  return {
    id: over.id ?? `e${seq}`,
    regNo: null,
    registeredName: null,
    breed: 'WHIPPET',
    sex: '',
    owner: null,
    fte: false,
    bwave: null,
    mwave: null,
    fteGrade: 'D',
    hasBRC: false,
    hasMRC: false,
    hasSBRC: false,
    hasSMRC: false,
    guidePoints: { brc: 0, nbrc: 0, mrc: 0, nmrc: 0, trc: 0 },
    guideBreedMeets: [],
    guideMixedMeets: [],
    preScratched: false,
    ...over,
  };
}

export function mkDivision(entryIds: string[], over: Partial<Division> = {}): Division {
  return {
    id: over.id ?? 'div1',
    type: 'breed',
    name: 'WHIPPET',
    entryIds,
    leftoverIds: [],
    ungraded: false,
    ...over,
  };
}

export function entryMap(entries: Entry[]): Map<string, Entry> {
  return new Map(entries.map((e) => [e.id, e]));
}

/**
 * Record results for a race: `order` lists entryIds by finish (1st first);
 * `statuses` marks non-finishers. Places are assigned 1..n to the finishers
 * in order — DQ'd/OC'd dogs are excluded from placements automatically.
 */
export function finishRace(
  race: Race,
  order: string[],
  statuses: Record<string, 'OC' | 'DNF' | 'DQ' | 'ABS'> = {}
): void {
  const outcomes: Record<string, RaceOutcome> = {};
  let place = 1;
  for (const id of order) {
    if (statuses[id]) outcomes[id] = { kind: statuses[id] };
    else outcomes[id] = { kind: 'placed', place: place++ };
  }
  for (const slot of race.slots) {
    if (!outcomes[slot.entryId]) {
      const st = statuses[slot.entryId] ?? 'ABS';
      outcomes[slot.entryId] = { kind: st } as RaceOutcome;
    }
  }
  race.outcomes = outcomes;
  race.finished = true;
}

/** Find the race in a draw that contains a given dog. */
export function raceWith(draw: ProgramDraw, entryId: string): Race {
  const r = draw.races.find((x) => x.slots.some((s) => s.entryId === entryId));
  if (!r) throw new Error(`no race with ${entryId}`);
  return r;
}
