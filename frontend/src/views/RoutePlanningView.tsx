import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { Depot, Vehicle, Report } from '../types';
import { Truck, Navigation, AlertCircle, Cpu, BarChart2 } from 'lucide-react';
import { NumberCountUp } from '../components/NumberCountUp';
import { defaultSpring } from '../lib/motion';

interface RoutePlanningViewProps {
  onRouteCreated?: (polyline: [number, number][]) => void;
}

export const RoutePlanningView: React.FC<RoutePlanningViewProps> = ({ onRouteCreated }) => {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pendingReports, setPendingReports] = useState<Report[]>([]);

  const [selectedDepotId, setSelectedDepotId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);

  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dList, vList, rList] = await Promise.all([
          api.getDepots(),
          api.getVehicles(),
          api.getReports({ status: 'verified' })
        ]);
        setDepots(dList);
        setVehicles(vList);
        setPendingReports(rList);

        if (dList.length > 0) setSelectedDepotId(dList[0].id);
        if (vList.length > 0) setSelectedVehicleId(vList[0].id);
        // Pre-select first 4 verified reports for rapid demo
        setSelectedReportIds(rList.slice(0, 4).map((r) => r.id));
      } catch (err: any) {
        setError(err.message || 'Failed to load routing data.');
      }
    };
    fetchData();
  }, []);

  const handleToggleReport = (id: number) => {
    setSelectedReportIds((prev) =>
      prev.includes(id) ? prev.filter((rId) => rId !== id) : [...prev, id]
    );
  };

  const handleRunOptimization = async () => {
    if (!selectedDepotId || !selectedVehicleId || selectedReportIds.length === 0) {
      setError('Please select a depot, a vehicle, and at least one pending incident.');
      return;
    }

    setError(null);
    setIsSolving(true);
    try {
      const res = await api.optimizeRoute(selectedDepotId, selectedVehicleId, selectedReportIds);
      setOptimizationResult(res);

      // Construct polyline coordinates for map
      if (res?.optimization?.ordered_stops) {
        const depot = depots.find((d) => d.id === selectedDepotId);
        const poly: [number, number][] = [];
        if (depot) poly.push([depot.lat, depot.lng]);
        res.optimization.ordered_stops.forEach((s: any) => poly.push([s.lat, s.lng]));
        if (depot) poly.push([depot.lat, depot.lng]);
        if (onRouteCreated) onRouteCreated(poly);
      }
    } catch (err: any) {
      setError(err.message || 'Route optimization failed.');
    } finally {
      setIsSolving(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // Compute percentages for comparison bars
  const baselineKm = optimizationResult?.optimization?.baseline?.distance_km || 1;
  const optimisedKm = optimizationResult?.optimization?.optimised?.distance_km || 1;
  const maxKm = Math.max(baselineKm, optimisedKm, 0.1);
  const baselinePercent = Math.min(100, Math.round((baselineKm / maxKm) * 100));
  const optimisedPercent = Math.min(100, Math.round((optimisedKm / maxKm) * 100));

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Capacitated Fleet Route Optimiser</h2>
        <p className="text-xs text-slate-500">
          Solves multi-point collection routes minimizing deadhead mileage, fuel burn, and turnaround time.
          Always records both baseline traversal and solver result.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Depot & Vehicle Selection */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-blue-600" />
            <span>1. Fleet & Depot Assignment</span>
          </h3>

          <div>
            <label className="block text-slate-600 mb-1">Departure & Return Depot Garage</label>
            <select
              value={selectedDepotId || ''}
              onChange={(e) => setSelectedDepotId(Number(e.target.value))}
              className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
            >
              {depots.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.capacity_vehicles} bays)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Municipal Vehicle & Driver</label>
            <select
              value={selectedVehicleId || ''}
              onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
              className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} — {v.vehicle_type} (Cap: {v.capacity_kg} kg, {v.fuel_type})
                </option>
              ))}
            </select>
          </div>

          {selectedVehicle && (
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1 text-[11px] text-slate-600">
              <div>Assigned Driver: <strong>{selectedVehicle.driver_name}</strong></div>
              <div>Fuel Class: <strong>{selectedVehicle.fuel_type}</strong></div>
              <div>Max Payload Limit: <strong>{selectedVehicle.capacity_kg} kg</strong></div>
            </div>
          )}
        </div>

        {/* Collection Incident Selection */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-emerald-600" />
              <span>2. Select Stops ({selectedReportIds.length} Selected)</span>
            </h3>
            <span className="text-[11px] text-slate-400">Verified complaints</span>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {pendingReports.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">No verified reports waiting for route planning.</div>
            ) : (
              pendingReports.map((r) => {
                const isChecked = selectedReportIds.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className="flex items-start space-x-2.5 p-2.5 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleReport(r.id)}
                      className="mt-0.5 rounded text-emerald-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">#{r.ticket_number}</span>
                        <span className="text-amber-700 font-bold">Priority: {r.priority_score}</span>
                      </div>
                      <p className="text-slate-600 line-clamp-1 text-[11px]">{r.description}</p>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <button
            onClick={handleRunOptimization}
            disabled={isSolving || selectedReportIds.length === 0}
            className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg transition disabled:opacity-60 flex items-center justify-center space-x-1.5 shadow-sm"
          >
            <Cpu className={`w-4 h-4 ${isSolving ? 'animate-spin' : ''}`} />
            <span>{isSolving ? 'Solving OR-Tools CVRP...' : 'Solve & Optimise Route'}</span>
          </button>
        </div>
      </div>

      {/* Optimization Results Panel */}
      <AnimatePresence>
        {optimizationResult && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm space-y-5 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Route Dispatched: #{optimizationResult.route_code}
                </h3>
                <p className="text-slate-500">Capacity-constrained collection sequence generated</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px]">
                  solver: {optimizationResult.optimization.solver_used}
                </span>
                <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px]">
                  matrix: {optimizationResult.optimization.routing_source}
                </span>
              </div>
            </div>

            {/* Baseline vs Optimised Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-slate-500 text-[11px] block">Baseline Distance</span>
                <strong className="text-lg text-slate-800 font-mono block mt-0.5">
                  <NumberCountUp value={optimizationResult.optimization.baseline.distance_km} decimals={2} suffix=" km" />
                </strong>
                <span className="text-[10px] text-slate-400 block">Sequential traversal</span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                <span className="text-emerald-700 text-[11px] block">Optimised Distance</span>
                <strong className="text-lg text-emerald-900 font-mono block mt-0.5">
                  <NumberCountUp value={optimizationResult.optimization.optimised.distance_km} decimals={2} suffix=" km" />
                </strong>
                <span className="text-[10px] text-emerald-600 block">CVRP solved path</span>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                <span className="text-amber-800 text-[11px] block">Mileage Saved</span>
                <strong className="text-lg text-amber-950 font-mono block mt-0.5">
                  <NumberCountUp value={optimizationResult.optimization.savings.distance_saved_km} decimals={2} suffix=" km" />
                </strong>
                <span className="text-[10px] text-amber-700 block">
                  <NumberCountUp value={optimizationResult.optimization.savings.efficiency_gain_percent} decimals={1} suffix="% reduction" />
                </span>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <span className="text-blue-700 text-[11px] block">Est. Time Saved</span>
                <strong className="text-lg text-blue-950 font-mono block mt-0.5">
                  <NumberCountUp value={optimizationResult.optimization.savings.time_saved_minutes} decimals={1} suffix=" min" />
                </strong>
                <span className="text-[10px] text-blue-600 block">Trip turnaround gain</span>
              </div>
            </div>

            {/* Animated Side-by-Side Comparison Bars */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-200">
                  <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Traversed Mileage Comparison (Baseline vs Solver)</span>
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                  {optimizationResult.optimization.savings.efficiency_gain_percent}% reduction
                </span>
              </div>

              {/* Baseline Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Baseline Sequential Route:</span>
                  <span className="font-mono">{optimizationResult.optimization.baseline.distance_km} km</span>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${baselinePercent}%` }}
                    transition={defaultSpring}
                    className="h-full bg-slate-500 rounded-full"
                  />
                </div>
              </div>

              {/* Optimised Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>OR-Tools CVRP Optimised Route:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{optimizationResult.optimization.optimised.distance_km} km</span>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${optimisedPercent}%` }}
                    transition={defaultSpring}
                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  />
                </div>
              </div>
            </div>

            {/* Ordered Itinerary */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Turn-by-Turn Collection Itinerary:</h4>
              <div className="space-y-1.5">
                {optimizationResult.optimization.ordered_stops.map((stop: any, idx: number) => (
                  <div
                    key={stop.report_id}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">#{stop.ticket_number}</span>
                      <span className="text-slate-600 capitalize">({stop.category.replace('_', ' ')})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-700">Payload: {stop.demand_kg} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
