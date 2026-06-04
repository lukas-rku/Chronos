import React, { useState, useEffect } from 'react';
import { User, TimeEntry } from '../types';
import { calculateDailySummaries, formatDuration, formatHourlyPay, cn } from '../utils';
import { Clock, Play, Square, Coffee, LogOut, Code, Calendar, DollarSign, Activity, History, Home, Settings, Smartphone, Download, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export function Dashboard({ user, onLogout }: { user: User, onLogout: () => void }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [hourlyRate, setHourlyRate] = useState(() => Number(localStorage.getItem('hourlyRate') || '25'));
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || '$');
  
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  const [now, setNow] = useState(new Date());

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualType, setManualType] = useState('in');
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');

  useEffect(() => {
    fetchEntries();
    
    // Tick clock every second
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchEntries = async () => {
    const res = await fetch('/api/entries');
    if (res.ok) {
      setEntries(await res.json());
    }
    setLoading(false);
  };

  const saveSettings = () => {
    localStorage.setItem('hourlyRate', hourlyRate.toString());
    localStorage.setItem('currency', currency);
    alert('Settings saved!');
  };

  const handleAction = async (type: 'in' | 'out' | 'break_start' | 'break_end') => {
    setLoading(true);
    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    fetchEntries();
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDate || !manualTime) return;
    
    // SQLite format: YYYY-MM-DD HH:mm:ss
    const timestamp = `${manualDate} ${manualTime}:00`;
    
    setLoading(true);
    await fetch('/api/manual_entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: manualType, timestamp })
    });
    
    setShowManualModal(false);
    fetchEntries();
  };

  const handleExportCSV = () => {
    const rows = [
      ['Timestamp', 'Action Type'],
      ...entries.map(e => [e.timestamp, e.type])
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "timesheet.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const summaries = calculateDailySummaries(entries, now);
  const today = summaries[0]?.date === format(now, 'yyyy-MM-dd') ? summaries[0] : null;
  const currentStatus = entries[0]?.type; 
  
  const isClockedIn = currentStatus === 'in' || currentStatus === 'break_end';
  const isOnBreak = currentStatus === 'break_start';

  const chartData = summaries.slice(0, 7).reverse().map(s => ({
    name: format(parseISO(s.date), 'EEE'),
    hours: s.totalWorkedMs / (1000 * 60 * 60)
  }));

  const totalWeekMs = summaries.slice(0, 7).reduce((acc, curr) => acc + curr.totalWorkedMs, 0);

  return (
    <div className="w-full h-full bg-[#050505] text-slate-200 font-sans flex overflow-hidden">
      {/* Sidebar Rail */}
      <aside className="w-20 bg-[#0a0a0a] border-r border-white/5 flex flex-col items-center py-8 gap-10 shrink-0 hidden sm:flex">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Clock className="w-7 h-7 text-white" />
        </div>
        <nav className="flex flex-col gap-8">
          <button onClick={() => setActiveTab('overview')} className={cn("transition-colors", activeTab === 'overview' ? "text-indigo-400" : "text-slate-500 hover:text-white")}>
            <Home className="w-6 h-6" />
          </button>
          <button onClick={() => setActiveTab('settings')} className={cn("transition-colors", activeTab === 'settings' ? "text-indigo-400" : "text-slate-500 hover:text-white")}>
            <Settings className="w-6 h-6" />
          </button>
        </nav>
        <div className="mt-auto mb-2 flex flex-col gap-6 items-center">
          <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition-colors">
            <LogOut className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/50 p-0.5">
            <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white uppercase">
              {user.name.substring(0, 2)}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 gap-8 overflow-y-auto custom-scrollbar relative">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 shrink-0 mt-4 sm:mt-0">
          <div className="flex justify-between items-center w-full sm:w-auto">
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white">Chronos <span className="font-bold text-indigo-400">Dash</span></h1>
              <p className="text-slate-500 text-sm mt-1">Authenticated user <span className="text-indigo-300">{user.email}</span></p>
            </div>
            
            {/* Mobile Nav */}
            <div className="flex sm:hidden gap-4">
              <button onClick={() => setActiveTab('overview')} className={cn("transition-colors", activeTab === 'overview' ? "text-indigo-400" : "text-slate-500")}>
                <Home className="w-6 h-6" />
              </button>
              <button onClick={() => setActiveTab('settings')} className={cn("transition-colors", activeTab === 'settings' ? "text-indigo-400" : "text-slate-500")}>
                <Settings className="w-6 h-6" />
              </button>
              <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition-colors">
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-xl self-start sm:self-auto">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-slate-300">System Online</span>
          </div>
        </header>

        {/* Main Grid */}
        <div className="flex-1 flex flex-col">
          {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
              {/* Control Panel */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-white/5 rounded-3xl border border-white/10 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-300 hover:border-indigo-500/30">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"></div>
                  
                  <p className="text-xs uppercase tracking-[0.2em] text-indigo-400 mb-2">Current Pulse</p>
                  <div className="text-5xl font-mono font-bold text-white mb-1 transition-all duration-200">
                    {today ? formatDuration(today.totalWorkedMs) : '0h 0m 0s'}
                  </div>
                  {today && today.totalBreakMs > 0 ? (
                    <p className="text-slate-400 text-sm mt-2 font-mono">Break: {formatDuration(today.totalBreakMs)}</p>
                  ) : (
                    <p className="text-slate-400 text-sm mt-2">Ready to work</p>
                  )}

                  <div className="grid grid-cols-1 w-full gap-3 mt-8">
                    {!isClockedIn && !isOnBreak ? (
                      <button 
                        onClick={() => handleAction('in')} 
                        disabled={loading}
                        className="w-full py-4 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-2xl font-semibold hover:bg-indigo-500/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Play className="w-5 h-5" /> Clock In
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleAction('out')} 
                        disabled={loading}
                        className="w-full py-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl font-semibold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Square className="w-5 h-5 fill-current" /> Clock Out
                      </button>
                    )}

                    {(isClockedIn || isOnBreak) && (
                      <button 
                        onClick={() => handleAction(isOnBreak ? 'break_end' : 'break_start')} 
                        disabled={loading}
                        className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        <Coffee className="w-5 h-5" />
                        {isOnBreak ? 'End Break' : 'Take a Break'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-3xl border border-white/10 p-8">
                  <h3 className="text-slate-300 text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> Earnings Estimator
                  </h3>
                  <div className="flex justify-between items-baseline mb-2 transition-all duration-300 cursor-default">
                    <span className="text-4xl font-bold text-white font-mono">{formatHourlyPay(totalWeekMs, hourlyRate, currency)}</span>
                    <span className="text-emerald-400 text-xs font-bold font-mono">THIS WEEK</span>
                  </div>
                  <div className="mt-4 text-sm text-slate-400">
                    Today: <span className="text-white font-mono">{formatHourlyPay(today?.totalWorkedMs || 0, hourlyRate, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Dashboard */}
              <div className="lg:col-span-8 flex flex-col gap-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <p className="text-slate-500 text-xs uppercase mb-1">Weekly Hours</p>
                    <p className="text-2xl font-bold text-white font-mono">{formatDuration(totalWeekMs)}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <p className="text-slate-500 text-xs uppercase mb-1">Today's Total</p>
                    <p className="text-2xl font-bold text-white font-mono">{today ? formatDuration(today.totalWorkedMs) : '0h 0m 0s'}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <p className="text-slate-500 text-xs uppercase mb-1">Current State</p>
                    <p className={cn("text-2xl font-bold flex items-center gap-2", isClockedIn ? "text-green-400" : (isOnBreak ? "text-yellow-400" : "text-slate-400"))}>
                      <span className={cn("inline-block w-2 h-2 rounded-full", isClockedIn ? "bg-green-400 animate-pulse" : (isOnBreak ? "bg-yellow-400" : "bg-slate-400"))}></span>
                      {isClockedIn ? 'Working' : (isOnBreak ? 'On Break' : 'Offline')}
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex-1 flex flex-col min-h-[300px]">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-400" />
                      Weekly Activity
                    </h3>
                  </div>
                  
                  <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}h`} />
                        <Tooltip 
                          cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                          contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }}
                          itemStyle={{ color: '#818cf8' }}
                          formatter={(val: number) => [val.toFixed(2) + 'h', 'Worked']}
                        />
                        <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.hours > 0 ? '#6366f1' : '#1e293b'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-h-[300px] flex flex-col">
                  <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-purple-400" />
                      Recent Actions
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={handleExportCSV} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowManualModal(true)} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar flex-1">
                    {entries.slice(0, 15).map((entry, i) => {
                       // Find the next chronologically (older entry, i.e. i+1 since we're sorted desc)
                       const nextEntry = entries[i+1];
                       let progressText = '';
                       if (entry.type === 'out' && nextEntry && nextEntry.type === 'in') {
                         const entryDate = entry.timestamp.endsWith('Z') ? new Date(entry.timestamp) : new Date(entry.timestamp.replace(' ', 'T') + 'Z');
                         const nextEntryDate = nextEntry.timestamp.endsWith('Z') ? new Date(nextEntry.timestamp) : new Date(nextEntry.timestamp.replace(' ', 'T') + 'Z');
                         const diff = entryDate.getTime() - nextEntryDate.getTime();
                         progressText = `[Worked ${formatDuration(diff)}]`;
                       }

                       const displayDate = entry.timestamp.endsWith('Z') ? new Date(entry.timestamp) : new Date(entry.timestamp.replace(' ', 'T') + 'Z');
                       return (
                      <div key={entry.id} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-2 h-2 rounded-full", {
                            'bg-green-400': entry.type === 'in',
                            'bg-red-400': entry.type === 'out',
                            'bg-yellow-400': entry.type === 'break_start',
                            'bg-blue-400': entry.type === 'break_end'
                          })} />
                          <span className="font-medium text-sm text-slate-300 capitalize">{entry.type.replace('_', ' ')}</span>
                          <span className="text-xs text-slate-500 ml-2">{progressText}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-500">
                          {format(displayDate, 'MMM d, h:mm:ss a')}
                        </span>
                      </div>
                    )})}
                    {entries.length === 0 && (
                      <p className="text-center text-slate-500 py-4">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-3xl border border-white/10 p-8 max-w-3xl space-y-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"></div>
              <div className="space-y-2 border-b border-white/10 pb-6">
                <h2 className="text-2xl font-light tracking-tight text-white">Integration <span className="font-bold text-indigo-400">Settings</span></h2>
                <p className="text-slate-400">Configure your Apple Shortcuts integration and preferences.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-300 uppercase tracking-wider">Hourly Rate</label>
                  <input 
                    type="number" 
                    value={hourlyRate}
                    onChange={e => setHourlyRate(Number(e.target.value))}
                    className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-indigo-500 focus:bg-white/5 font-mono transition-colors"
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-300 uppercase tracking-wider">Currency Symbol</label>
                  <input 
                    type="text" 
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-indigo-500 focus:bg-white/5 font-mono transition-colors"
                  />
                </div>
              </div>
              <button 
                onClick={saveSettings}
                className="px-6 py-3 bg-indigo-600 rounded-xl font-medium hover:bg-indigo-500 transition-colors"
              >
                Save Preferences
              </button>

              <div className="space-y-6 bg-[#0a0a0a] p-8 rounded-3xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Smartphone className="text-indigo-400 w-5 h-5" />
                  <h3 className="font-medium text-lg text-white">API Integration</h3>
                </div>
                <p className="text-sm text-slate-400">Use this token to automate clocking via iOS Shortcuts or other scripts.</p>
                
                <div className="relative flex items-center gap-4">
                  <code className="flex-1 bg-black border border-white/5 rounded-2xl px-4 py-4 text-indigo-300 font-mono text-sm overflow-x-auto break-all shadow-inner">
                    {user.api_key}
                  </code>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5">
                  <h4 className="text-xs uppercase tracking-widest text-slate-500 font-medium font-sans">iOS Shortcut Setup</h4>
                  <ol className="text-sm text-slate-400 space-y-3 list-none">
                    <li className="flex gap-3"><span className="text-indigo-500/50 font-bold">1</span> Create a Shortcut with action "Get contents of URL"</li>
                    <li className="flex gap-3"><span className="text-indigo-500/50 font-bold">2</span> Set URL to <code className="bg-white/5 px-2 py-0.5 rounded text-indigo-300">{window.location.origin}/api/v1/action</code></li>
                    <li className="flex gap-3"><span className="text-indigo-500/50 font-bold">3</span> Method: <code className="bg-white/5 px-2 py-0.5 rounded text-emerald-300">POST</code></li>
                    <li className="flex gap-3"><span className="text-indigo-500/50 font-bold">4</span> Headers: Add <code className="bg-white/5 px-2 py-0.5 rounded text-white">x-api-key</code> : <span className="text-emerald-300">your token</span></li>
                    <li className="flex gap-3"><span className="text-indigo-500/50 font-bold">5</span> Request Body (JSON): 
                      <code className="bg-black p-2 rounded border border-white/5 font-mono text-xs">{"{"} "type": "in" {"}"}</code>
                    </li>
                    <li className="flex gap-3 text-xs"><span className="text-indigo-500/50">Allowed actions:</span> <span className="text-slate-300 bg-white/5 px-2 rounded">in, out, break_start, break_end</span></li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal for Manual Entry */}
        {showManualModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-3xl w-full max-w-sm space-y-6">
              <h3 className="text-xl font-medium text-white">Add Manual Entry</h3>
              <form onSubmit={handleManualAdd} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase text-slate-400 tracking-wider mb-2">Type</label>
                  <select 
                    value={manualType} 
                    onChange={e => setManualType(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="in">Clock In</option>
                    <option value="out">Clock Out</option>
                    <option value="break_start">Start Break</option>
                    <option value="break_end">End Break</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-slate-400 tracking-wider mb-2">Date</label>
                  <input 
                    type="date" 
                    required
                    value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-slate-400 tracking-wider mb-2">Time</label>
                  <input 
                    type="time" 
                    required
                    value={manualTime}
                    onChange={e => setManualTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowManualModal(false)} className="flex-1 py-3 px-4 rounded-xl text-slate-400 hover:bg-white/5 transition-colors">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
