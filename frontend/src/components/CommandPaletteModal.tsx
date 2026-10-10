import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, AlertCircle, ArrowRight, X, Command, Sliders, Route, Download, Radio, Shield, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onSelectReportId?: (reportId: number) => void;
  onOpenAssistant: () => void;
  onOpenJudgeMode: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSelectReportId,
  onOpenAssistant,
  onOpenJudgeMode,
}) => {
  const { switchDemoRole } = useAuth();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    reports: any[];
    wards: any[];
    quick_actions: any[];
  }>({ reports: [], wards: [], quick_actions: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      performSearch('');
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const performSearch = async (searchTerm: string) => {
    setLoading(true);
    try {
      const res = await api.globalSearch(searchTerm);
      setSearchResults(res || { reports: [], wards: [], quick_actions: [] });
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    performSearch(val);
  };

  const handleAction = (actionId: string) => {
    onClose();
    if (actionId === 'nav_map') onNavigateTab('map');
    else if (actionId === 'nav_reports') onNavigateTab('my-reports');
    else if (actionId === 'nav_routes') onNavigateTab('routes');
    else if (actionId === 'nav_drains') onNavigateTab('drain-guard');
    else if (actionId === 'nav_bins') onNavigateTab('map');
    else if (actionId === 'nav_recycle') onNavigateTab('recycle');
    else if (actionId === 'nav_analytics') onNavigateTab('command-center');
    else if (actionId === 'nav_admin') onNavigateTab('admin-config');
    else if (actionId === 'export_csv') {
      window.open(api.getCsvExportUrl(), '_blank');
    } else if (actionId === 'open_assistant') {
      onOpenAssistant();
    } else if (actionId === 'open_judge_mode') {
      onOpenJudgeMode();
    } else if (actionId === 'switch_role_worker') {
      switchDemoRole('worker');
    } else if (actionId === 'switch_role_supervisor') {
      switchDemoRole('supervisor');
    } else if (actionId === 'switch_role_admin') {
      switchDemoRole('admin');
    }
  };

  const handleReportSelect = (rep: any) => {
    onClose();
    onNavigateTab('map');
    if (onSelectReportId) {
      onSelectReportId(rep.id);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-left text-white"
        >
          {/* Search Header Bar */}
          <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/90 gap-3">
            <Search className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Search reports by ticket #, category, ward, or run command (e.g. 'routes', 'csv')..."
              className="bg-transparent border-none text-white text-sm focus:outline-none flex-1 placeholder:text-slate-500"
            />
            {loading && <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results Container */}
          <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs">
            {/* Quick Actions */}
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <Command className="w-3 h-3 text-amber-400" />
                <span>Quick Actions & Shortcuts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {searchResults.quick_actions.map((qa) => (
                  <button
                    key={qa.id}
                    onClick={() => handleAction(qa.id)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-amber-500/50 text-slate-200 transition group text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-slate-700/50 text-amber-400">
                        {qa.id.includes('route') ? (
                          <Route className="w-3.5 h-3.5" />
                        ) : qa.id.includes('csv') ? (
                          <Download className="w-3.5 h-3.5" />
                        ) : qa.id.includes('assistant') ? (
                          <Sparkles className="w-3.5 h-3.5" />
                        ) : qa.id.includes('role') ? (
                          <Shield className="w-3.5 h-3.5" />
                        ) : (
                          <Sliders className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <span className="font-medium">{qa.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>

            {/* Reports Match */}
            {searchResults.reports && searchResults.reports.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-emerald-400" />
                    <span>Matching Civic Reports ({searchResults.reports.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Click to jump to map</span>
                </div>
                <div className="space-y-1">
                  {searchResults.reports.map((rep) => (
                    <button
                      key={rep.id}
                      onClick={() => handleReportSelect(rep)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 hover:border-emerald-500/50 transition text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-amber-300 font-bold">#{rep.ticket_number}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-700 text-slate-200">
                          {rep.category.replace('_', ' ')}
                        </span>
                        <span className="text-slate-300 truncate max-w-xs">{rep.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-emerald-400 font-semibold">
                          Score: {rep.priority_score}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 capitalize">
                          {rep.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Wards Match */}
            {searchResults.wards && searchResults.wards.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  <span>Matching Municipal Wards</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {searchResults.wards.map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-200">{w.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{w.code}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                        {w.zone} Zone
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">Esc</kbd> to close</span>
              <span>Use <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">Ctrl+K</kbd> anywhere</span>
            </div>
            <span className="text-emerald-400 font-medium">SmartRoute AI Live Database</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
