import React, { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../api/client';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Database, ShieldCheck } from 'lucide-react';

interface TransparencyAudit {
  ai_classifier_source: string;
  routing_matrix_fallback: string;
  weather_provider: string;
  llm_provider: string;
  hardware_iot: string;
}

interface HealthData {
  status: string;
  version?: string;
  database?: string;
  service?: string;
  timestamp?: string;
  transparency_audit?: TransparencyAudit;
}

export const HealthStatusBadge: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 5-second timeout via AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const startTime = performance.now();
      const res = await apiClient.get<HealthData>('/health', { signal: controller.signal });
      clearTimeout(timeoutId);
      const pingMs = Math.round(performance.now() - startTime);

      setHealth(res.data);
      setLastChecked(new Date());
      setError(null);
      window.dispatchEvent(new CustomEvent('cleanbharat:connection', { detail: { isOnline: true, latency: pingMs } }));
    } catch (err: any) {
      const msg = err?.message || 'Connection refused or timed out';
      setError(msg);
      setLastChecked(new Date());
      window.dispatchEvent(new CustomEvent('cleanbharat:connection', { detail: { isOnline: false, error: msg } }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Determine state
  const isOnline = !error && (health?.status === 'healthy' || health?.status === 'ok') && health?.database === 'connected';
  const isDegraded = !error && (health?.status === 'degraded' || (health?.database && health?.database !== 'connected'));
  const isOffline = !!error || (!loading && !health);

  let stateLabel = 'Checking...';
  let badgeClass = 'border-slate-700 bg-slate-900/80 text-slate-400';
  let dotClass = 'bg-slate-400';

  if (isOnline) {
    stateLabel = 'Online';
    badgeClass = 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:border-emerald-500';
    dotClass = 'bg-emerald-400';
  } else if (isDegraded) {
    stateLabel = 'Degraded';
    badgeClass = 'border-amber-500/40 bg-amber-950/40 text-amber-300 hover:border-amber-500';
    dotClass = 'bg-amber-400';
  } else if (isOffline) {
    stateLabel = 'Offline';
    badgeClass = 'border-rose-500/40 bg-rose-950/40 text-rose-300 hover:border-rose-500';
    dotClass = 'bg-rose-400';
  }

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowDetails(false);
      }
    };
    if (showDetails) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDetails]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center space-x-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${badgeClass}`}
        title={`Backend Telemetry: ${stateLabel} (Click to inspect or retry)`}
      >
        <span className="relative flex h-2 w-2">
          {isOnline && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${dotClass}`} />
        </span>
        <span className="font-mono text-[11px] font-semibold">{stateLabel}</span>
        {lastChecked && (
          <span className="text-[10px] opacity-60 hidden sm:inline">
            {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-slate-700 bg-slate-950 p-3.5 shadow-2xl backdrop-blur text-xs text-slate-200 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-indigo-400" />
              <span>Platform Health & Provenance</span>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchHealth();
              }}
              disabled={loading}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              title="Poll health again"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          <div className="mt-2.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Core Service:</span>
              <span className="font-medium flex items-center gap-1">
                {isOnline ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                ) : isDegraded ? (
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                ) : (
                  <XCircle className="h-3 w-3 text-rose-400" />
                )}
                <span className={isOnline ? 'text-emerald-400' : isDegraded ? 'text-amber-400' : 'text-rose-400'}>
                  {stateLabel}
                </span>
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Database:</span>
              <span className="font-mono text-slate-200 flex items-center gap-1">
                <Database className="h-3 w-3 text-slate-400" />
                <span>{health?.database || (error ? 'disconnected' : 'connecting...')}</span>
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Version:</span>
              <span className="font-mono text-slate-200">v{health?.version || '1.0.0'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Last Checked:</span>
              <span className="text-slate-300">
                {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}
              </span>
            </div>
          </div>

          {/* Transparency Subsystem Telemetry */}
          {health?.transparency_audit && (
            <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span>Active Provenance Modes</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                <div className="bg-slate-900/80 px-2 py-1 rounded">
                  <span className="text-slate-500 block">AI Classifier:</span>
                  <span className="font-mono text-amber-300">{health.transparency_audit.ai_classifier_source}</span>
                </div>
                <div className="bg-slate-900/80 px-2 py-1 rounded">
                  <span className="text-slate-500 block">Routing Matrix:</span>
                  <span className="font-mono text-indigo-300">{health.transparency_audit.routing_matrix_fallback}</span>
                </div>
                <div className="bg-slate-900/80 px-2 py-1 rounded">
                  <span className="text-slate-500 block">Weather Provider:</span>
                  <span className="font-mono text-slate-300">{health.transparency_audit.weather_provider}</span>
                </div>
                <div className="bg-slate-900/80 px-2 py-1 rounded">
                  <span className="text-slate-500 block">Hardware IoT:</span>
                  <span className="font-mono text-slate-300">{health.transparency_audit.hardware_iot}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-2.5 p-2 rounded bg-rose-950/60 border border-rose-500/30 text-[11px] text-rose-300">
              {error}
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
            <span>Endpoint: <code>/api/health</code></span>
            <button
              onClick={() => fetchHealth()}
              className="text-indigo-400 hover:text-indigo-300 font-medium underline"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
