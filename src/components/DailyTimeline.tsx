import React from 'react';
import { TimeBlock } from '../utils';
import { format } from 'date-fns';

interface DailyTimelineProps {
  blocks: TimeBlock[];
}

export function DailyTimeline({ blocks }: DailyTimelineProps) {
  // A vertical timeline representing 24 hours
  // We can represent it as 24 slots, or just absolute positioning
  
  const totalHeight = 600; // pixels
  const msInDay = 24 * 60 * 60 * 1000;
  
  return (
    <div className="relative w-full h-[600px] bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex">
      <div className="w-16 border-r border-white/10 flex flex-col justify-between py-2 text-center text-xs text-slate-500 font-mono">
        {[0, 4, 8, 12, 16, 20, 24].map((h, i, arr) => (
          <div key={h} className="relative" style={{ top: i === arr.length-1 ? '-8px' : i === 0 ? '8px' : '0' }}>
            {h.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>
      <div className="flex-1 relative">
        {/* Horizontal grid lines */}
        {[0, 4, 8, 12, 16, 20].map(h => (
          <div key={h} className="absolute w-full border-b border-white/5" style={{ top: `${(h/24)*100}%` }} />
        ))}

        {blocks.map((block, i) => {
          // get start time in ms since start of day
          const d1 = new Date(block.start);
          const startMs = (d1.getHours() * 3600 + d1.getMinutes() * 60 + d1.getSeconds()) * 1000 + d1.getMilliseconds();
          
          const d2 = new Date(block.end);
          // if end is on next day, cap at midnight
          const isNextDay = d2.getDate() !== d1.getDate();
          const endMs = isNextDay ? msInDay : (d2.getHours() * 3600 + d2.getMinutes() * 60 + d2.getSeconds()) * 1000 + d2.getMilliseconds();
          
          const duration = endMs - startMs;
          
          const topPercent = (startMs / msInDay) * 100;
          const heightPercent = (duration / msInDay) * 100;

          return (
            <div
              key={i}
              className={`absolute left-4 right-4 rounded-md border ${
                block.type === 'work' 
                  ? 'bg-indigo-500/20 border-indigo-500/50' 
                  : 'bg-yellow-500/20 border-yellow-500/50'
              } flex flex-col justify-center px-4 overflow-hidden shadow-sm`}
              style={{ top: `${topPercent}%`, height: `${heightPercent}%`, minHeight: '4px' }}
            >
              {(heightPercent > 4) && (
                <div className="flex justify-between items-center w-full">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    block.type === 'work' ? 'text-indigo-300' : 'text-yellow-300'
                  }`}>
                    {block.type}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {format(d1, 'HH:mm')} - {isNextDay ? '24:00' : format(d2, 'HH:mm')}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {blocks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
            No activity tracked today
          </div>
        )}
      </div>
    </div>
  );
}
