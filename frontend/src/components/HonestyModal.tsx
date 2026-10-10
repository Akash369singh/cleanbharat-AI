import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Cpu, Truck, AlertCircle, CloudRain, CheckCircle2, Info, ExternalLink } from 'lucide-react';

interface HonestyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HonestyModal: React.FC<HonestyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90dvh] flex flex-col text-left text-white overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Clean Bharat Honesty & Transparency Protocol
                </h3>
                <p className="text-[11px] text-slate-400">
                  Full disclosure of real data, models, simulations, and heuristics
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-200 text-[11px] leading-relaxed">
              <strong>Non-Negotiable Honesty Guarantee:</strong> This platform never fabricates impact metrics, live traffic, GPS, market scrap prices, rainfall, or AI inference. Every output is explicitly tagged with its provenance.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Disclosure 1 */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>AI Waste Classifier</span>
                </div>
                <div className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 w-fit">
                  Source: rules_fallback
                </div>
                <p className="text-slate-300 text-[11px] leading-snug">
                  Operates via transparent keyword and multi-category heuristics. No unverified neural network weights are claimed without verified runtime inference.
                </p>
              </div>

              {/* Disclosure 2 */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 space-y-1.5">
                <div className="flex items-center space-x-2 text-blue-400 font-bold">
                  <Truck className="w-4 h-4" />
                  <span>Route Optimisation</span>
                </div>
                <div className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 w-fit">
                  Real Solver + Baseline
                </div>
                <p className="text-slate-300 text-[11px] leading-snug">
                  Solves Capacitated Vehicle Routing (CVRP) with Google OR-Tools and calibrated 2-opt. Baseline vs optimised distance and fuel are persisted and audited.
                </p>
              </div>

              {/* Disclosure 3 */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 space-y-1.5">
                <div className="flex items-center space-x-2 text-purple-400 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>IoT Smart Bins</span>
                </div>
                <div className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 w-fit">
                  simulated: true
                </div>
                <p className="text-slate-300 text-[11px] leading-snug">
                  Bin telemetry is generated via an ultrasonic sensor drift model clearly badged <code className="text-purple-300 font-mono">SIMULATED</code>. Authentic webhook endpoint provided for physical ESP32 devices.
                </p>
              </div>

              {/* Disclosure 4 */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 space-y-1.5">
                <div className="flex items-center space-x-2 text-teal-400 font-bold">
                  <CloudRain className="w-4 h-4" />
                  <span>DrainGuard Flood Risk</span>
                </div>
                <div className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 w-fit">
                  Spatial Density Index
                </div>
                <p className="text-slate-300 text-[11px] leading-snug">
                  Drain risk is an engineering index computed from repeat culvert blockages. Live precipitation is marked "not configured" unless a real weather API key is provided.
                </p>
              </div>
            </div>

            {/* Verification of Seed Data */}
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">Municipal Database Seed Audit</div>
                <div className="text-[11px] text-slate-400">180 synthetic reports across 8 Delhi wards carry explicit <span className="text-purple-300 font-mono">DEMO DATA</span> tags.</div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400">
            <span>Verified in accordance with Hackathon 2026 Integrity Guidelines</span>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition"
            >
              Understood
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const HonestyChip: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition cursor-pointer"
      title="View Honesty & Transparency Disclosures"
    >
      <Info className="w-3.5 h-3.5 text-amber-400" />
      <span className="hidden sm:inline">What's real vs simulated</span>
      <span className="sm:hidden">Disclosures</span>
    </button>
  );
};
