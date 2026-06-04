import React, { useMemo } from 'react';
import { TimeEntry } from '../types';
import { getDailyBlocks } from '../utils';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

interface WeeklyTimelineProps {
  entries: TimeEntry[];
  baseDate: Date;
  now: Date;
}

export function WeeklyTimeline({ entries, baseDate, now }: WeeklyTimelineProps) {
  // Get Monday of the baseDate week
  const monday = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(monday, i));

  // Determine min and max hours for the current view
  const { minHour, maxHour } = useMemo(() => {
    let minT = 24;
    let maxT = 0;
    let hasData = false;
    
    weekDays.forEach(day => {
      const blocks = getDailyBlocks(entries, format(day, 'yyyy-MM-dd'), now);
      blocks.forEach(b => {
        hasData = true;
        const sh = b.start.getHours() + b.start.getMinutes() / 60;
        const eh = b.end.getHours() + b.end.getMinutes() / 60;
        if (sh < minT) minT = sh;
        if (eh > maxT) maxT = eh;
      });
    });

    if (!hasData) return { minHour: 8, maxHour: 18 };
    return {
      minHour: Math.max(0, Math.floor(minT) - 1),
      maxHour: Math.min(24, Math.ceil(maxT) + 1)
    };
  }, [entries, baseDate, now]);

  const viewHours = maxHour - minHour;
  const startMsView = minHour * 3600 * 1000;
  const msInView = viewHours * 3600 * 1000;

  const yLabels = [];
  for (let h = minHour; h <= maxHour; h++) {
    yLabels.push(h);
  }
  
  return (
    <div className="relative w-full h-[600px] bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex flex-row shadow-inner">
      <div className="w-12 sm:w-16 border-r border-white/10 flex flex-shrink-0 z-10 bg-[#0a0a0a]/50 backdrop-blur-sm relative">
        <div className="absolute inset-x-0 bottom-0 top-[48px]">
          {yLabels.map(h => (
            <div key={h} className="absolute w-full text-center text-[10px] sm:text-xs text-slate-500 font-mono -translate-y-1/2" style={{ top: `${((h - minHour)/viewHours)*100}%` }}>
              {h.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>
      
      {/* Day Columns */}
      <div className="flex-1 flex relative">
        {/* Horizontal grid lines */}
        <div className="absolute inset-x-0 bottom-0 top-[48px] pointer-events-none z-0">
          {yLabels.map(h => {
            if (h === maxHour) return null;
            return (
              <div key={h} className="absolute w-full border-b border-white/5" style={{ top: `${((h - minHour)/viewHours)*100}%` }} />
            );
          })}
        </div>

        {weekDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const blocks = getDailyBlocks(entries, dateStr, now);
          const isToday = isSameDay(day, now);
          
          return (
            <div key={dateStr} className={`flex-1 relative border-r border-white/5 last:border-r-0 ${isToday ? 'bg-indigo-500/5' : ''}`}>
              <div className="absolute top-0 w-full text-center py-2 border-b border-white/10 z-20 bg-[#0a0a0a]/90 backdrop-blur-md">
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">{format(day, 'EEE')}</div>
                <div className={`text-xs sm:text-sm font-mono mt-0.5 ${isToday ? 'text-indigo-400' : 'text-slate-500'}`}>{format(day, 'd')}</div>
              </div>
              
              {/* Blocks */}
              <div className="absolute inset-x-0 bottom-0 top-[48px]">
                {blocks.map((block, i) => {
                  const s = block.start.getHours() * 3600000 + block.start.getMinutes() * 60000 + block.start.getSeconds() * 1000;
                  const e = block.end.getDate() !== block.start.getDate() 
                    ? 24 * 3600000 
                    : block.end.getHours() * 3600000 + block.end.getMinutes() * 60000 + block.end.getSeconds() * 1000;
                  
                  const startOffsetMs = Math.max(0, s - startMsView);
                  const endOffsetMs = Math.min(msInView, e - startMsView);
                  const durationMs = endOffsetMs - startOffsetMs;
                  
                  if (durationMs <= 0 || s >= startMsView + msInView || e <= startMsView) return null; // out of view

                  const topPercent = (startOffsetMs / msInView) * 100;
                  const heightPercent = (durationMs / msInView) * 100;

                  return (
                    <div
                      key={i}
                      className={`absolute z-10 left-1 right-1 sm:left-2 sm:right-2 rounded-md border ${
                        block.type === 'work' 
                          ? 'bg-indigo-500/20 border-indigo-500/50' 
                          : 'bg-yellow-500/20 border-yellow-500/50'
                      } flex flex-col items-center justify-center overflow-hidden shadow-sm transition-all hover:bg-opacity-40 group`}
                      style={{ top: `${topPercent}%`, height: `${heightPercent}%`, minHeight: '4px' }}
                      title={`${format(block.start, 'HH:mm')} - ${block.type}`}
                    >
                      {heightPercent > 5 && (
                        <span className="hidden sm:block text-[9px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          {format(block.start, 'HH:mm')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
