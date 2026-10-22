import { useSyncExternalStore } from 'react';
import { describeError, downloadReport } from './api';

interface ReportDownloadNotification {
  dossierId: string;
  phase: 'downloading' | 'done' | 'error';
  error?: string;
}

let notification: ReportDownloadNotification | null = null;
let dismissalTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function publishNotification(next: ReportDownloadNotification | null) {
  notification = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useReportDownloadNotification() {
  return useSyncExternalStore(
    subscribe,
    () => notification,
    () => null,
  );
}

function settleNotification(
  pending: ReportDownloadNotification,
  settled: ReportDownloadNotification,
) {
  // An older request must not replace or dismiss a newer download's feedback.

  if (notification !== pending) return;
  publishNotification(settled);
  dismissalTimer = setTimeout(
    () => {
      if (notification === settled) publishNotification(null);
    },
    settled.phase === 'error' ? 6000 : 3500,
  );
}

export async function downloadReportWithNotification(dossierId: string, reportUrl: string) {
  clearTimeout(dismissalTimer);
  const pending: ReportDownloadNotification = { dossierId, phase: 'downloading' };
  publishNotification(pending);
  try {
    await downloadReport(dossierId, reportUrl);
    settleNotification(pending, { dossierId, phase: 'done' });
  } catch (failure) {
    settleNotification(pending, { dossierId, phase: 'error', error: describeError(failure) });
    throw failure;
  }
}
