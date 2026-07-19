import React, { useRef, useState } from 'react';
import { useMeet } from '../store/meetStore';
import { useGuide } from '../guide';
import { downloadBackup, parseBackup } from '../io/backup';
import { Hint, Section } from './common';

export function SetupScreen() {
  const { state, dispatch } = useMeet();
  const { guide, importFile, resetToBundled } = useGuide();
  const guideFileRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  return (
    <div>
      <Section title="Meet Information">
        <div className="form-grid">
          <label>
            Club name
            <input
              value={state.info.clubName}
              onChange={(e) => dispatch({ type: 'setInfo', info: { clubName: e.target.value } })}
              placeholder="e.g. Phoenix All-Breed Racing Club"
            />
          </label>
          <label>
            Meet ID
            <input
              value={state.info.meetId}
              onChange={(e) => dispatch({ type: 'setInfo', info: { meetId: e.target.value } })}
              placeholder="e.g. 2026-S54"
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={state.info.date}
              onChange={(e) => dispatch({ type: 'setInfo', info: { date: e.target.value } })}
            />
          </label>
          <label>
            Ungraded threshold (share of FTEs, rule book: 3/4)
            <select
              value={String(state.info.fteThreshold)}
              onChange={(e) =>
                dispatch({ type: 'setInfo', info: { fteThreshold: Number(e.target.value) } })
              }
            >
              <option value="0.75">3/4 (rule book 4.4)</option>
              <option value="0.6667">2/3</option>
            </select>
          </label>
        </div>
      </Section>

      <Section title="Grading Guide">
        <p>
          Loaded: <b>{guide.source}</b> — {guide.dogs.length} dogs. Upload a newer official guide
          to replace it (same spreadsheet layout).
        </p>
        <div className="btn-row">
          <button onClick={() => guideFileRef.current?.click()}>Upload Grading Guide (.xlsx)</button>
          <button className="secondary" onClick={resetToBundled}>
            Reset to bundled copy
          </button>
        </div>
        <input
          ref={guideFileRef}
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              await importFile(f);
              setMsg(`Imported ${f.name}`);
            } catch (err) {
              setMsg(String(err));
            }
            e.target.value = '';
          }}
        />
      </Section>

      <Section title="Meet Data">
        <div className="btn-row">
          <button className="secondary" onClick={() => downloadBackup(state)}>
            Export meet backup (.json)
          </button>
          <button className="secondary" onClick={() => backupRef.current?.click()}>
            Restore meet from backup
          </button>
          <button
            className="danger"
            onClick={() => {
              if (confirm('Start a NEW meet? Current meet data will be cleared (export a backup first if needed).')) {
                dispatch({ type: 'reset' });
              }
            }}
          >
            New meet (clear all)
          </button>
        </div>
        <input
          ref={backupRef}
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
        <Hint>
          Everything is saved automatically on this computer after every change — closing the
          browser or losing power will not lose the meet.
        </Hint>
      </Section>
    </div>
  );
}
