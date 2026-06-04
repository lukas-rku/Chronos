import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TimeEntry, DaySummary } from './types';
import { parseISO, differenceInMilliseconds, startOfDay, format, endOfDay } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseSafeDate(timestamp: string): Date {
  if (!timestamp) return new Date();
  const safeStr = timestamp.replace(' ', 'T');
  const finalStr = safeStr.endsWith('Z') ? safeStr : safeStr + 'Z';
  const d = new Date(finalStr);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

export interface TimeBlock {
  type: 'work' | 'break';
  start: Date;
  end: Date;
}

export function getDailyBlocks(entries: TimeEntry[], dateStr: string, now: Date): TimeBlock[] {
  // Sort oldest to newest
  const sorted = [...entries].sort((a, b) => parseSafeDate(a.timestamp).getTime() - parseSafeDate(b.timestamp).getTime());
  
  // Filter entries for this day
  const dayEntries = sorted.filter(e => format(parseSafeDate(e.timestamp), 'yyyy-MM-dd') === dateStr);
  
  const blocks: TimeBlock[] = [];
  let lastIn: Date | null = null;
  let lastBreak: Date | null = null;

  dayEntries.forEach(entry => {
    const time = parseSafeDate(entry.timestamp);
    
    switch (entry.type) {
      case 'in':
        if (!lastIn && !lastBreak) lastIn = time;
        break;
      case 'out':
        if (lastIn) {
          blocks.push({ type: 'work', start: lastIn, end: time });
          lastIn = null;
        }
        break;
      case 'break_start':
        if (lastIn && !lastBreak) {
          blocks.push({ type: 'work', start: lastIn, end: time });
          lastIn = null;
          lastBreak = time;
        }
        break;
      case 'break_end':
        if (lastBreak) {
          blocks.push({ type: 'break', start: lastBreak, end: time });
          lastBreak = null;
          lastIn = time;
        }
        break;
    }
  });

  // Handle ongoing tasks
  if (lastIn) {
    blocks.push({ type: 'work', start: lastIn, end: now });
  } else if (lastBreak) {
    blocks.push({ type: 'break', start: lastBreak, end: now });
  }

  return blocks;
}

export function calculateDailySummaries(entries: TimeEntry[], now: Date = new Date()): DaySummary[] {
  const summaries: Record<string, DaySummary> = {};
  
  // Sort entries oldest to newest
  const sorted = [...entries].sort((a, b) => parseSafeDate(a.timestamp).getTime() - parseSafeDate(b.timestamp).getTime());
  
  sorted.forEach(entry => {
    const finalDate = parseSafeDate(entry.timestamp);
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
      const time = parseSafeDate(entry.timestamp);
      
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

  return Object.values(summaries).sort((a, b) => parseSafeDate(b.date).getTime() - parseSafeDate(a.date).getTime());
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
