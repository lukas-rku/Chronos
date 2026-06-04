import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TimeEntry, DaySummary } from './types';
import { parseISO, differenceInMilliseconds, startOfDay, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDailySummaries(entries: TimeEntry[], now: Date = new Date()): DaySummary[] {
  const summaries: Record<string, DaySummary> = {};
  
  // Sort entries oldest to newest
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  sorted.forEach(entry => {
    // If it's old format YYYY-MM-DD HH:mm:ss it will need 'Z' or parsing, but robustly parseISO handles it.
    // However string manipulation is fragile.
    let dateObj = entry.timestamp.includes('Z') ? new Date(entry.timestamp) : new Date(entry.timestamp + 'Z');
    if (entry.timestamp.includes('T') && !entry.timestamp.includes('Z')) {
      dateObj = new Date(entry.timestamp); // keep local if it has T but no Z? Just standard new Date
    }
    const safeStr = entry.timestamp.replace(' ', 'T');
    const finalDate = safeStr.endsWith('Z') ? new Date(safeStr) : new Date(safeStr + 'Z');
    
    const day = format(finalDate, 'yyyy-MM-dd');
    if (!summaries[day]) {
      summaries[day] = { date: day, totalWorkedMs: 0, totalBreakMs: 0, entries: [] };
    }
    summaries[day].entries.push(entry);
  });

  // Calculate durations
  Object.values(summaries).forEach(summary => {
    let lastIn: Date | null = null;
    let lastBreak: Date | null = null;

    summary.entries.forEach(entry => {
      // Make sure we parse as UTC if it's the old format without Z
      const safeStr = entry.timestamp.replace(' ', 'T');
      const time = safeStr.endsWith('Z') ? new Date(safeStr) : new Date(safeStr + 'Z');
      
      switch (entry.type) {
        case 'in':
          if (!lastIn) lastIn = time;
          break;
        case 'out':
          if (lastIn) {
            summary.totalWorkedMs += differenceInMilliseconds(time, lastIn);
            lastIn = null;
          }
          break;
        case 'break_start':
          if (lastIn && !lastBreak) { // Pause work timer effectively
            summary.totalWorkedMs += differenceInMilliseconds(time, lastIn);
            lastIn = null;
            lastBreak = time;
          }
          break;
        case 'break_end':
          if (lastBreak) {
            summary.totalBreakMs += differenceInMilliseconds(time, lastBreak);
            lastBreak = null;
            lastIn = time; // Resume work
          }
          break;
      }
    });

    // Handle ongoing IN status
    if (lastIn) {
      summary.totalWorkedMs += differenceInMilliseconds(now, lastIn);
    }
    if (lastBreak) {
      summary.totalBreakMs += differenceInMilliseconds(now, lastBreak);
    }
  });

  return Object.values(summaries).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');
  
  if (hours > 0) return `${h}:${m}:${s}`;
  return `${m}:${s}`;
}

export function formatHourlyPay(ms: number, hourlyRate: number = 25, currency: string = '$'): string {
  const hours = Math.max(0, ms) / (1000 * 60 * 60);
  return `${currency}${(hours * hourlyRate).toFixed(4)}`;
}
