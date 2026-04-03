import { motion, AnimatePresence } from 'framer-motion';
import { Bell, RefreshCw, CheckCircle, AlertTriangle, Info, Zap } from "lucide-react";
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

  const getAlertIcon = (type) => {
    switch (type) {
      case "high_risk": 
      case "critical": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "low_stock":
      case "missed_dose":
      case "warning": return <Zap className="w-4 h-4 text-amber-500" />;
      case "behavioral_warning": return <Sparkles className="w-4 h-4 text-indigo-500" />;
      case "reminder": return <Clock className="w-4 h-4 text-emerald-500" />;
      default: return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const getAlertStyle = (type) => {
    switch (type) {
      case "high_risk": 
      case "critical": return "bg-red-50 border-red-100 hover:border-red-200";
      case "low_stock":
      case "missed_dose":
      case "warning": return "bg-amber-50 border-amber-100 hover:border-amber-200";
      case "behavioral_warning": return "bg-indigo-50 border-indigo-100 hover:border-indigo-200 shadow-sm";
      case "reminder": return "bg-emerald-50 border-emerald-100 hover:border-emerald-200";
      default: return "bg-slate-50 border-slate-100 hover:border-slate-200";
    }
  };

  const unreadAlerts = alerts.filter(a => !a.is_read);

  return (
    <div className="medico-card bg-white shadow-2xl border border-slate-50 overflow-hidden flex flex-col max-h-[600px]">
      <div className="flex items-center justify-between p-8 border-b border-slate-50 bg-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/10 shadow-sm">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Clinical Alert Stream</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Protocol Status</p>
          </div>
          {unreadAlerts.length > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-primary/20 animate-pulse">
              {unreadAlerts.length} NEW
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="p-3 hover:bg-slate-50 rounded-2xl transition-all duration-300 text-slate-400 hover:text-primary group"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
        </button>
      </div>

      <div className="p-8 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-white">
        {alerts.length === 0 ? (
          <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-50 mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-success opacity-20" />
            </div>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em]">Protocol Clear</p>
            <p className="text-xs text-slate-400 mt-2 italic px-8">No active alerts requiring clinical intervention</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
             {alerts.slice(0, 15).map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  whileHover={{ x: 4 }}
                  onClick={() => !alert.is_read && handleMarkRead(alert.id)}
                  className={`border rounded-2xl p-6 transition-all duration-300 flex items-start gap-4 ${alert.is_read ? 'bg-slate-50/50 border-slate-100 cursor-default grayscale opacity-60' : `cursor-pointer ${getAlertStyle(alert.alert_type || alert.type)}`}`}
                >
                  <div className={`mt-0.5 p-2 rounded-xl bg-white shadow-sm border border-inherit`}>
                    {getAlertIcon(alert.alert_type || alert.type)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className={`text-sm leading-relaxed ${alert.is_read ? 'text-slate-500' : 'text-slate-900 font-semibold'}`}>
                       {alert.message}
                    </p>
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{timeAgo(alert.created_at || alert.time)}</p>
                       {!alert.is_read && (
                         <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,82,255,0.5)]" />
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Active</span>
                         </div>
                       )}
                    </div>
                  </div>
                </motion.div>
             ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
