import { ShieldAlert, Brain, Bell, TrendingDown, Shield } from "lucide-react";

export default function RiskIntelligenceCard({
  riskScore,
  insight,
  nextMiss,
  onAlertCaregiver,
}) {
  const getRiskLevel = () => {
    if (!riskScore) return { label: "Unknown", color: "text-muted-foreground", bg: "bg-muted", ringColor: "ring-muted" };
    if (riskScore <= 30) return { label: "Low Risk", color: "text-success", bg: "bg-success/10", ringColor: "ring-success/20" };
    if (riskScore <= 60) return { label: "Moderate", color: "text-warning", bg: "bg-warning/10", ringColor: "ring-warning/20" };
    return { label: "High Risk", color: "text-danger", bg: "bg-danger/10", ringColor: "ring-danger/20" };
  };

  const risk = getRiskLevel();

  return (
    <div className="pro-card overflow-hidden">
      {/* Gradient header */}
      <div
        className="p-6 text-primary-foreground relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary-foreground/5" />
        <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-primary-foreground/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-primary-foreground/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">AI Risk Intelligence</h3>
              <p className="text-[11px] opacity-70 font-medium">Predictive Analysis</p>
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-6xl font-black leading-none tracking-tight">{riskScore ?? "--"}</span>
            <span className="text-sm font-semibold opacity-60 mb-2">/100</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${risk.bg} ring-1 ${risk.ringColor}`}>
          <Shield className={`w-4 h-4 ${risk.color}`} />
          <span className={`text-xs font-bold ${risk.color}`}>{risk.label}</span>
        </div>

        {insight && (
          <div className="bg-muted/50 rounded-xl p-4 border border-border/30">
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">{insight}</p>
          </div>
        )}

        {nextMiss && (
          <div className="bg-warning/5 border border-warning/15 rounded-xl p-3.5 flex items-start gap-2.5">
            <TrendingDown className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-warning leading-relaxed">Predicted next miss: {nextMiss}</p>
          </div>
        )}

        <button
          onClick={onAlertCaregiver}
          className="w-full flex items-center justify-center gap-2.5 bg-danger/10 text-danger py-3.5 rounded-xl text-xs font-bold hover:bg-danger/15 hover:shadow-md hover:shadow-danger/10 transition-all duration-200 ring-1 ring-danger/10"
        >
          <Bell className="w-4 h-4" />
          Alert Caregiver
        </button>
      </div>
    </div>
  );
}
