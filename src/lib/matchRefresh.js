/** Detail reconciliation is separate from the fast live-score channel. */
import { isFinishedStatus } from './sportsData.js';

export const FINAL_DETAIL_WINDOW_MS = 72 * 60 * 60 * 1000;
export const FINAL_DETAIL_POLL_MS = 60 * 1000;
const PLAYED_FINALS = new Set(['finished', 'ft', 'final', 'ended', 'aet', 'pen', 'complete']);

export function matchDetailPollMs(event, now = Date.now()) {
  if (!event?.id) return 0;
  const status = String(event.status || '').toLowerCase();
  const played = PLAYED_FINALS.has(status);
  if (!played && !isFinishedStatus(status)) return 30 * 1000;
  // Cancelled/awarded/abandoned matches and other sports retain their current
  // terminal policy. A missing/contradictory date is not guessed to be "today".
  if (!played || event.sport !== 'football') return 0;
  const kickoff = Date.parse(event.start_time || '');
  const age = now - kickoff;
  return Number.isFinite(kickoff) && Number.isFinite(now) && age >= 0 && age <= FINAL_DETAIL_WINDOW_MS
    ? FINAL_DETAIL_POLL_MS
    : 0;
}
