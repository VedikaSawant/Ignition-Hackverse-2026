import { Flame, Trophy } from "lucide-react";

export default function StreakTracker({ current, longest, history }) {
  return (
    <div className="pro-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-warning/10 rounded-2xl flex items-center justify-center">
            <span className="text-xl">🔥</span>
          </div>
          <div>
            <span className="text-3xl font-black text-foreground leading-none">{current}</span>
            <span className="text-xs text-muted-foreground font-semibold ml-1.5">day streak</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted/70 px-4 py-2 rounded-xl ring-1 ring-border/50">
          <Trophy className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-bold text-muted-foreground">Best: {longest}</span>
        </div>
      </div>

      <div className="flex gap-[3px] flex-wrap">
        {history.map((day, i) => (
          <div
            key={i}
            title={day.date}
            className={`w-[14px] h-[14px] rounded-[3px] transition-all duration-200 cursor-default ${
              day.completed
                ? "bg-success/70 hover:bg-success hover:scale-125 hover:shadow-sm hover:shadow-success/30"
                : "bg-muted/80 hover:bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
