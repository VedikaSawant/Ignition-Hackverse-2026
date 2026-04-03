import { motion, AnimatePresence } from 'framer-motion';
import { Bell, RefreshCw } from "lucide-react";
// Assuming api function exists in api folder
import { markAlertRead } from '../api/alerts';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AlertFeed({ alerts=[], onRefresh }) {
  const handleMarkRead = async (id) => {
    try {
        await markAlertRead(id);
        if (onRefresh) onRefresh();
    } catch {}
  };

  const getAlertStyle = (type) => {
    switch (type) {
      case "high_risk": 
      case "critical": return "border-l-danger bg-danger/5 text-danger";
      case "low_stock":
      case "missed_dose":
      case "warning": return "border-l-warning bg-warning/5 text-warning";
      default: return "border-l-primary bg-primary/5 text-primary";
    }
  };

  const unreadAlerts = alerts.filter(a => !a.is_read);

  return (
    <div className="pro-card overflow-hidden flex flex-col max-h-[500px]">
      <div className="flex items-center justify-between p-5 pb-4 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-bold text-sm text-foreground">Activity Feed</h3>
          {unreadAlerts.length > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
              {unreadAlerts.length}
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

      <div className="px-5 py-4 space-y-2.5 overflow-y-auto custom-scrollbar flex-1">
        {alerts.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-4xl block mb-3 opacity-50 grayscale">✅</span>
            <p className="text-xs text-muted-foreground font-semibold">All clear — no active alerts</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
             {alerts.slice(0, 15).map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  whileHover={{ x: 4 }}
                  onClick={() => !alert.is_read && handleMarkRead(alert.id)}
                  className={`border-l-[3px] rounded-xl p-4 transition-all duration-200 ${alert.is_read ? 'bg-muted/30 border-border/50 cursor-default opacity-70' : `cursor-pointer hover:translate-x-0.5 ${getAlertStyle(alert.alert_type || alert.type)}`}`}
                >
                  <p className={`text-xs leading-relaxed ${alert.is_read ? 'text-muted-foreground font-medium' : 'text-foreground font-semibold'}`}>
                     {alert.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                     <p className="text-[10px] text-muted-foreground font-medium">{timeAgo(alert.created_at || alert.time)}</p>
                     {!alert.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </div>
                </motion.div>
             ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
