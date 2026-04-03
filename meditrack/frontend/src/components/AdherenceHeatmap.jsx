export default function AdherenceHeatmap({ data = [] }) {
  if (!data.length) return null;

  const getColor = (pct) => {
    if (pct < 0) return '#F1F5F9'; // no data / future
    if (pct === 100) return '#15803D';
    if (pct >= 80) return '#22C55E';
    if (pct >= 60) return '#86EFAC';
    if (pct >= 40) return '#FDE047';
    if (pct >= 20) return '#FBBF24';
    if (pct > 0) return '#F87171';
    return '#EF4444';
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

  const days = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">📅 Adherence Heatmap</h3>

      {/* Month labels */}
      <div className="flex mb-1 ml-8">
        {months.map((m, i) => (
          <div key={i} className="text-[10px] text-gray-400 font-medium"
            style={{ position: 'relative', left: `${m.col * 16}px` }}>
            {m.month}
          </div>
        ))}
      </div>

      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {days.map((d, i) => (
            <div key={i} className="w-6 h-3.5 text-[9px] text-gray-400 flex items-center justify-end pr-1">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-0.5 overflow-x-auto">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((day, di) => (
                <div
                  key={di}
                  className="tooltip w-3.5 h-3.5 rounded-sm cursor-pointer transition-transform hover:scale-150"
                  style={{ backgroundColor: getColor(day.adherence_percent) }}
                  data-tip={`${day.date}: ${day.adherence_percent >= 0 ? Math.round(day.adherence_percent) + '%' : 'No data'}`}
                  title={`${day.date}: ${day.adherence_percent >= 0 ? Math.round(day.adherence_percent) + '%' : 'No data'}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500">
        <span>Less</span>
        {['#EF4444', '#FBBF24', '#FDE047', '#86EFAC', '#22C55E', '#15803D'].map((c) => (
          <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
