// Meet JSON backup export / restore.

import type { MeetState } from '../domain/types';

export function downloadBackup(state: MeetState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aok9-meet-backup-${state.info.meetId || state.info.date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBackup(text: string): MeetState {
  const parsed = JSON.parse(text) as MeetState;
  if (!parsed || !parsed.info || !Array.isArray(parsed.entries)) {
    throw new Error('Not a valid AOK9 meet backup file');
  }
  return parsed;
}
