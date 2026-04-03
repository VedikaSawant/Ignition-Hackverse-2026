import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 {title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
          <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
          <Tooltip
            contentStyle={{
              background: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {metrics.map((m) => {
            const cfg = METRIC_CONFIG[m] || { color: '#2563EB', label: m };
            return (
              <Line
                key={m}
                type="monotone"
                dataKey={m}
                stroke={cfg.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name={cfg.label}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
