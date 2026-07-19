// Single-meet state store: reducer + React context + localStorage autosave.

import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { drawFirstProgram, redrawPosts } from '../domain/draw';
import { drawNextProgram } from '../domain/rotation';
import { newId } from '../domain/divisions';
import type {
  ChampAward,
  Division,
  Entry,
  MeetInfo,
  MeetState,
  Phase,
  ProgramDraw,
  RaceOutcome,
} from '../domain/types';

const STORAGE_KEY = 'aok9-meet-v1';

export function emptyMeet(): MeetState {
  return {
    info: {
      clubName: '',
      meetId: '',
      date: new Date().toISOString().slice(0, 10),
      fteThreshold: 0.75,
    },
    phase: 'setup',
    entries: [],
    divisions: [],
    draws: [],
    overrides: {},
  };
}

export type Action =
  | { type: 'setInfo'; info: Partial<MeetInfo> }
  | { type: 'setPhase'; phase: Phase }
  | { type: 'addEntry'; entry: Entry }
  | { type: 'updateEntry'; id: string; patch: Partial<Entry> }
  | { type: 'removeEntry'; id: string }
  | { type: 'setDivisions'; divisions: Division[] }
  | { type: 'updateDivision'; id: string; patch: Partial<Division> }
  | { type: 'drawProgram'; program: 1 | 2 | 3 }
  | { type: 'redrawDivision'; program: 1 | 2 | 3; divisionId: string }
  | { type: 'redrawPosts'; raceId: string }
  | { type: 'swapDogs'; program: 1 | 2 | 3; divisionId: string; a: string; b: string }
  | { type: 'lockProgram'; program: 1 | 2 | 3 }
  | { type: 'setRaceResult'; raceId: string; outcomes: Record<string, RaceOutcome>; finished: boolean }
  | { type: 'setRaceFlags'; raceId: string; rerun?: boolean; splitAllPoints?: boolean; note?: string }
  | { type: 'setOverride'; entryId: string; patch: Partial<ChampAward> | null }
  | { type: 'importState'; state: MeetState }
  | { type: 'reset' };

function mapRace(draws: ProgramDraw[], raceId: string, fn: (r: ProgramDraw['races'][number]) => ProgramDraw['races'][number]): ProgramDraw[] {
  return draws.map((d) => ({
    ...d,
    races: d.races.map((r) => (r.id === raceId ? fn(r) : r)),
  }));
}

export function reducer(state: MeetState, action: Action): MeetState {
  switch (action.type) {
    case 'setInfo':
      return { ...state, info: { ...state.info, ...action.info } };
    case 'setPhase':
      return { ...state, phase: action.phase };
    case 'addEntry':
      return { ...state, entries: [...state.entries, action.entry] };
    case 'updateEntry':
      return {
        ...state,
        entries: state.entries.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)),
      };
    case 'removeEntry':
      return {
        ...state,
        entries: state.entries.filter((e) => e.id !== action.id),
        divisions: state.divisions.map((d) => ({
          ...d,
          entryIds: d.entryIds.filter((id) => id !== action.id),
          leftoverIds: d.leftoverIds.filter((id) => id !== action.id),
        })),
      };
    case 'setDivisions':
      return { ...state, divisions: action.divisions };
    case 'updateDivision':
      return {
        ...state,
        divisions: state.divisions.map((d) => (d.id === action.id ? { ...d, ...action.patch } : d)),
      };
    case 'drawProgram': {
      const entryMap = new Map(state.entries.map((e) => [e.id, e]));
      const kept = state.draws.filter((d) => d.program !== action.program);
      const fresh: ProgramDraw[] = state.divisions.map((division) =>
        action.program === 1
          ? drawFirstProgram(division, entryMap, Math.random)
          : drawNextProgram(division, kept, entryMap, action.program as 2 | 3, Math.random)
      );
      return { ...state, draws: [...kept, ...fresh] };
    }
    case 'redrawDivision': {
      const entryMap = new Map(state.entries.map((e) => [e.id, e]));
      const others = state.draws.filter(
        (d) => !(d.program === action.program && d.divisionId === action.divisionId)
      );
      const division = state.divisions.find((d) => d.id === action.divisionId)!;
      const fresh =
        action.program === 1
          ? drawFirstProgram(division, entryMap, Math.random)
          : drawNextProgram(division, others, entryMap, action.program as 2 | 3, Math.random);
      return { ...state, draws: [...others, fresh] };
    }
    case 'redrawPosts':
      return { ...state, draws: mapRace(state.draws, action.raceId, (r) => redrawPosts(r, Math.random)) };
    case 'swapDogs': {
      return {
        ...state,
        draws: state.draws.map((d) => {
          if (d.program !== action.program || d.divisionId !== action.divisionId) return d;
          return {
            ...d,
            races: d.races.map((r) => ({
              ...r,
              slots: r.slots.map((s) =>
                s.entryId === action.a
                  ? { ...s, entryId: action.b }
                  : s.entryId === action.b
                    ? { ...s, entryId: action.a }
                    : s
              ),
            })),
          };
        }),
      };
    }
    case 'lockProgram':
      return {
        ...state,
        draws: state.draws.map((d) => (d.program === action.program ? { ...d, locked: true } : d)),
      };
    case 'setRaceResult':
      return {
        ...state,
        draws: mapRace(state.draws, action.raceId, (r) => ({
          ...r,
          outcomes: action.outcomes,
          finished: action.finished,
        })),
      };
    case 'setRaceFlags':
      return {
        ...state,
        draws: mapRace(state.draws, action.raceId, (r) => ({
          ...r,
          rerun: action.rerun ?? r.rerun,
          splitAllPoints: action.splitAllPoints ?? r.splitAllPoints,
          note: action.note ?? r.note,
        })),
      };
    case 'setOverride': {
      const overrides = { ...state.overrides };
      if (action.patch === null) delete overrides[action.entryId];
      else overrides[action.entryId] = { ...overrides[action.entryId], ...action.patch };
      return { ...state, overrides };
    }
    case 'importState':
      return action.state;
    case 'reset':
      return emptyMeet();
    default:
      return state;
  }
}

export function loadSaved(): MeetState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MeetState;
    if (!parsed || !parsed.info) return null;
    return { ...emptyMeet(), ...parsed };
  } catch {
    return null;
  }
}

const Ctx = createContext<{ state: MeetState; dispatch: React.Dispatch<Action> } | null>(null);

export function MeetProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadSaved() ?? emptyMeet());
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full/unavailable: keep running, backups still possible via export
    }
  }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMeet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMeet outside provider');
  return ctx;
}

/** Create an Entry from a Grading Guide dog. */
export function entryFromGuide(dog: import('../domain/types').GuideDog): Entry {
  return {
    id: newId('entry'),
    regNo: dog.regNo,
    callName: dog.callName,
    registeredName: dog.registeredName,
    breed: dog.breed ?? 'UNKNOWN',
    sex: '',
    owner: dog.owner,
    fte: false,
    bwave: dog.bwave,
    mwave: dog.mwave,
    fteGrade: 'D',
    hasBRC: dog.brc >= 12,
    hasMRC: dog.mrc >= 2 && dog.brc + dog.mrc >= 12,
    hasSBRC: dog.nbrc >= 30,
    hasSMRC: dog.nmrc >= 30,
    guidePoints: { brc: dog.brc, nbrc: dog.nbrc, mrc: dog.mrc, nmrc: dog.nmrc, trc: dog.trc },
    guideBreedMeets: dog.breedMeets,
    guideMixedMeets: dog.mixedMeets,
    preScratched: false,
  };
}

export function blankFteEntry(): Entry {
  return {
    id: newId('entry'),
    regNo: null,
    callName: '',
    registeredName: null,
    breed: '',
    sex: '',
    owner: null,
    fte: true,
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
  };
}
