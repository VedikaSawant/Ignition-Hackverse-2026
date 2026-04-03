import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';

export default function HealthMetricChart({ data = [], metrics = ['blood_pressure_systolic'], title = 'Health Trends' }) {
  const METRIC_CONFIG = {
    blood_pressure_systolic: { color: '#EF4444', label: 'BP Systolic' },
    blood_pressure_diastolic: { color: '#F97316', label: 'BP Diastolic' },
    blood_sugar: { color: '#8B5CF6', label: 'Blood Sugar' },
    weight: { color: '#06B6D4', label: 'Weight' },
    mood: { color: '#F59E0B', label: 'Mood' },
    pain_level: { color: '#EC4899', label: 'Pain Level' },
    adherence_percent: { color: '#16A34A', label: 'Adherence %' },
  };

  const chartData = data.map((d) => ({
    ...d,
    date: d.date?.split('-').slice(1).join('/'),
  }));

  return (
    <div className="medico-card p-8 bg-white shadow-xl shadow-slate-900/5">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary border border-primary/10">
                <Activity size={20} />
            </div>
            <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-1">{title}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time-Series Biometric Matrix</p>
            </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-success/10 text-success rounded-lg text-[9px] font-black uppercase tracking-widest">
            <TrendingUp size={12} />
            Live Processing
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="6 6" stroke="#F1F5F9" vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }} 
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#0F172A',
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
              fontSize: '11px',
              fontFamily: 'Inter',
              fontWeight: '700',
              color: 'white',
              padding: '12px 16px',
            }}
            itemStyle={{ color: '#F1F5F9' }}
            cursor={{ stroke: '#E2E8F0', strokeWidth: 2 }}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ 
                fontSize: '10px', 
                fontWeight: '800', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                paddingBottom: '20px',
                color: '#64748B'
            }} 
          />
          {metrics.map((m) => {
            const cfg = METRIC_CONFIG[m] || { color: '#0052FF', label: m };
            return (
              <Line
                key={m}
                type="monotone"
                dataKey={m}
                stroke={cfg.color}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF', stroke: cfg.color }}
                activeDot={{ r: 6, strokeWidth: 2, fill: cfg.color, stroke: '#FFFFFF' }}
                name={cfg.label}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
