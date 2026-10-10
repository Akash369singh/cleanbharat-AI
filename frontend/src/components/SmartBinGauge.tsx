import React from 'react';
import { motion } from 'framer-motion';
import { Battery, Wifi, AlertTriangle, Trash2 } from 'lucide-react';
import { defaultSpring } from '../lib/motion';

interface SmartBinGaugeProps {
  binCode: string;
  fillLevel: number; // 0 to 100
  batteryLevel?: number; // 0 to 100
  status?: string;
  lastReadingAt?: string;
  locationName?: string;
  className?: string;
}

export const SmartBinGauge: React.FC<SmartBinGaugeProps> = ({
  binCode,
  fillLevel,
  batteryLevel = 92,
  status = 'active',
  lastReadingAt,
  locationName,
  className = '',
}) => {
  const clampedFill = Math.min(100, Math.max(0, fillLevel));

  // Determine fill color
  let fillColor = 'bg-emerald-500';
  let textColor = 'text-emerald-400';
  let borderColor = 'border-emerald-500/30';
  let statusText = 'Normal';

  if (clampedFill >= 85) {
    fillColor = 'bg-rose-500';
    textColor = 'text-rose-400';
    borderColor = 'border-rose-500/40';
    statusText = 'Overflow / Critical';
  } else if (clampedFill >= 65) {
    fillColor = 'bg-amber-500';
    textColor = 'text-amber-400';
    borderColor = 'border-amber-500/30';
    statusText = 'Needs Collection Soon';
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-slate-900/90 p-4 backdrop-blur shadow-md ${borderColor} ${className}`}>
      {/* Honesty Badge: SIMULATED */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Trash2 className="h-4 w-4 text-slate-400" />
          <span className="font-mono text-sm font-semibold text-slate-200">{binCode}</span>
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-400 border border-amber-500/20">
          SIMULATED IOT
        </span>
      </div>

      {locationName && (
        <p className="mt-1.5 text-xs text-slate-400 truncate">{locationName}</p>
      )}

      {/* Main Gauge Graphic */}
      <div className="mt-4 flex items-center space-x-4">
        {/* Physical bin container */}
        <div className="relative h-24 w-16 rounded-b-lg border-2 border-slate-600 bg-slate-800 overflow-hidden flex flex-col justify-end">
          {/* Fill level animation */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${clampedFill}%` }}
            transition={defaultSpring}
            className={`w-full ${fillColor} transition-colors`}
          />
          {/* Tick lines on the bin */}
          <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none opacity-30">
            <div className="border-b border-slate-300 w-full" />
            <div className="border-b border-slate-300 w-full" />
            <div className="border-b border-slate-300 w-full" />
          </div>
        </div>

        {/* Level metrics */}
        <div className="flex-1">
          <div className="flex items-baseline space-x-1">
            <span className={`text-2xl font-bold font-mono ${textColor}`}>{clampedFill}%</span>
            <span className="text-xs text-slate-400">capacity</span>
          </div>
          <p className="text-xs font-medium text-slate-300 mt-0.5">{statusText}</p>

          {/* Telemetry info */}
          <div className="mt-3 flex items-center space-x-4 text-xs text-slate-400">
            <span className="flex items-center space-x-1">
              <Battery className="h-3.5 w-3.5 text-slate-500" />
              <span>{batteryLevel}%</span>
            </span>
            <span className="flex items-center space-x-1">
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              <span>Online</span>
            </span>
          </div>
        </div>
      </div>

      {lastReadingAt && (
        <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-800/80 pt-2 flex items-center justify-between">
          <span>Last ping: {new Date(lastReadingAt).toLocaleTimeString()}</span>
          {clampedFill >= 85 && (
            <span className="flex items-center text-rose-400 font-medium space-x-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Auto-dispatch triggered</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
