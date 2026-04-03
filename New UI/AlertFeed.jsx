import { Bell, RefreshCw } from "lucide-react";

export default function AlertFeed({ alerts, onRefresh }) {
  const getAlertStyle = (type) => {
    switch (type) {
      case "critical": return "border-l-danger bg-danger/5";
      case "warning": return "border-l-warning bg-warning/5";
      default: return "border-l-primary bg-primary/5";
    }
  };

  return (
    <div className="pro-card overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-bold text-sm text-foreground">Alerts</h3>
          {alerts.length > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {alerts.length}
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-muted rounded-xl transition-all duration-200 hover:rotate-90"
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="px-5 pb-5 space-y-2.5 max-h-72 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-4xl block mb-3">✅</span>
            <p className="text-xs text-muted-foreground font-semibold">All clear — no active alerts</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border-l-[3px] rounded-xl p-4 transition-all duration-200 hover:translate-x-0.5 ${getAlertStyle(alert.type)}`}
            >
              <p className="text-xs font-semibold text-foreground leading-relaxed">{alert.message}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">{alert.time}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
