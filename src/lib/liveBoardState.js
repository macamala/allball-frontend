import { mergeEventPayload } from "./sportsData.js";

export function rawPayloadRows(data) {
  return Array.isArray(data?.events) ? data.events : data?.matches || [];
}

export function stabilizeDayPayload(previousPayload, incomingPayload) {
  if (!incomingPayload) return { payload: previousPayload, protectedShrink: Boolean(previousPayload) };
  if (!previousPayload) return { payload: incomingPayload, protectedShrink: false };
  const incomingRows = rawPayloadRows(incomingPayload);
  const snapshot = incomingPayload.snapshot;
  // A completed date-bounded canonical list is authoritative, including
  // retirements. Network failures and legacy/partial replies retain protection.
  const complete = incomingPayload.connected === true && snapshot?.complete === true &&
    snapshot.count === incomingRows.length && snapshot.date_from && snapshot.date_to;
  const previousCount = rawPayloadRows(previousPayload).length;
  const suspiciousShrink = previousCount >= 20 && incomingRows.length < Math.floor(previousCount * 0.75);
  if (complete || !suspiciousShrink) return { payload: incomingPayload, protectedShrink: false };
  const merged = mergeEventPayload(previousPayload, incomingRows);
  return { payload: { ...previousPayload, ...incomingPayload, events: merged.events }, protectedShrink: true };
}
