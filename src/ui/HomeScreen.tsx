import React, { useRef, useState } from 'react';
import { useMeet } from '../store/meetStore';
import { downloadBackup, parseBackup } from '../io/backup';
import { Hint, Section } from './common';
import sampleMeet from '../data/sample-meet.json';
import type { MeetState, Phase } from '../domain/types';

/** True once the secretary has entered anything worth protecting. */
function hasWork(state: MeetState): boolean {
  return state.entries.length > 0 || !!state.info.clubName || !!state.info.meetId;
}

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
            Save Meet to File
          </button>
          <button className="secondary" onClick={() => restoreRef.current?.click()}>
            Open Meet from File
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
        <p className="muted small">
          Saves or opens a .json file holding the whole meet — use it to move a meet between
          laptops, or as a spare copy alongside the automatic browser save.
        </p>
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
              setMsg(`Opened ${f.name}`);
            } catch (err) {
              setMsg(String(err));
            }
            e.target.value = '';
          }}
        />
        {msg && <Hint>{msg}</Hint>}
      </Section>

      <Section title="Try it out">
        <p>
          Loads a complete finished meet — 4 divisions, 19 dogs, all three programs run, including
          a scratch, a DQ, off-course and did-not-finish results — so you can explore the draws,
          rotations, results and export without entering anything.
        </p>
        <div className="btn-row">
          <button
            className="secondary"
            onClick={() => {
              if (
                hasWork(state) &&
                !confirm(
                  'Load the sample meet? This replaces the meet currently loaded — back it up first if you need it.'
                )
              ) {
                return;
              }
              dispatch({ type: 'importState', state: sampleMeet as unknown as MeetState });
              setMsg('Loaded sample meet — use Reset when you want to start your own.');
            }}
          >
            Load sample meet
          </button>
        </div>
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

      <Section title="Official AOK9 links">
        <ul className="links">
          <li>
            <a href="https://www.aok9racing.com/" target="_blank" rel="noopener noreferrer">
              AOK9 Racing Program
            </a>{' '}
            — the official program website.
          </li>
          <li>
            <a
              href="https://www.aok9racing.com/documents--forms.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              Documents &amp; Forms
            </a>{' '}
            — current rule book, entry forms and the official Grading Guide.
          </li>
        </ul>
        <p className="muted small">
          Open in a new tab and need an internet connection — the meet you have loaded is not
          affected.
        </p>
      </Section>
    </div>
  );
}
