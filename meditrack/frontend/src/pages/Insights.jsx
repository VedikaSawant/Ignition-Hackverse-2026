import { useState, useEffect } from 'react';
import { getInsights, getRiskScore, getNextMiss } from '../api/predictions';
import { getCorrelations } from '../api/health';
import { getMedicines } from '../api/medicines';
import HealthMetricChart from '../components/HealthMetricChart';
import RiskIntelligenceCard from '../components/RiskIntelligenceCard';

export default function Insights() {
  const [insight, setInsight] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  const [nextMiss, setNextMiss] = useState(null);
  const [correlations, setCorrelations] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getInsights().then(r => setInsight(r.data)),
      getRiskScore().then(r => setRiskScore(r.data)),
      getNextMiss().then(r => setNextMiss(r.data)),
      getCorrelations().then(r => setCorrelations(r.data)),
      getMedicines().then(r => setMedicines(r.data)),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-container">
      <div className="loading-skeleton h-8 w-48 mb-6 rounded" />
      <div className="loading-skeleton h-64 rounded-xl mb-6" />
      <div className="loading-skeleton h-48 rounded-xl" />
    </div>
  );

  // Detect patterns
  const patterns = [];
  if (insight?.patient_data) {
    const pd = insight.patient_data;
    if (pd.weekly_rate < 80) patterns.push({ icon: '📉', text: `Weekly adherence is ${pd.weekly_rate}% — below the 80% target` });
    if (pd.most_missed_time === 'Evening') patterns.push({ icon: '🌙', text: 'Evening doses are missed more frequently than morning doses' });
    if (pd.most_missed_medicine !== 'None') patterns.push({ icon: '💊', text: `${pd.most_missed_medicine} is your most frequently missed medication` });
    if (pd.bp_trend === 'rising') patterns.push({ icon: '📈', text: 'Blood pressure shows an upward trend — consider reviewing with your doctor' });
    if (pd.sugar_trend === 'rising') patterns.push({ icon: '🍬', text: 'Blood sugar levels are trending upward' });
    if (pd.current_streak > 3) patterns.push({ icon: '🔥', text: `Great job! You're on a ${pd.current_streak}-day streak` });
  }

  // Refill predictions
  const refillPredictions = medicines.filter(m => m.remaining_quantity <= m.refill_alert_threshold * 2).map(m => {
    const dailyDoses = (m.times_of_day?.length || 1);
    const daysLeft = Math.floor(m.remaining_quantity / dailyDoses);
    return { name: m.name, remaining: m.remaining_quantity, days_left: daysLeft };
  });

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">🧠 AI Insights</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Summary */}
          <div className="glass-card p-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📝</span>
              <h2 className="text-lg font-bold text-gray-800">Weekly AI Summary</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">{insight?.weekly_summary || 'Loading summary...'}</p>
          </div>

          {/* Behavioral Patterns */}
          <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">🔍 Behavioral Patterns</h3>
            {patterns.length > 0 ? (
              <div className="space-y-3">
                {patterns.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 animate-slide-in" style={{ animationDelay: `${i * 100}ms` }}>
                    <span className="text-xl">{p.icon}</span>
                    <p className="text-sm text-gray-700">{p.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No significant patterns detected — keep up the good work!</p>
            )}
          </div>

          {/* Health Correlations */}
          {correlations.length > 0 && (
            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <HealthMetricChart
                data={correlations}
                metrics={['adherence_percent', 'blood_pressure_systolic']}
                title="Adherence vs Blood Pressure Trend"
              />
            </div>
          )}

          {correlations.length > 0 && (
            <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <HealthMetricChart
                data={correlations}
                metrics={['adherence_percent', 'blood_sugar']}
                title="Adherence vs Blood Sugar Trend"
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <RiskIntelligenceCard riskScore={riskScore} insight={insight} nextMiss={nextMiss} />

          {/* Refill Predictions */}
          {refillPredictions.length > 0 && (
            <div className="glass-card p-5 animate-fade-in">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 Refill Predictions</h3>
              <div className="space-y-3">
                {refillPredictions.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-amber-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.name}</p>
                      <p className="text-xs text-gray-500">{r.remaining} doses left</p>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                      {r.days_left} days
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
