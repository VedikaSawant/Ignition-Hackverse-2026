import { Calendar } from 'lucide-react';

export default function AdherenceHeatmap({ data = [] }) {
  if (!data.length) return null;

  const getColor = (pct) => {
    if (pct < 0) return '#F8FAFC'; // slate-50 (no data)
    if (pct === 100) return '#059669'; // emerald-600
    if (pct >= 80) return '#10B981'; // emerald-500
    if (pct >= 60) return '#6EE7B7'; // emerald-300
    if (pct >= 40) return '#FCD34D'; // amber-300
    if (pct >= 20) return '#F59E0B'; // amber-500
    if (pct > 0) return '#EF4444'; // red-500
    return '#DC2626'; // red-600
  };

  const weeks = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const months = [];
  let lastMonth = '';
  data.forEach((d, i) => {
    const month = new Date(d.date).toLocaleString('default', { month: 'short' });
    if (month !== lastMonth) {
      months.push({ month, col: Math.floor(i / 7) });
      lastMonth = month;
    }
  });

  const daysLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

  return (
    <div className="medico-card p-10 bg-white shadow-xl border border-slate-50">
      <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
              <Calendar size={24} />
          </div>
          <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Behavioral Adherence Timeline</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yearly protocol distribution matrix</p>
          </div>
      </div>

      <div className="relative overflow-x-auto pb-4 scrollbar-hide">
        {/* Month labels */}
        <div className="flex mb-3 ml-10">
          {months.map((m, i) => (
            <div key={i} className="text-[9px] text-slate-400 font-bold uppercase tracking-widest absolute"
              style={{ left: `${m.col * 22}px` }}>
              {m.month}
            </div>
          ))}
        </div>

        <div className="flex gap-1 pt-6">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-2">
            {daysLabels.map((d, i) => (
              <div key={i} className="w-8 h-4.5 text-[9px] font-bold text-slate-300 flex items-center justify-end pr-2 uppercase tracking-tighter">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="w-4.5 h-4.5 rounded-[4px] cursor-pointer transition-all duration-300 hover:scale-125 hover:shadow-md border border-white/10"
                    style={{ backgroundColor: getColor(day.adherence_percent) }}
                    title={`${day.date}: ${day.adherence_percent >= 0 ? Math.round(day.adherence_percent) + '%' : 'No telemetry'}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-10 pt-8 border-t border-slate-50">
        <div className="flex items-center gap-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Intensity Index</p>
            <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-300 uppercase">Non-Adherent</span>
                {['#EF4444', '#F59E0B', '#FCD34D', '#6EE7B7', '#10B981', '#059669'].map((c) => (
                <div key={c} className="w-3.5 h-3.5 rounded-[3px] shadow-sm" style={{ backgroundColor: c }} />
                ))}
                <span className="text-[9px] font-bold text-slate-300 uppercase">Optimal</span>
            </div>
        </div>
        <p className="text-[10px] font-bold text-slate-300 italic tracking-widest uppercase">Clinical Telemetry Active</p>
      </div>
    </div>
  );
}
