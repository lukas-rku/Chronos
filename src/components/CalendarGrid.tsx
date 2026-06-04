import React from 'react';
import { DaySummary } from '../types';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear, getDaysInMonth } from 'date-fns';

interface CalendarGridProps {
  summaries: DaySummary[];
  view: 'monthly' | 'yearly';
  now: Date;
  onDaySelect?: (date: Date) => void;
}

export function CalendarGrid({ summaries, view, now, onDaySelect }: CalendarGridProps) {
  const summaryMap = new Map<string, DaySummary>();
  summaries.forEach(s => summaryMap.set(s.date, s));

  if (view === 'monthly') {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const days = eachDayOfInterval({ start, end });

    // offset for first day of week (0 = Sunday)
    const firstDay = start.getDay();
    const blanks = Array.from({ length: firstDay });

    return (
      <div className="flex flex-col h-full space-y-4">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-slate-500 uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 flex-1">
          {blanks.map((_, i) => <div key={`blank-${i}`} className="opacity-0" />)}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const summary = summaryMap.get(dateStr);
            const hours = summary ? summary.totalWorkedMs / (1000 * 3600) : 0;
            const intensity = Math.min(hours / 8, 1);

            return (
              <div 
                key={dateStr}
                onClick={() => onDaySelect?.(day)}
                className="relative cursor-pointer rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden group flex flex-col justify-end p-2 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/10"
              >
                {hours > 0 && (
                  <div 
                    className="absolute inset-0 bg-indigo-500/20"
                    style={{ opacity: 0.2 + intensity * 0.8 }}
                  />
                )}
                <span className="relative z-10 text-xs font-mono text-slate-400 group-hover:text-white">
                  {format(day, 'd')}
                </span>
                {hours > 0 && (
                  <span className="relative z-10 text-[10px] font-bold text-indigo-300 mt-1">
                    {hours.toFixed(1)}h
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Yearly heatmap
  const months = eachMonthOfInterval({ start: startOfYear(now), end: endOfYear(now) });
  
  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pr-2 custom-scrollbar">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map(month => {
          const daysInMonth = getDaysInMonth(month);
          const start = startOfMonth(month);
          const monthDays = Array.from({ length: daysInMonth }).map((_, i) => new Date(start.getFullYear(), start.getMonth(), i + 1));
          
          let totalHoursMonth = 0;
          const heatMapCells = monthDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const summary = summaryMap.get(dateStr);
            const hours = summary ? summary.totalWorkedMs / (1000 * 3600) : 0;
            totalHoursMonth += hours;
            const intensity = Math.min(hours / 8, 1);
            
            return (
              <div 
                key={dateStr}
                onClick={() => onDaySelect?.(day)}
                title={`${dateStr}: ${hours.toFixed(1)}h`}
                className="w-2 h-2 rounded-[2px] cursor-pointer hover:scale-150 hover:z-10 transition-transform"
                style={{ 
                  backgroundColor: hours > 0 ? `rgba(99, 102, 241, ${0.2 + intensity * 0.8})` : 'rgba(255,255,255,0.05)'
                }}
              />
            );
          });

          return (
            <div key={month.toISOString()} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 transition-colors hover:border-indigo-500/20">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-300">{format(month, 'MMM')}</span>
                <span className="text-[10px] font-mono text-indigo-400">{totalHoursMonth > 0 ? `${totalHoursMonth.toFixed(1)}h` : ''}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {heatMapCells}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
