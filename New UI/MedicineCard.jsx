import { Check, X, Clock } from "lucide-react";

export default function MedicineCard({ dose, onMarkTaken, onSkip }) {
  const isTaken = dose.status === "taken";
  const isSkipped = dose.status === "skipped";
  const isDone = isTaken || isSkipped;

  return (
    <div
      className={`pro-card p-5 flex items-center justify-between gap-4 transition-all duration-300 ${
        isDone ? "opacity-50 scale-[0.99]" : "hover:scale-[1.005]"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 transition-all duration-300 ${
            isTaken
              ? "bg-success/15 text-success ring-2 ring-success/20"
              : isSkipped
              ? "bg-danger/15 text-danger ring-2 ring-danger/20"
              : "bg-primary/10 text-primary"
          }`}
        >
          {isTaken ? <Check className="w-5 h-5" strokeWidth={3} /> : isSkipped ? <X className="w-5 h-5" strokeWidth={3} /> : "💊"}
        </div>
        <div>
          <h4 className="font-bold text-foreground text-sm tracking-tight">{dose.medicine_name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">{dose.dosage}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/70 px-3.5 py-2 rounded-xl">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-semibold">{dose.scheduled_time}</span>
        </div>
        {!isDone && (
          <div className="flex gap-2">
            <button
              onClick={() => onMarkTaken(dose)}
              className="bg-success text-success-foreground px-5 py-2.5 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-success/20 hover:scale-105 transition-all duration-200"
            >
              Take
            </button>
            <button
              onClick={() => onSkip(dose, "skipped")}
              className="bg-muted text-muted-foreground px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-border/80 transition-all duration-200"
            >
              Skip
            </button>
          </div>
        )}
        {isTaken && (
          <span className="text-xs font-bold text-success bg-success/10 px-4 py-2 rounded-xl ring-1 ring-success/20">
            ✓ Taken
          </span>
        )}
        {isSkipped && (
          <span className="text-xs font-bold text-danger bg-danger/10 px-4 py-2 rounded-xl ring-1 ring-danger/20">
            Skipped
          </span>
        )}
      </div>
    </div>
  );
}
