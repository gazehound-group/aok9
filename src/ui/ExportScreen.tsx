import React, { useMemo } from 'react';
import { useMeet } from '../store/meetStore';
import { computeDivisionResults } from '../domain/championship';
import { downloadReport } from '../io/reportExport';
import { downloadBackup } from '../io/backup';
import { Hint, Section } from './common';

export function ExportScreen() {
  const { state } = useMeet();
  const entryMap = useMemo(() => new Map(state.entries.map((e) => [e.id, e])), [state.entries]);

  return (
    <div>
      <Section title="Export">
        <div className="btn-row">
          <button className="big" onClick={() => downloadReport(state)}>
            Export NRD report (.xlsx)
          </button>
          <button className="secondary" onClick={() => window.print()}>
            Print scoring sheet
          </button>
          <button className="secondary" onClick={() => downloadBackup(state)}>
            Export meet backup (.json)
          </button>
        </div>
        <Hint>
          The xlsx follows the official “AOK9 Race Meet Report Template” (Summary + race-by-race
          sheets, plus an unofficial WAVE projection sheet). Email it to the NRD within 48 hours of
          the meet (2.2). Championship point edits made on the Results page are included.
        </Hint>
      </Section>

      {/* Print-only final scoring sheet */}
      <div className="print-only">
        <h1>
          {state.info.clubName} — {state.info.meetId} — {state.info.date}
        </h1>
        <h2>Official Meet Results</h2>
        {state.divisions.map((division) => {
          const res = computeDivisionResults(division, state.draws, entryMap);
          if (res.standings.length === 0) return null;
          return (
            <div key={division.id} className="print-division">
              <h3>
                {division.type === 'breed' ? 'Breed' : 'Mixed'} Division: {division.name}
              </h3>
              <table className="print-tbl">
                <thead>
                  <tr>
                    <th>Place</th>
                    <th>Dog</th>
                    <th>Owner</th>
                    <th>Score</th>
                    <th>BRC</th>
                    <th>NBRC</th>
                    <th>MRC</th>
                    <th>NMRC</th>
                    <th>TRC</th>
                  </tr>
                </thead>
                <tbody>
                  {res.standings.map((s) => {
                    const e = entryMap.get(s.entryId)!;
                    const a = { ...res.awards[s.entryId], ...state.overrides[s.entryId] };
                    return (
                      <tr key={s.entryId}>
                        <td>{s.place}</td>
                        <td>{e.callName}</td>
                        <td>{e.owner ?? ''}</td>
                        <td>{s.total}</td>
                        <td>{a.brc || ''}</td>
                        <td>{a.nbrc || ''}</td>
                        <td>{a.mrc || ''}</td>
                        <td>{a.nmrc || ''}</td>
                        <td>{a.trc || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
