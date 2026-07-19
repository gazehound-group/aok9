// Builds the official "AOK9 Race Meet Report" workbook (Summary + RBR sheets)
// from the finished meet, plus an unofficial WAVE projection sheet.

import * as XLSX from 'xlsx';
import { computeDivisionResults } from '../domain/championship';
import { scoreRace } from '../domain/points';
import { projectWaves } from '../domain/update';
import type { ChampAward, Division, Entry, MeetState, ProgramDraw } from '../domain/types';

type Row = (string | number | null)[];

function outcomesNote(division: Division, draws: ProgramDraw[], entryId: string): string {
  const notes: string[] = [];
  for (const draw of draws.filter((d) => d.divisionId === division.id)) {
    for (const race of draw.races) {
      const oc = race.outcomes[entryId];
      if (!oc) continue;
      if (oc.kind === 'OC') notes.push(`OC P${draw.program}`);
      if (oc.kind === 'DNF') notes.push(`DNF P${draw.program}`);
      if (oc.kind === 'DQ') notes.push(`DQ P${draw.program}`);
      if (oc.kind === 'ABS') notes.push(`SCR P${draw.program}`);
    }
  }
  return notes.join(', ');
}

export function mergedAwards(state: MeetState, divisionId: string): Record<string, ChampAward> {
  const division = state.divisions.find((d) => d.id === divisionId)!;
  const entryMap = new Map(state.entries.map((e) => [e.id, e]));
  const res = computeDivisionResults(division, state.draws, entryMap);
  const awards: Record<string, ChampAward> = {};
  for (const [id, a] of Object.entries(res.awards)) {
    awards[id] = { ...a, ...state.overrides[id] };
  }
  return awards;
}

export function buildReportWorkbook(state: MeetState): XLSX.WorkBook {
  const entryMap = new Map(state.entries.map((e) => [e.id, e]));
  const wb = XLSX.utils.book_new();

  // ---------- Summary sheet ----------
  const summary: Row[] = [
    [`CLUB NAME: ${state.info.clubName}`],
    ['MEET TYPE: SPRINT'],
    [`DATE: ${state.info.date}`],
    [`MEET ID: ${state.info.meetId}`],
    [],
  ];
  for (const division of state.divisions) {
    const res = computeDivisionResults(division, state.draws, entryMap);
    const awards = mergedAwards(state, division.id);
    const label =
      division.type === 'breed' ? `BREED - ${division.name}` : `MIXED - ${division.name}`;
    summary.push([`DIVISION TYPE: ${label}${division.ungraded ? ' (UNGRADED)' : ''}`]);
    summary.push([
      'ARN*',
      'PLACE',
      'CALL NAME',
      'OWNER NAME',
      'SCORE',
      'BRC',
      'NBRC',
      'MRC',
      'NMRC',
      'TRC',
      'NAT',
      'NOTES (DQ, SCR, OC)',
    ]);
    for (const s of res.standings) {
      const e = entryMap.get(s.entryId)!;
      const a = awards[s.entryId];
      const leftover = division.leftoverIds.includes(s.entryId) ? ' (LEFTOVER)' : '';
      summary.push([
        e.regNo ?? `PENDING (${e.breed})`,
        s.place,
        e.callName + leftover,
        e.owner ?? '',
        s.total,
        a.brc || null,
        a.nbrc || null,
        a.mrc || null,
        a.nmrc || null,
        a.trc || null,
        (a.nbrc || 0) + (a.nmrc || 0) || null,
        outcomesNote(division, state.draws, s.entryId),
      ]);
    }
    summary.push(['*Any dogs with pending registration MUST have breed indicated']);
    summary.push([]);
  }
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  wsSummary['!cols'] = [
    { wch: 18 }, { wch: 7 }, { wch: 22 }, { wch: 22 }, { wch: 7 },
    { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // ---------- RBR (race-by-race) sheet ----------
  const rbr: Row[] = [[`DATE: ${state.info.date}`], ['RACE BY RACE RESULTS'], []];
  for (const division of state.divisions) {
    const label =
      division.type === 'breed' ? `BREED - ${division.name}` : `MIXED - ${division.name}`;
    rbr.push([`DIVISION (BREED OR MIXED): ${label}`]);
    const draws = ([1, 2, 3] as const).map((p) =>
      state.draws.find((d) => d.divisionId === division.id && d.program === p)
    );
    const maxRaces = Math.max(...draws.map((d) => d?.races.length ?? 0));
    for (let rn = 1; rn <= maxRaces; rn++) {
      const header: Row = [];
      const rows: Row[] = [[], [], [], []];
      for (const draw of draws) {
        const race = draw?.races.find((r) => r.raceNo === rn);
        header.push('Place', race ? `Program ${draw!.program}, Race ${rn}${race.isHP ? ' (HP)' : ''}` : '', 'Score');
        const pts = race && race.finished && draw ? scoreRace(race, division.ungraded) : {};
        const ordered = race
          ? [...race.slots].sort((a, b) => {
              const oa = race.outcomes[a.entryId];
              const ob = race.outcomes[b.entryId];
              const pa = oa?.kind === 'placed' ? oa.place : 99;
              const pb = ob?.kind === 'placed' ? ob.place : 99;
              return pa - pb;
            })
          : [];
        for (let i = 0; i < 4; i++) {
          const slot = ordered[i];
          if (!slot) {
            rows[i].push(null, null, null);
            continue;
          }
          const oc = race!.outcomes[slot.entryId];
          const name = entryMap.get(slot.entryId)?.callName ?? '';
          const placeLabel =
            oc?.kind === 'placed' ? oc.place : oc ? oc.kind : '-';
          rows[i].push(placeLabel as string | number, name, pts[slot.entryId] ?? null);
        }
      }
      rbr.push(header, ...rows, []);
    }
    rbr.push([]);
  }
  const wsRbr = XLSX.utils.aoa_to_sheet(rbr);
  wsRbr['!cols'] = Array.from({ length: 9 }, (_, i) => (i % 3 === 1 ? { wch: 26 } : { wch: 8 }));
  XLSX.utils.book_append_sheet(wb, wsRbr, 'RBR');

  // ---------- WAVE projection (unofficial helper) ----------
  const waveRows: Row[] = [
    ['PROJECTED WAVES AFTER THIS MEET (unofficial — NRD maintains the official guide)'],
    ['REG#', 'CALL NAME', 'DIVISION', 'TYPE', 'MEET SCORE', 'COMPLETE', 'OLD WAVE', 'NEW WAVE'],
  ];
  for (const division of state.divisions) {
    for (const p of projectWaves(division, state.draws, entryMap)) {
      const e = entryMap.get(p.entryId)!;
      waveRows.push([
        e.regNo ?? 'PENDING',
        e.callName,
        division.name,
        p.kind === 'breed' ? 'BWAVE' : 'MWAVE',
        p.meetScore,
        p.complete ? 'YES' : 'NO',
        p.oldWave,
        p.newWave,
      ]);
    }
  }
  const wsWave = XLSX.utils.aoa_to_sheet(waveRows);
  wsWave['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 8 }, { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 9 }];
  XLSX.utils.book_append_sheet(wb, wsWave, 'WAVE Projection');

  return wb;
}

export function downloadReport(state: MeetState): void {
  const wb = buildReportWorkbook(state);
  const name = `AOK9 Race Meet Report - ${state.info.meetId || state.info.date}.xlsx`;
  XLSX.writeFile(wb, name);
}
