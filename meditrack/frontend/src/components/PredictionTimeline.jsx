export default function PredictionTimeline({ doses = [], predictions = [] }) {
  const now = new Date();
  const currentHour = now.getHours();

  // Merge doses with prediction data
  const timeline = doses.map((dose) => {
    const timeStr = dose.scheduled_time?.split(' ')[1] || '00:00';
    const hour = parseInt(timeStr.split(':')[0]);
    const pred = predictions?.find(
      (p) => p.medicine_id === dose.medicine_id && p.predicted_time === timeStr
    );
    return {
      ...dose,
      hour,
      timeStr,
      missProb: pred ? Math.round(pred.miss_probability * 100) : null,
      isHighRisk: pred ? pred.miss_probability > 0.5 : false,
    };
  }).sort((a, b) => a.hour - b.hour);

  if (!timeline.length) return null;

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">📋 Today's Timeline</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {timeline.map((item, i) => {
            const isPast = item.hour < currentHour;
            const isCurrent = item.hour === currentHour;

            return (
              <div key={i} className="flex items-center gap-4 relative animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                {/* Dot */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 text-sm font-bold ${
                  item.status === 'taken' ? 'bg-green-100 text-green-700' :
                  item.status === 'missed' ? 'bg-red-100 text-red-700' :
                  isCurrent ? 'bg-blue-100 text-blue-700 animate-pulse-ring' :
                  item.isHighRisk ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {item.status === 'taken' ? '✓' :
                   item.status === 'missed' ? '✗' :
                   item.timeStr.split(':')[0]}
                </div>

                {/* Content */}
                <div className={`flex-1 p-3 rounded-xl ${
                  item.isHighRisk && item.status === 'pending' ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.medicine_name}</p>
                      <p className="text-xs text-gray-500">{item.medicine_dosage} · {item.timeStr}</p>
                    </div>
                    {item.missProb !== null && item.status === 'pending' && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        item.missProb > 50 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {item.missProb}% risk
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
