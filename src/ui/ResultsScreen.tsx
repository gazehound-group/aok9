import React, { useMemo } from 'react';
import { useMeet } from '../store/meetStore';
import { computeDivisionResults, divisionTrophies } from '../domain/championship';
import { projectWaves } from '../domain/update';
import { entryGrade } from '../domain/draw';
import { downloadReport } from '../io/reportExport';
import { downloadBackup } from '../io/backup';
import { Hint, Section, Warn } from './common';
import type { ChampAward } from '../domain/types';

const AWARD_KEYS: (keyof Omit<ChampAward, 'notes'>)[] = ['brc', 'nbrc', 'mrc', 'nmrc', 'trc'];
const AWARD_LABEL: Record<string, string> = {
  brc: 'BRC',
  nbrc: 'Nat. Breed',
  mrc: 'MRC',
  nmrc: 'Nat. Mixed',
  trc: 'TRC',
};

export function ResultsScreen() {
  const { state, dispatch } = useMeet();
  const entryMap = useMemo(() => new Map(state.entries.map((e) => [e.id, e])), [state.entries]);

  const incomplete = state.divisions.some((division) =>
    state.draws
      .filter((d) => d.divisionId === division.id)
      .some((d) => d.races.some((r) => !r.finished))
  );
  const programsMissing = state.draws.filter((d) => d.program === 3).length === 0;

  return (
    <div>
      {(incomplete || programsMissing) && (
        <Warn>
          The meet is not finished ({programsMissing ? 'program 3 not drawn' : 'unfinished races'}) —
          results below are provisional. All planned programs must be completed for an official meet
          (4.1.3).
        </Warn>
      )}

      {state.divisions.map((division) => {
        const res = computeDivisionResults(division, state.draws, entryMap);
        const waves = projectWaves(division, state.draws, entryMap);
        const trophies = divisionTrophies(res.standings, entryMap, (e) => entryGrade(e, division));
        if (res.standings.length === 0) return null;
        return (
          <Section
            key={division.id}
            title={
              <>
                {division.type === 'breed' ? 'Breed' : 'Mixed'}: {division.name}
                {division.ungraded && <span className="badge">UNGRADED</span>}
              </>
            }
          >
            <table className="tbl">
              <thead>
                <tr>
                  <th>Place</th>
                  <th>Dog</th>
                  <th>Score</th>
                  {AWARD_KEYS.map((k) => (
                    <th key={k}>{AWARD_LABEL[k]}</th>
                  ))}
                  <th>New WAVE</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {res.standings.map((s) => {
                  const e = entryMap.get(s.entryId)!;
                  const computed = res.awards[s.entryId];
                  const ov = state.overrides[s.entryId] ?? {};
                  const wave = waves.find((w) => w.entryId === s.entryId);
                  return (
                    <tr key={s.entryId}>
                      <td>{s.place}</td>
                      <td>
                        <b>{e.callName}</b>
                        {division.leftoverIds.includes(s.entryId) && (
                          <span className="badge leftover">LEFTOVER</span>
                        )}
                      </td>
                      <td>
                        <b>{s.total}</b>
                      </td>
                      {AWARD_KEYS.map((k) => {
                        const val = (ov[k] ?? computed[k]) as number;
                        const overridden = ov[k] !== undefined && ov[k] !== computed[k];
                        return (
                          <td key={k}>
                            <input
                              className={`award ${overridden ? 'overridden' : ''}`}
                              type="number"
                              step="0.25"
                              min="0"
                              value={val}
                              title={overridden ? `computed: ${computed[k]}` : 'computed value (editable)'}
                              onChange={(ev) => {
                                const num = Number(ev.target.value);
                                dispatch({
                                  type: 'setOverride',
                                  entryId: s.entryId,
                                  patch: num === computed[k] ? { [k]: undefined } : { [k]: num },
                                });
                              }}
                            />
                          </td>
                        );
                      })}
                      <td>
                        {wave?.newWave ?? '—'}
                        {wave && wave.oldWave !== null && (
                          <small> (was {wave.oldWave})</small>
                        )}
                      </td>
                      <td className="flags">
                        {!s.completedMeet && 'incomplete '}
                        {!s.finishedAllRaces && s.completedMeet && 'OC/DNF '}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="trophies">
              <b>Trophies (5.1):</b> High Score: <b>{trophies.highScore ?? '—'}</b>
              {' · '}High Score Opposite Sex: <b>{trophies.highScoreOppositeSex ?? '—'}</b>
              {' · '}High Score FTE: <b>{trophies.highScoreFTE ?? '—'}</b>
              {' · '}Per grade:{' '}
              {Object.entries(trophies.highScorePerGrade)
                .map(([g, n]) => `${g}: ${n}`)
                .join(', ') || '—'}
            </div>
            <details>
              <summary>How points were calculated</summary>
              <ul className="explain">
                {res.explanations.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </details>
          </Section>
        );
      })}

      <Section title="Reports">
        <div className="btn-row">
          <button className="big" onClick={() => downloadReport(state)}>
            ⬇ Export NRD report (.xlsx)
          </button>
          <button className="secondary" onClick={() => window.print()}>
            🖨 Print scoring sheet
          </button>
          <button className="secondary" onClick={() => downloadBackup(state)}>
            Export meet backup (.json)
          </button>
        </div>
        <Hint>
          The xlsx follows the official “AOK9 Race Meet Report Template” (Summary + race-by-race
          sheets, plus an unofficial WAVE projection sheet). Email it to the NRD within 48 hours of
          the meet (2.2). Championship point cells above are editable — edited values are marked
          and exported.
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
