export default function BadgeCard({ badge }) {
  const isEarned = badge.earned;

  return (
    <div className={`glass-card p-5 text-center transition-all ${
      isEarned ? 'hover:shadow-lg' : 'opacity-50 grayscale'
    }`}>
      <div className={`text-4xl mb-3 ${isEarned ? 'animate-scale-in' : ''}`}>
        {badge.badge_icon || '🏅'}
      </div>
      <h4 className="text-sm font-bold text-gray-800">{badge.badge_name}</h4>
      <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
      {isEarned && badge.earned_at && (
        <p className="text-[10px] text-green-600 mt-2 font-medium">
          ✅ Earned {new Date(badge.earned_at).toLocaleDateString()}
        </p>
      )}
      {!isEarned && (
        <p className="text-[10px] text-gray-400 mt-2">🔒 Locked</p>
      )}
    </div>
  );
}
