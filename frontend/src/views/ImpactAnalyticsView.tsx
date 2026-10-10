import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { BarChart3, Info, AlertTriangle, ShieldCheck, Flame, Leaf, Fuel, IndianRupee } from 'lucide-react';

export const ImpactAnalyticsView: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImpact = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getImpact();
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch impact calculations.');
      } finally {
        setLoading(false);
      }
    };
    fetchImpact();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Environmental & Fiscal Impact Analytics</h2>
        <p className="text-xs text-slate-500">
          Quantified savings from combinatorial vehicle route optimization and circular recycling diversion.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && <div className="p-8 text-center text-xs text-slate-500">Calculating impact metrics...</div>}

      {data && (
        <div className="space-y-6 text-xs">
          {/* Headline Impact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <div className="flex items-center space-x-1.5 text-emerald-800 font-semibold mb-1">
                <Leaf className="w-4 h-4 text-emerald-600" />
                <span>CO₂ Avoided</span>
              </div>
              <strong className="text-2xl text-emerald-950 font-bold block">
                {data.impact.estimated_co2_avoided_kg} kg
              </strong>
              <span className="text-[10px] text-emerald-700 mt-1 block">Greenhouse gas reduction</span>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center space-x-1.5 text-blue-800 font-semibold mb-1">
                <Fuel className="w-4 h-4 text-blue-600" />
                <span>Fuel Conserved</span>
              </div>
              <strong className="text-2xl text-blue-950 font-bold block">
                {data.impact.estimated_fuel_saved_liters} Litres
              </strong>
              <span className="text-[10px] text-blue-700 mt-1 block">Municipal diesel equivalent</span>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
              <div className="flex items-center space-x-1.5 text-amber-800 font-semibold mb-1">
                <IndianRupee className="w-4 h-4 text-amber-600" />
                <span>Fuel Cost Saved</span>
              </div>
              <strong className="text-2xl text-amber-950 font-bold block">
                ₹{data.impact.estimated_fuel_expenditure_saved_inr}
              </strong>
              <span className="text-[10px] text-amber-700 mt-1 block">Direct fleet fuel budget</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-1.5 text-slate-800 font-semibold mb-1">
                <Flame className="w-4 h-4 text-orange-600" />
                <span>Landfill Diversion</span>
              </div>
              <strong className="text-2xl text-slate-900 font-bold block">
                {data.impact.total_material_diverted_from_landfill_kg} kg
              </strong>
              <span className="text-[10px] text-slate-500 mt-1 block">Recyclable recovery</span>
            </div>
          </div>

          {/* Non-Negotiable Honesty: Assumptions Panel */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Transparent Impact Assumptions Panel</h3>
                <p className="text-[11px] text-slate-500">
                  Every coefficient and scientific factor used in calculating the above metrics is explicitly documented.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border border-slate-200 rounded">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="p-2.5">Calculation Parameter</th>
                    <th className="p-2.5">Assumed Benchmark Value</th>
                    <th className="p-2.5">Scientific / Regulatory Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {data.assumptions_panel.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-medium text-slate-900">{row.parameter}</td>
                      <td className="p-2.5 font-mono text-emerald-800 font-semibold">{row.value}</td>
                      <td className="p-2.5 text-slate-600">{row.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
