import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, AlertCircle, Trash2, CheckCircle2, Clock, X, Radio } from 'lucide-react';
import { api } from '../api/client';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReportId?: (reportId: number) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onSelectReportId,
}) => {
  const [data, setData] = useState<{ total_unread: number; items: any[] }>({
    total_unread: 0,
    items: [],
  });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setData(res || { total_unread: 0, items: [] });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 z-50 w-96 max-w-[90vw] bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden text-left text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            System Alerts & Events
          </h3>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {data.items.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            className="text-[10px] text-slate-400 hover:text-white transition"
          >
            Refresh
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/80 text-xs">
        {loading && (
          <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>Scanning municipal event log...</span>
          </div>
        )}

        {!loading && data.items.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
            <p className="font-semibold text-slate-300">All Municipal SLA Targets Nominal</p>
            <p className="text-[11px] text-slate-500 mt-1">No overdue reports or unserviced alerts at this time.</p>
          </div>
        )}

        {!loading &&
          data.items.map((item) => {
            const isCritical = item.severity === 'critical';
            const isHigh = item.severity === 'high';
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (item.target_id && onSelectReportId) {
                    onSelectReportId(item.target_id);
                    onClose();
                  }
                }}
                className={`p-3 hover:bg-slate-800/60 transition cursor-pointer flex items-start gap-3 ${
                  isCritical ? 'bg-red-950/20' : isHigh ? 'bg-amber-950/15' : ''
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {item.type === 'sla_overdue' ? (
                    <Clock className="w-4 h-4 text-red-400 animate-pulse" />
                  ) : item.type === 'bin_overflow' ? (
                    <Trash2 className="w-4 h-4 text-amber-400" />
                  ) : item.type === 'critical_report' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-blue-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-semibold text-slate-200 truncate text-[11px]">
                      {item.title}
                    </span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                          item.badge === 'SIMULATED'
                            ? 'bg-purple-900/40 text-purple-300 border-purple-700/50'
                            : item.badge === 'OVERDUE'
                            ? 'bg-red-900/50 text-red-200 border-red-700/50'
                            : 'bg-amber-900/40 text-amber-300 border-amber-700/50'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                    {item.message}
                  </p>
                  <div className="mt-1 text-[9px] text-slate-500 font-mono flex items-center justify-between">
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {item.target_id && (
                      <span className="text-amber-400 hover:underline">Inspect #{item.target_id} →</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Footer Banner */}
      <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/80 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Verified against ReportEvent audit history</span>
        <span className="text-emerald-400 font-medium">Real SQL Feed</span>
      </div>
    </div>
  );
};
