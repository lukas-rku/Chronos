import React, { useState, useEffect } from 'react';
import { User, TimeEntry } from '../types';
import { calculateDailySummaries, formatDuration, formatHourlyPay, getDailyBlocks, cn, parseSafeDate } from '../utils';
import { Clock, Play, Square, Coffee, LogOut, Code, Calendar, DollarSign, Activity, History, Home, Settings, Smartphone, Download, Plus, Target, Edit2, Trash2, Zap, Brain } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AnimatedNumber } from './AnimatedNumber';
import { WeeklyTimeline } from './WeeklyTimeline';
import { CalendarGrid } from './CalendarGrid';
import { InstallPWA } from './InstallPWA';
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
  
  const [hourlyRate, setHourlyRate] = useState(25);
  const [currency, setCurrency] = useState('$');
  const [dailyGoal, setDailyGoal] = useState(8);
  const [weeklyGoal, setWeeklyGoal] = useState(40);
  const [taxRate, setTaxRate] = useState(20);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  const [activityView, setActivityView] = useState<'weekly' | 'timeline' | 'monthly' | 'yearly'>('weekly');
  const [chartMode, setChartMode] = useState<'hours' | 'earnings'>('hours');
  const [now, setNow] = useState(new Date());
  const [timelineBaseDate, setTimelineBaseDate] = useState<Date>(new Date());

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualType, setManualType] = useState('in');
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editType, setEditType] = useState('');

  useEffect(() => {
    fetchEntries();
    fetchSettings();
    
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

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.hourlyRate !== undefined) setHourlyRate(data.hourlyRate);
      if (data.currency !== undefined) setCurrency(data.currency);
      if (data.dailyGoal !== undefined) setDailyGoal(data.dailyGoal);
      if (data.weeklyGoal !== undefined) setWeeklyGoal(data.weeklyGoal);
      if (data.taxRate !== undefined) setTaxRate(data.taxRate);
    }
  };

  const saveSettings = async () => {
    const payload = { hourlyRate, currency, dailyGoal, weeklyGoal, taxRate };
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
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
    
    // Construct local date and send ISO string
    const localDate = new Date(`${manualDate}T${manualTime}:00`);
    const timestamp = localDate.toISOString();
    
    setLoading(true);
    await fetch('/api/manual_entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: manualType, timestamp })
    });
    
    setShowManualModal(false);
    fetchEntries();
  };

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !editDate || !editTime) return;
    
    // Construct local date and send ISO string
    const localDate = new Date(`${editDate}T${editTime}:00`);
    const timestamp = localDate.toISOString();
    
    setLoading(true);
    await fetch(`/api/entries/${editingEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: editType, timestamp })
    });
    setEditingEntry(null);
    fetchEntries();
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    setLoading(true);
    await fetch(`/api/entries/${id}`, { method: 'DELETE' });
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

  const chartData = summaries.slice(0, 7).reverse().map(s => {
    const hours = s.totalWorkedMs / (1000 * 60 * 60);
    return {
      name: format(parseISO(s.date), 'EEE'),
      hours,
      earnings: hours * hourlyRate
    };
  });

  const totalWeekMs = summaries.slice(0, 7).reduce((acc, curr) => acc + curr.totalWorkedMs, 0);
  const totalWeekEarnings = (totalWeekMs / (1000 * 60 * 60)) * hourlyRate;
  const todayEarnings = (today ? today.totalWorkedMs : 0) / (1000 * 60 * 60) * hourlyRate;

  // Calculate insights
  const safeDailyGoal = dailyGoal || 8;
  const safeWeeklyGoal = weeklyGoal || 40;

  const thisMonthSummaries = summaries.filter(s => parseSafeDate(s.date).getMonth() === now.getMonth() && parseSafeDate(s.date).getFullYear() === now.getFullYear());
  const monthTotalMs = thisMonthSummaries.reduce((acc, s) => acc + s.totalWorkedMs, 0);
  const monthGross = (monthTotalMs / (1000 * 3600)) * hourlyRate;
  
  const daysPassed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(0, daysInMonth - daysPassed);
  const expectedRemaining = (remainingDays / 7) * safeWeeklyGoal * hourlyRate;
  
  const weekGross = totalWeekEarnings;
  const weekTax = weekGross * (taxRate / 100);
  const weekNet = weekGross - weekTax;

  const thisYearSummaries = summaries.filter(s => parseSafeDate(s.date).getFullYear() === now.getFullYear());
  const yearTotalMs = thisYearSummaries.reduce((acc, s) => acc + s.totalWorkedMs, 0);
  const yearGross = (yearTotalMs / (1000 * 3600)) * hourlyRate;
  
  const daysWorkedThisYear = thisYearSummaries.filter(s => s.totalWorkedMs > 0).length;
  const avgDailyEarnings = daysWorkedThisYear > 0 ? yearGross / daysWorkedThisYear : 0;

  const todayHours = (today?.totalWorkedMs || 0) / (1000 * 3600);
  const goalProgress = isNaN(todayHours) ? 0 : Math.min((todayHours / safeDailyGoal) * 100, 100);
  const weeklyGoalProgress = isNaN(totalWeekMs) ? 0 : Math.min((totalWeekMs / (1000 * 3600)) / safeWeeklyGoal * 100, 100);

  // Calculate current session duration
  let currentSessionMs = 0;
  if (isClockedIn && entries[0]) {
    // If clocked in, the session started at the last 'in' or 'break_end'
    const lastStart = parseSafeDate(entries[0].timestamp);
    currentSessionMs = Math.max(0, now.getTime() - lastStart.getTime());
  }

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
          <div className="flex items-center gap-4 self-start sm:self-auto">
            <InstallPWA />
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-xl">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-300">System Online</span>
            </div>
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
                  <div className="relative w-full max-w-[16rem] aspect-square flex items-center justify-center mb-6 drop-shadow-[0_0_30px_rgba(99,102,241,0.2)] mx-auto">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 256 256">
                      {/* Weekly Goal Ring (Outer) */}
                      <circle cx="128" cy="128" r="116" className="stroke-white/5 fill-none" strokeWidth="6" />
                      <circle 
                        cx="128" cy="128" r="116" 
                        className="stroke-purple-600 fill-none transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(147,51,234,0.5)]" 
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 116}
                        strokeDashoffset={2 * Math.PI * 116 * (1 - (weeklyGoalProgress || 0) / 100)}
                      />
                      
                      {/* Daily Goal Ring (Inner) */}
                      <circle cx="128" cy="128" r="98" className="stroke-white/5 fill-none" strokeWidth="8" />
                      <circle 
                        cx="128" cy="128" r="98" 
                        className="stroke-indigo-500 fill-none transition-all duration-1000 ease-out drop-shadow-[0_0_12px_rgba(99,102,241,0.8)]" 
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 98}
                        strokeDashoffset={2 * Math.PI * 98 * (1 - (goalProgress || 0) / 100)}
                      />
                    </svg>
                    <div className="flex flex-col items-center">
                      <div className="text-4xl font-mono font-bold text-white mb-1 transition-all duration-200 tracking-tighter">
                        {today ? formatDuration(today.totalWorkedMs) : '0h 0m 0s'}
                      </div>
                      <div className="text-xs font-mono text-indigo-300">
                        {goalProgress.toFixed(0)}% Daily Goal
                      </div>
                    </div>
                  </div>

                  {today && today.totalBreakMs > 0 ? (
                    <p className="text-slate-400 text-sm mb-2 font-mono">Break: {formatDuration(today.totalBreakMs)}</p>
                  ) : (
                    <p className="text-slate-400 text-sm mb-2 opacity-50">Ready to work</p>
                  )}
                  {isClockedIn && (
                    <p className="text-xs text-emerald-400 font-mono mb-2 animate-pulse bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      Session: {formatDuration(currentSessionMs)}
                    </p>
                  )}

                  <div className="grid grid-cols-1 w-full gap-3 mt-4">
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

                <div className="bg-gradient-to-br from-emerald-500/5 to-indigo-500/5 rounded-3xl border border-white/10 p-8 transform transition-transform hover:scale-[1.02] flex flex-col gap-6 w-full">
                  <h3 className="text-white text-sm uppercase tracking-widest flex items-center gap-2 font-medium">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> Financial Dashboard
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Month to Date</p>
                      <AnimatedNumber 
                        value={monthGross}
                        formatter={(v) => `${currency}${v.toFixed(4)}`}
                        className="text-3xl font-bold text-white font-mono"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Weekly Net (Est)</p>
                      <AnimatedNumber 
                        value={weekNet}
                        formatter={(v) => `${currency}${v.toFixed(4)}`}
                        className="text-3xl font-bold text-emerald-400 font-mono"
                      />
                    </div>
                    
                    <div className="col-span-2 border-t border-white/5 pt-4"></div>

                    <div className="col-span-1 space-y-1">
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Est. Remaining</p>
                      <p className="text-indigo-400 font-mono text-sm">{currency}{expectedRemaining.toFixed(4)}</p>
                    </div>
                    <div className="col-span-1 space-y-1">
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Weekly Gross</p>
                      <p className="text-slate-300 font-mono text-sm">{currency}{weekGross.toFixed(4)}</p>
                    </div>
                    <div className="col-span-1 space-y-1">
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Year To Date</p>
                      <p className="text-emerald-300 font-mono text-sm">{currency}{yearGross.toFixed(4)}</p>
                    </div>
                    <div className="col-span-1 space-y-1">
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Avg Daily</p>
                      <p className="text-amber-300 font-mono text-sm">{currency}{avgDailyEarnings.toFixed(4)}</p>
                    </div>
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

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex-1 flex flex-col min-h-[400px]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-400" />
                      Activity Overview
                    </h3>
                    <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl">
                      <button onClick={() => setActivityView('weekly')} className={cn("px-3 py-1 text-xs font-medium rounded-lg transition-colors", activityView === 'weekly' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white')}>Weekly</button>
                      <button onClick={() => setActivityView('monthly')} className={cn("px-3 py-1 text-xs font-medium rounded-lg transition-colors", activityView === 'monthly' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white')}>Monthly</button>
                      <button onClick={() => setActivityView('yearly')} className={cn("px-3 py-1 text-xs font-medium rounded-lg transition-colors", activityView === 'yearly' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white')}>Yearly</button>
                      <button onClick={() => setActivityView('timeline')} className={cn("px-3 py-1 text-xs font-medium rounded-lg transition-colors border-l border-white/5 ml-1 pl-4", activityView === 'timeline' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white')}>Timeline</button>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-h-[200px] flex flex-col">
                    {activityView === 'weekly' && (
                      <>
                        <div className="flex justify-end mb-4">
                          <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg">
                            <button onClick={() => setChartMode('hours')} className={cn("px-2 py-1 text-[10px] uppercase tracking-wider rounded transition-colors", chartMode === 'hours' ? 'bg-indigo-500/30 text-indigo-200' : 'text-slate-500 hover:text-white')}>Hours</button>
                            <button onClick={() => setChartMode('earnings')} className={cn("px-2 py-1 text-[10px] uppercase tracking-wider rounded transition-colors", chartMode === 'earnings' ? 'bg-emerald-500/30 text-emerald-200' : 'text-slate-500 hover:text-white')}>Earnings</button>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => chartMode === 'hours' ? `${val}h` : `${currency}${val}`} />
                            <Tooltip 
                              cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                              contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }}
                              itemStyle={{ color: chartMode === 'hours' ? '#818cf8' : '#34d399' }}
                              formatter={(val: number) => [chartMode === 'hours' ? val.toFixed(2) + 'h' : currency + val.toFixed(2), chartMode === 'hours' ? 'Worked' : 'Earned']}
                            />
                            <Bar dataKey={chartMode} radius={[6, 6, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry[chartMode] > 0 ? (chartMode === 'hours' ? '#6366f1' : '#10b981') : '#1e293b'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </>
                    )}
                    
                    {(activityView === 'monthly' || activityView === 'yearly') && (
                      <CalendarGrid 
                        summaries={summaries} 
                        view={activityView} 
                        now={now} 
                        onDaySelect={(date) => {
                          setTimelineBaseDate(date);
                          setActivityView('timeline');
                        }}
                      />
                    )}

                    {activityView === 'timeline' && (
                      <WeeklyTimeline entries={entries} baseDate={timelineBaseDate} now={now} />
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-h-[300px] flex flex-col">
                  <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-purple-400" />
                      Recent Actions
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={handleExportCSV} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors" title="Export CSV">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => alert('Invoice generator coming soon. It will export a polished PDF based on month-to-date earnings.')} className="p-2 rounded-xl border border-indigo-500/30 text-indigo-400 hover:text-white hover:bg-indigo-500/20 transition-colors" title="Generate Invoice">
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowManualModal(true)} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors" title="Add Entry">
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
                         const entryDate = parseSafeDate(entry.timestamp);
                         const nextEntryDate = parseSafeDate(nextEntry.timestamp);
                         const diff = Math.max(0, entryDate.getTime() - nextEntryDate.getTime());
                         progressText = `[Worked ${formatDuration(diff)}]`;
                       }

                       const displayDate = parseSafeDate(entry.timestamp);
                       return (
                      <div key={entry.id} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-2 h-2 rounded-full", {
                            'bg-green-400': entry.type === 'in',
                            'bg-red-400': entry.type === 'out',
                            'bg-yellow-400': entry.type === 'break_start',
                            'bg-blue-400': entry.type === 'break_end'
                          })} />
                          <span className="font-medium text-sm text-slate-300 capitalize">{entry.type.replace('_', ' ')}</span>
                          <span className="text-xs text-slate-500 ml-2 hidden sm:inline">{progressText}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-mono text-slate-500">
                            {format(displayDate, 'MMM d, h:mm:ss a')}
                          </span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingEntry(entry);
                                setEditDate(format(displayDate, 'yyyy-MM-dd'));
                                setEditTime(format(displayDate, 'HH:mm'));
                                setEditType(entry.type);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
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
                <div className="space-y-4 col-span-2">
                  <label className="block text-sm font-medium text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-400" /> Daily Focus Goal (Hours)
                  </label>
                  <input 
                    type="number" 
                    value={dailyGoal}
                    onChange={e => setDailyGoal(Number(e.target.value))}
                    className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-indigo-500 focus:bg-white/5 font-mono transition-colors"
                  />
                </div>
                <div className="space-y-4 col-span-2">
                  <label className="block text-sm font-medium text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-400" /> Weekly Focus Goal (Hours)
                  </label>
                  <input 
                    type="number" 
                    value={weeklyGoal}
                    onChange={e => setWeeklyGoal(Number(e.target.value))}
                    className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-purple-500 focus:bg-white/5 font-mono transition-colors"
                  />
                </div>
                <div className="space-y-4 col-span-2">
                  <label className="block text-sm font-medium text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> Estimated Tax Rate (%)
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={e => setTaxRate(Number(e.target.value))}
                    className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-emerald-500 focus:bg-white/5 font-mono transition-colors"
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

        {/* Modal for Edit Entry */}
        {editingEntry && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-3xl w-full max-w-sm space-y-6">
              <h3 className="text-xl font-medium text-white">Edit Entry</h3>
              <form onSubmit={handleEditEntry} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase text-slate-400 tracking-wider mb-2">Type</label>
                  <select 
                    value={editType} 
                    onChange={e => setEditType(e.target.value)}
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
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-slate-400 tracking-wider mb-2">Time</label>
                  <input 
                    type="time" 
                    required
                    value={editTime}
                    onChange={e => setEditTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingEntry(null)} className="flex-1 py-3 px-4 rounded-xl text-slate-400 hover:bg-white/5 transition-colors">Cancel</button>
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
