import React from 'react';
import { MeetProvider, useMeet } from './store/meetStore';
import { GuideProvider } from './guide';
import { SetupScreen } from './ui/SetupScreen';
import { EntriesScreen } from './ui/EntriesScreen';
import { DivisionsScreen } from './ui/DivisionsScreen';
import { ProgramScreen } from './ui/ProgramScreen';
import { ResultsScreen } from './ui/ResultsScreen';
import type { Phase } from './domain/types';

const STEPS: { phase: Phase; label: string }[] = [
  { phase: 'setup', label: '1 · Setup' },
  { phase: 'entries', label: '2 · Entries' },
  { phase: 'divisions', label: '3 · Divisions' },
  { phase: 'program1', label: '4 · Program 1' },
  { phase: 'program2', label: '5 · Program 2' },
  { phase: 'program3', label: '6 · Program 3' },
  { phase: 'results', label: '7 · Results' },
];

function Shell() {
  const { state, dispatch } = useMeet();
  const phase = state.phase;
  return (
    <div className="app">
      <header className="app-header app-ui">
        <div className="brand">
          <span className="logo">🐾</span>
          <div>
            <b>AOK9 Race Secretary</b>
            <small>
              R.A.C.E. Sprint Racing · Rules 3.0
              {state.info.meetId && ` · ${state.info.meetId}`}
              {state.info.clubName && ` · ${state.info.clubName}`}
            </small>
          </div>
        </div>
        <nav className="steps">
          {STEPS.map((s) => (
            <button
              key={s.phase}
              className={`step ${phase === s.phase ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'setPhase', phase: s.phase })}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {phase === 'setup' && <SetupScreen />}
        {phase === 'entries' && <EntriesScreen />}
        {phase === 'divisions' && <DivisionsScreen />}
        {phase === 'program1' && <ProgramScreen program={1} />}
        {phase === 'program2' && <ProgramScreen program={2} />}
        {phase === 'program3' && <ProgramScreen program={3} />}
        {phase === 'results' && <ResultsScreen />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <GuideProvider>
      <MeetProvider>
        <Shell />
      </MeetProvider>
    </GuideProvider>
  );
}
