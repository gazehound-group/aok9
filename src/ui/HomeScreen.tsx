import React, { useRef, useState } from 'react';
import { useMeet } from '../store/meetStore';
import { downloadBackup, parseBackup } from '../io/backup';
import { Hint, Section } from './common';
import type { MeetState, Phase } from '../domain/types';

/** How many of the three programs are fully finished. */
export function programsRun(state: MeetState): number {
  let n = 0;
  for (const p of [1, 2, 3]) {
    const draws = state.draws.filter((d) => d.program === p);
    if (draws.length > 0 && draws.every((d) => d.races.every((r) => r.finished))) n++;
  }
  return n;
}

/** The furthest step the meet has reached — where "Continue" should land. */
export function nextPhase(state: MeetState): Phase {
  if (state.entries.length === 0) return state.info.clubName ? 'entries' : 'setup';
  if (state.divisions.length === 0) return 'divisions';
  for (const p of [1, 2, 3] as const) {
    const draws = state.draws.filter((d) => d.program === p);
    if (draws.length === 0 || !draws.every((d) => d.races.every((r) => r.finished))) {
      return `program${p}`;
    }
  }
  return 'results';
}

export function HomeScreen() {
  const { state, dispatch } = useMeet();
  const restoreRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  return (
    <div className="landing">
      <h1>AOK9 Sprint Race Secretary</h1>
      <p className="subtitle">
        Offline app for running an official R.A.C.E. AOK9 Sprint Racing meet per Rule Book v3.0.
      </p>

      <Section title="Current meet">
        <div className="kv">
          <span>Club</span>
          <span>{state.info.clubName || '—'}</span>
          <span>Meet ID</span>
          <span>{state.info.meetId || '—'}</span>
          <span>Date</span>
          <span>{state.info.date}</span>
          <span>Entries</span>
          <span>{state.entries.length}</span>
          <span>Divisions</span>
          <span>{state.divisions.length}</span>
          <span>Programs run</span>
          <span>{programsRun(state)} / 3</span>
        </div>
        <div className="btn-row">
          <button onClick={() => dispatch({ type: 'setPhase', phase: nextPhase(state) })}>
            Continue
          </button>
          <button className="secondary" onClick={() => downloadBackup(state)}>
            Backup JSON
          </button>
          <button className="secondary" onClick={() => restoreRef.current?.click()}>
            Restore JSON
          </button>
          <button
            className="outline-danger"
            onClick={() => {
              if (confirm('Start a NEW meet? Current meet data will be cleared (back it up first if needed).')) {
                dispatch({ type: 'reset' });
              }
            }}
          >
            Reset
          </button>
        </div>
        <input
          ref={restoreRef}
          type="file"
          accept=".json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              dispatch({ type: 'importState', state: parseBackup(await f.text()) });
              setMsg(`Restored ${f.name}`);
            } catch (err) {
              setMsg(String(err));
            }
            e.target.value = '';
          }}
        />
        {msg && <Hint>{msg}</Hint>}
      </Section>

      <Section title="How it works">
        <ol className="howto">
          <li>
            <b>Meet setup</b> — club, date, meet ID.
          </li>
          <li>
            <b>Entries</b> — search the bundled Grading Guide by reg #, call name, or breed; add
            FTE dogs manually.
          </li>
          <li>
            <b>Divisions</b> — auto-suggest breed divisions; compose mixed divisions; mark
            leftover dogs.
          </li>
          <li>
            <b>Program 1</b> — graded WAVE draw (or random for ungraded per the ¾ rule) with
            post-position randomization.
          </li>
          <li>
            <b>Programs 2 &amp; 3</b> — rotate by cumulative points with the boundary-tie chain.
          </li>
          <li>
            <b>Results</b> — final placings, BRC/MRC/NRC/TRC point calculations.
          </li>
          <li>
            <b>Export</b> — official AOK9 Race Meet Report xlsx + full JSON backup.
          </li>
        </ol>
        <p className="muted">
          Autosaves to browser storage after every change. Fully offline once loaded.
        </p>
      </Section>
    </div>
  );
}
