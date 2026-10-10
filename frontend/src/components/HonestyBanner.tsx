import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, AlertCircle, Cpu, CloudRain, Truck, DollarSign } from 'lucide-react';

export const HonestyBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-950 text-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span className="font-semibold">Clean Bharat Honesty & Transparency Protocol:</span>
          <span className="hidden md:inline text-amber-800">
            All AI classifications, simulated IoT readings, and indicative prices are honestly disclosed.
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1 font-medium text-amber-800 hover:text-amber-900 underline focus:outline-none"
        >
          <span>{isOpen ? 'Hide Audit Disclosures' : 'View System Disclosures'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="max-w-7xl mx-auto px-4 pb-3 pt-1 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs border-t border-amber-200/60 mt-1">
          <div className="bg-white/80 p-2.5 rounded border border-amber-200">
            <div className="flex items-center space-x-1.5 font-semibold text-amber-900 mb-1">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>AI Classifier: rules_fallback</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Transparent keyword + category heuristics active. No fake deep-learning inference claims are made without loaded model weights.
            </p>
          </div>

          <div className="bg-white/80 p-2.5 rounded border border-amber-200">
            <div className="flex items-center space-x-1.5 font-semibold text-amber-900 mb-1">
              <Truck className="w-3.5 h-3.5 text-green-700" />
              <span>Routing: OSRM + 2-Opt</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Road network routing via OSRM table engine with geometric Haversine fallback. Traffic delays are never fabricated.
            </p>
          </div>

          <div className="bg-white/80 p-2.5 rounded border border-amber-200">
            <div className="flex items-center space-x-1.5 font-semibold text-amber-900 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
              <span>Smart Bins: Simulated</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Bin telemetry is flagged <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">simulated: true</code>. Ready for physical ESP32 microcontrollers via webhook.
            </p>
          </div>

          <div className="bg-white/80 p-2.5 rounded border border-amber-200">
            <div className="flex items-center space-x-1.5 font-semibold text-amber-900 mb-1">
              <CloudRain className="w-3.5 h-3.5 text-teal-600" />
              <span>Drain Risk: Estimate</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Vulnerability is estimated from repeat blockage frequency. Live rainfall feed requires an authentic API key.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
