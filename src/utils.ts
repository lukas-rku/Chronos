import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TimeEntry, DaySummary } from './types';
import { parseISO, differenceInMilliseconds, startOfDay, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDailySummaries(entries: TimeEntry[]): DaySummary[] {
  const summaries: Record<string, DaySummary> = {};
  
  // Sort entries oldest to newest
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  sorted.forEach(entry => {
    const day = format(parseISO(entry.timestamp.replace(' ', 'T')), 'yyyy-MM-dd');
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
      const time = new Date(entry.timestamp.replace(' ', 'T')); // Handle SQLite default CURRENT_TIMESTAMP format
      
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
      summary.totalWorkedMs += differenceInMilliseconds(new Date(), lastIn);
    }
    if (lastBreak) {
      summary.totalBreakMs += differenceInMilliseconds(new Date(), lastBreak);
    }
  });

  return Object.values(summaries).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function formatHourlyPay(ms: number, hourlyRate: number = 25): string {
  const hours = ms / (1000 * 60 * 60);
  return `$${(hours * hourlyRate).toFixed(2)}`;
}
