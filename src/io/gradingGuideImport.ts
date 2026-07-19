// Runtime import of an official Grading Guide xlsx (same layout as bundled).

import * as XLSX from 'xlsx';
import type { GuideDog, GuideMeet } from '../domain/types';

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v).trim() || null;

function meetAt(row: unknown[], i: number): GuideMeet | null {
  const id = str(row[i]);
  const score = num(row[i + 2]);
  if (id === null && score === null) return null;
  return { meet: id, score };
}

/** Parse a Grading Guide workbook (ArrayBuffer of the xlsx file). */
export function parseGradingGuide(buf: ArrayBuffer): GuideDog[] {
  const wb = XLSX.read(buf, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  const dogs: GuideDog[] = [];
  let breed: string | null = null;
  for (let i = 5; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => c === null)) continue;
    const a = str(r[0]);
    const callName = str(r[1]);
    if (a && !callName && !num(r[2]) && !str(r[4])) {
      breed = a.replace(/\s+/g, ' ').trim();
      continue;
    }
    if (!a || !callName) continue;
    dogs.push({
      regNo: a,
      callName,
      breed,
      bwave: num(r[2]),
      mwave: num(r[3]),
      registeredName: str(r[4]),
      owner: str(r[5]),
      brc: num(r[7]) ?? 0,
      nbrc: num(r[8]) ?? 0,
      mrc: num(r[9]) ?? 0,
      nmrc: num(r[10]) ?? 0,
      trc: num(r[11]) ?? 0,
      breedMeets: [meetAt(r, 13), meetAt(r, 16), meetAt(r, 19)].filter(Boolean) as GuideMeet[],
      mixedMeets: [meetAt(r, 22), meetAt(r, 25), meetAt(r, 28)].filter(Boolean) as GuideMeet[],
    });
  }
  return dogs;
}
