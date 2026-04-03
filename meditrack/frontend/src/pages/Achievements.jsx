import { useState, useEffect } from 'react';
import { getAllBadges, getPoints, checkAchievements } from '../api/achievements';
import BadgeCard from '../components/BadgeCard';

export default function Achievements() {
  const [badges, setBadges] = useState([]);
  const [points, setPoints] = useState({ points: 0, level: 'Beginner 🌱' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      checkAchievements(),
      getAllBadges().then(r => setBadges(r.data)),
      getPoints().then(r => setPoints(r.data)),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);

  if (loading) return (
    <div className="page-container">
      <div className="loading-skeleton h-8 w-48 mb-6 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="loading-skeleton h-40 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">🏆 Achievements</h1>

      {/* Points & Level */}
      <div className="glass-card p-6 mb-6 text-center animate-fade-in">
        <div className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
          {points.points} pts
        </div>
        <p className="text-lg font-semibold text-gray-700 mt-2">{points.level}</p>
        <div className="w-full max-w-md mx-auto mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all"
            style={{ width: `${Math.min((points.points / 5000) * 100, 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1 max-w-md mx-auto">
          <span>Beginner</span><span>Regular</span><span>Champion</span><span>Legend</span>
        </div>
      </div>

      {/* Earned badges */}
      {earned.length > 0 && (
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <h2 className="text-lg font-bold text-gray-800 mb-4">✨ Earned ({earned.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {earned.map((b, i) => <BadgeCard key={i} badge={b} />)}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h2 className="text-lg font-bold text-gray-800 mb-4">🔒 Locked ({locked.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {locked.map((b, i) => <BadgeCard key={i} badge={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}
