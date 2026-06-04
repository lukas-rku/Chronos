import React from 'react';
import { TimeEntry } from '../types';
import { getDailyBlocks, TimeBlock } from '../utils';
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

  const totalHeight = 600; // pixels
  const msInDay = 24 * 60 * 60 * 1000;
  
  return (
    <div className="relative w-full h-[600px] bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex flex-col sm:flex-row shadow-inner">
      {/* Time Labels (Y-axis) - Hidden on small screens or just shown once */}
      <div className="w-12 sm:w-16 border-r border-white/10 flex flex-col justify-between py-2 text-center text-[10px] sm:text-xs text-slate-500 font-mono flex-shrink-0 z-10 bg-[#0a0a0a]/50 backdrop-blur-sm">
        {[0, 4, 8, 12, 16, 20, 24].map((h, i, arr) => (
          <div key={h} className="relative" style={{ top: i === arr.length-1 ? '-8px' : i === 0 ? '8px' : '0' }}>
            {h.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>
      
      {/* Day Columns */}
      <div className="flex-1 flex relative">
        {/* Horizontal grid lines across all days */}
        {[0, 4, 8, 12, 16, 20].map(h => (
          <div key={h} className="absolute w-full border-b border-white/5 pointer-events-none" style={{ top: `${(h/24)*100}%` }} />
        ))}

        {weekDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const blocks = getDailyBlocks(entries, dateStr, now);
          const isToday = isSameDay(day, now);
          
          return (
            <div key={dateStr} className={`flex-1 relative border-r border-white/5 last:border-r-0 ${isToday ? 'bg-indigo-500/5' : ''}`}>
              <div className="absolute top-0 w-full text-center py-2 border-b border-white/10 z-10 bg-[#0a0a0a]/80 backdrop-blur-md">
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">{format(day, 'EEE')}</div>
                <div className={`text-xs sm:text-sm font-mono mt-0.5 ${isToday ? 'text-indigo-400' : 'text-slate-500'}`}>{format(day, 'd')}</div>
              </div>
              
              {/* Blocks */}
              <div className="absolute inset-0 top-[48px]">
                {blocks.map((block, i) => {
                  const d1 = new Date(block.start);
                  const startMs = (d1.getHours() * 3600 + d1.getMinutes() * 60 + d1.getSeconds()) * 1000 + d1.getMilliseconds();
                  
                  const d2 = new Date(block.end);
                  const isNextDay = d2.getDate() !== d1.getDate();
                  const endMs = isNextDay ? msInDay : (d2.getHours() * 3600 + d2.getMinutes() * 60 + d2.getSeconds()) * 1000 + d2.getMilliseconds();
                  
                  const duration = endMs - startMs;
                  const topPercent = (startMs / msInDay) * 100;
                  const heightPercent = (duration / msInDay) * 100;

                  return (
                    <div
                      key={i}
                      className={`absolute left-1 right-1 sm:left-2 sm:right-2 rounded-md border ${
                        block.type === 'work' 
                          ? 'bg-indigo-500/20 border-indigo-500/50' 
                          : 'bg-yellow-500/20 border-yellow-500/50'
                      } flex flex-col items-center justify-center overflow-hidden shadow-sm transition-all hover:bg-opacity-40 group`}
                      style={{ top: `${topPercent}%`, height: `${heightPercent}%`, minHeight: '4px' }}
                      title={`${format(d1, 'HH:mm')} - ${isNextDay ? '24:00' : format(d2, 'HH:mm')} (${block.type})`}
                    >
                      {heightPercent > 5 && (
                        <span className="hidden sm:block text-[9px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          {format(d1, 'HH:mm')}
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
