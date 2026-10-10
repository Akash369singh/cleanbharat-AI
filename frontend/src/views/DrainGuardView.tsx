import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { Droplets, CloudRain, AlertTriangle, RefreshCw, Cpu, Play } from 'lucide-react';
import { SmartBinGauge } from '../components/SmartBinGauge';
import { SkeletonMetricCard, SkeletonCard } from '../components/SkeletonLoader';

export const DrainGuardView: React.FC = () => {
  const [hotspotsData, setHotspotsData] = useState<any | null>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [bins, setBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hData, iData, bData] = await Promise.all([
        api.getDrainHotspots(),
        api.getDrainInspections(),
        api.getBins()
      ]);
      setHotspotsData(hData);
      setInspections(iData);
      setBins(bData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch DrainGuard & IoT intelligence.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateTelemetry = async () => {
    try {
      setSimulating(true);
      await api.simulateBins();
      const updatedBins = await api.getBins();
      setBins(updatedBins);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger simulated bin readings.');
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">DrainGuard & IoT Municipal Telemetry</h2>
          <p className="text-xs text-slate-500">
            Track 4: Monsoon Drain Maintenance & Track 6: Ultrasonic Smart Bin Telemetry (Clearly labeled simulated)
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center space-x-1 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Honest Weather Provider Disclosure */}
      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start space-x-3">
        <CloudRain className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-bold">
            Rainfall Feed Integration Status:{' '}
            <span className="font-mono uppercase text-blue-800">
              {hotspotsData?.rainfall_integration?.status || 'not configured'}
            </span>
          </div>
          <p className="text-blue-800/80 mt-0.5">
            {hotspotsData?.rainfall_integration?.disclosure ||
              'Rainfall integration requires WEATHER_API_KEY. Risk indices shown are estimates calculated from historical blockage frequency.'}
          </p>
        </div>
      </div>

      {/* Track 6: Smart Bins Hardware Simulator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span>Track 6: IoT Ultrasonic Smart Bins Simulator ({bins.length} Active Nodes)</span>
          </h3>
          <button
            onClick={handleSimulateTelemetry}
            disabled={simulating}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold shadow-sm disabled:opacity-50 transition"
          >
            <Play className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
            <span>Trigger Next Telemetry Ping</span>
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonMetricCard />
            <SkeletonMetricCard />
            <SkeletonMetricCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bins.map((bin) => (
              <SmartBinGauge
                key={bin.id}
                binCode={bin.bin_code}
                fillLevel={bin.fill_level_percent}
                batteryLevel={bin.battery_level}
                status={bin.status}
                lastReadingAt={bin.last_reading_at}
                locationName={bin.address || `Ward 12 (Lat: ${bin.lat?.toFixed(3)}, Lng: ${bin.lng?.toFixed(3)})`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hotspots Grid */}
      {hotspotsData && (
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-cyan-600" />
            <span>Track 4: High Vulnerability Repeat Drain Hotspots ({hotspotsData.hotspots_count})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hotspotsData.hotspots.map((spot: any, idx: number) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{spot.ward_name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        spot.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {spot.severity}
                    </span>
                  </div>
                  <span className="font-bold text-slate-700">{spot.incident_count} Incidents Reported</span>
                </div>

                <div className="text-slate-600">
                  <strong>Risk Assessment:</strong>{' '}
                  <span className="text-amber-800 font-medium">{spot.risk_estimate}</span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                  <strong className="block text-slate-800 mb-0.5">Recommended Action:</strong>
                  {spot.recommended_action}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Cell: ({spot.cell_lat}, {spot.cell_lng})</span>
                  <span>Reports: {spot.sample_reports?.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preventive Inspection Queue */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 text-sm">Scheduled Culvert & Drain Maintenance Queue</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border border-slate-200 rounded">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Drain Location / Code</th>
                <th className="p-2.5">Ward</th>
                <th className="p-2.5">Obstruction</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Recommended Action</th>
                <th className="p-2.5">Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inspections.map((insp) => (
                <tr key={insp.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-medium text-slate-900">{insp.drain_code_or_landmark}</td>
                  <td className="p-2.5">{insp.ward_name}</td>
                  <td className="p-2.5 capitalize font-semibold text-amber-700">{insp.obstruction_level}</td>
                  <td className="p-2.5 capitalize">{insp.inspection_status}</td>
                  <td className="p-2.5 text-slate-600">{insp.recommended_action}</td>
                  <td className="p-2.5 text-slate-600">{insp.inspector_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
