import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import useAnalytics from '../hooks/useAnalytics';
import AdherenceHeatmap from '../components/AdherenceHeatmap';
import StreakTracker from '../components/StreakTracker';

const COLORS = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6'];

export default function Adherence() {
  const [period, setPeriod] = useState(30);
  const { daily, streak, heatmap, perMedicine, missedPatterns, loading } = useAnalytics(period);

  const overall = daily.length > 0
    ? Math.round(daily.reduce((s, d) => s + d.adherence_percent, 0) / daily.length)
    : 0;

  const prevPeriod = daily.slice(0, Math.floor(daily.length / 2));
  const curPeriod = daily.slice(Math.floor(daily.length / 2));
  const prevAvg = prevPeriod.length > 0 ? prevPeriod.reduce((s, d) => s + d.adherence_percent, 0) / prevPeriod.length : 0;
  const curAvg = curPeriod.length > 0 ? curPeriod.reduce((s, d) => s + d.adherence_percent, 0) / curPeriod.length : 0;
  const trend = curAvg - prevAvg;

  // Prepare reason pie chart data
  const reasonData = missedPatterns?.reason_breakdown
    ? Object.entries(missedPatterns.reason_breakdown).map(([k, v]) => ({ name: k, value: v }))
    : [];

  if (loading) return (
    <div className="page-container">
      <div className="loading-skeleton h-8 w-48 mb-6 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1,2,3].map(i => <div key={i} className="loading-skeleton h-32 rounded-xl" />)}
      </div>
      <div className="loading-skeleton h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📊 My Adherence</h1>
        <div className="flex gap-2 mt-2 sm:mt-0">
          {[{ val: 7, label: '7D' }, { val: 30, label: '30D' }, { val: 90, label: '3M' }].map(p => (
            <button key={p.val} onClick={() => setPeriod(p.val)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p.val ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overall stat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-6 text-center">
          <p className="text-5xl font-extrabold text-blue-600">{overall}%</p>
          <p className="text-sm text-gray-500 mt-1">Overall Adherence</p>
          <p className={`text-xs font-semibold mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(trend))}% vs previous period
          </p>
        </div>
        <div className="glass-card p-6">
          <StreakTracker current={streak.current_streak} longest={streak.longest_streak} history={streak.streak_history} />
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-2xl font-bold text-gray-800 mb-1">{missedPatterns?.total_missed || 0}</p>
          <p className="text-sm text-gray-500">Missed Doses ({period}d)</p>
          {missedPatterns?.summary && (
            <p className="text-xs text-orange-600 mt-2 font-medium">{missedPatterns.summary}</p>
          )}
        </div>
      </div>

      {/* Daily adherence line chart */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 Daily Adherence Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={daily.map(d => ({ ...d, date: d.date.split('-').slice(1).join('/') }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #E2E8F0' }} />
            <Line type="monotone" dataKey="adherence_percent" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} name="Adherence %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Per-medicine bar chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">💊 Per-Medicine Adherence</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={perMedicine} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis dataKey="medicine_name" type="category" tick={{ fontSize: 12, fill: '#475569' }} width={100} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
              <Bar dataKey="adherence_percent" fill="#2563EB" radius={[0, 8, 8, 0]} name="Adherence %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Miss reasons pie chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">📋 Miss Reasons</h3>
          {reasonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={reasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {reasonData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm">No missed doses 🎉</div>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <AdherenceHeatmap data={heatmap} />
    </div>
  );
}
