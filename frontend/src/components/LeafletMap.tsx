import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Report, Bin, Depot } from '../types';
import { Map as MapIcon, List as ListIcon, AlertTriangle, Play, Square, Filter } from 'lucide-react';

interface LeafletMapProps {
  reports: Report[];
  bins: Bin[];
  depots: Depot[];
  onSelectReport?: (report: Report) => void;
  activeRoutePolyline?: [number, number][];
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  reports,
  bins,
  depots,
  onSelectReport,
  activeRoutePolyline
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const replayMarkerRef = useRef<L.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showBins, setShowBins] = useState<boolean>(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      try {
        const defaultCenter: [number, number] = [28.625, 77.21];
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 13,
          attributionControl: true
        });

        // Genuine OpenStreetMap tiles with legal attribution
        const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        tileLayer.on('tileerror', () => {
          setMapError('Map tile connection degraded; table view fallback is available.');
        });

        tileLayer.addTo(map);

        layersRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      } catch {
        setMapError('Failed to initialize Leaflet canvas. Switching to list fallback.');
        setViewMode('table');
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [viewMode]);

  // Route sequence replay
  const stopReplay = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (replayMarkerRef.current && layersRef.current) {
      layersRef.current.removeLayer(replayMarkerRef.current);
      replayMarkerRef.current = null;
    }
    setIsReplaying(false);
  }, []);

  const startReplay = useCallback(() => {
    if (!activeRoutePolyline || activeRoutePolyline.length < 2 || !mapInstanceRef.current || !layersRef.current) {
      return;
    }

    stopReplay();
    setIsReplaying(true);

    // Custom truck icon
    const truckIcon = L.divIcon({
      html: `
        <div style="background-color: #2563EB; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(37,99,235,0.7); border: 2px solid white; font-size: 14px;">
          🚛
        </div>
      `,
      className: 'truck-replay-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker(activeRoutePolyline[0], { icon: truckIcon });
    marker.bindTooltip('Route Replay (Simulated movement — not live GPS)', {
      permanent: true,
      direction: 'top',
      className: 'bg-slate-900 text-white text-[10px] px-1 py-0.5 rounded shadow'
    });
    layersRef.current.addLayer(marker);
    replayMarkerRef.current = marker;

    let segmentIdx = 0;
    let stepProgress = 0;
    const speed = 0.015; // interpolation step

    const animateStep = () => {
      if (segmentIdx >= activeRoutePolyline.length - 1) {
        // finished
        setIsReplaying(false);
        return;
      }

      stepProgress += speed;
      if (stepProgress >= 1) {
        stepProgress = 0;
        segmentIdx += 1;
      }

      if (segmentIdx < activeRoutePolyline.length - 1) {
        const start = activeRoutePolyline[segmentIdx];
        const end = activeRoutePolyline[segmentIdx + 1];
        const curLat = start[0] + (end[0] - start[0]) * stepProgress;
        const curLng = start[1] + (end[1] - start[1]) * stepProgress;
        marker.setLatLng([curLat, curLng]);
        animationFrameRef.current = requestAnimationFrame(animateStep);
      } else {
        setIsReplaying(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateStep);
  }, [activeRoutePolyline, stopReplay]);

  // Update Markers when data or filters change
  useEffect(() => {
    if (viewMode !== 'map' || !mapInstanceRef.current || !layersRef.current) return;

    layersRef.current.clearLayers();

    // 1. Plot Depots
    depots.forEach((d) => {
      const depotMarker = L.circleMarker([d.lat, d.lng], {
        radius: 10,
        fillColor: '#1E3A8A',
        color: '#FFFFFF',
        weight: 2,
        fillOpacity: 0.9
      });
      depotMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <strong style="color: #1E3A8A;">Depot: ${d.name}</strong><br/>
          Code: ${d.code}<br/>
          Fleet Capacity: ${d.capacity_vehicles} vehicles
        </div>
      `);
      layersRef.current?.addLayer(depotMarker);
    });

    // 2. Filter & Plot Reports
    const filteredReports = reports.filter((r) => {
      const matchCat = filterCategory === 'all' || r.category === filterCategory;
      const matchStat = filterStatus === 'all' || r.status === filterStatus;
      return matchCat && matchStat;
    });

    filteredReports.forEach((r) => {
      const isCritical = r.category === 'drain_clog' || r.priority_score > 10;
      let color = '#D97706'; // default amber
      if (r.status === 'resolved') color = '#047857'; // green
      else if (r.status === 'in_progress') color = '#2563EB'; // blue
      else if (isCritical) color = '#DC2626'; // red critical

      // Add a subtle pulsing halo for critical high-priority reports
      if (isCritical && r.status !== 'resolved') {
        const halo = L.circleMarker([r.lat, r.lng], {
          radius: 18,
          fillColor: '#DC2626',
          color: '#DC2626',
          weight: 1,
          fillOpacity: 0.25
        });
        layersRef.current?.addLayer(halo);
      }

      const marker = L.circleMarker([r.lat, r.lng], {
        radius: Math.min(14, Math.max(7, Math.round(r.priority_score * 0.8))),
        fillColor: color,
        color: '#FFFFFF',
        weight: 1.5,
        fillOpacity: 0.85
      });

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; min-width: 180px;">
          <div style="font-weight: bold; margin-bottom: 2px;">#${r.ticket_number} [${r.status.toUpperCase()}]</div>
          <div style="color: #4B5563; margin-bottom: 4px;">${r.category.replace('_', ' ')}</div>
          <div><strong>Priority Score:</strong> ${r.priority_score}</div>
          ${r.duplicate_count > 0 ? `<div style="color: #B45309;"><strong>Corroborations:</strong> ${r.duplicate_count}</div>` : ''}
          <div style="margin-top: 4px; font-size: 11px; color: #6B7280;">${r.address_text || 'GPS Location'}</div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([r.lat, r.lng], 15, { duration: 1.0 });
        }
        if (onSelectReport) onSelectReport(r);
      });

      layersRef.current?.addLayer(marker);
    });

    // 3. Plot Smart Bins
    if (showBins) {
      bins.forEach((b) => {
        const binColor = b.status === 'overflow' ? '#DC2626' : b.status === 'near_full' ? '#F59E0B' : '#10B981';
        const binMarker = L.circleMarker([b.lat, b.lng], {
          radius: 6,
          fillColor: binColor,
          color: '#1F2937',
          weight: 1,
          fillOpacity: 0.9
        });
        binMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <strong>Smart Bin: ${b.bin_code}</strong><br/>
            Type: ${b.bin_type}<br/>
            Fill Level: <strong>${b.fill_level_percent}%</strong> (${b.status})<br/>
            Telemetry: <span style="font-style: italic;">${b.simulated ? 'Simulated' : 'Hardware'}</span>
          </div>
        `);
        layersRef.current?.addLayer(binMarker);
      });
    }

    // 4. Plot Active Route Polyline if present
    if (activeRoutePolyline && activeRoutePolyline.length > 1) {
      const poly = L.polyline(activeRoutePolyline, {
        color: '#2563EB',
        weight: 4,
        dashArray: '5, 5'
      });
      layersRef.current?.addLayer(poly);
      // Fit map bounds to polyline
      mapInstanceRef.current.fitBounds(poly.getBounds(), { padding: [40, 40] });
    } else if (filteredReports.length > 0) {
      const bounds = L.latLngBounds(filteredReports.map((r) => [r.lat, r.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [reports, bins, depots, filterCategory, filterStatus, showBins, activeRoutePolyline, viewMode, onSelectReport]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Controls Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          {/* Category Filter */}
          <div className="flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
            >
              <option value="all">All Categories</option>
              <option value="garbage_dump">Garbage Dump</option>
              <option value="overflowing_bin">Overflowing Bin</option>
              <option value="drain_clog">Drain Clog</option>
              <option value="plastic_waste">Plastic Waste</option>
              <option value="hazardous_waste">Hazardous Waste</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="verified">Verified</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Smart Bins Toggle */}
          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-600 ml-2">
            <input
              type="checkbox"
              checked={showBins}
              onChange={(e) => setShowBins(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-0"
            />
            <span>Show Smart Bins ({bins.length})</span>
          </label>
        </div>

        {/* View Mode Toggle and Replay Trigger */}
        <div className="flex items-center space-x-2">
          {activeRoutePolyline && activeRoutePolyline.length > 1 && viewMode === 'map' && (
            <button
              onClick={isReplaying ? stopReplay : startReplay}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                isReplaying
                  ? 'bg-rose-600 text-white shadow'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
              }`}
              title="Animated vehicle replay on optimized route (Honest label: simulated replay)"
            >
              {isReplaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isReplaying ? 'Stop Replay' : 'Replay Route'}</span>
            </button>
          )}

          <div className="flex items-center space-x-1 bg-slate-200 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                viewMode === 'map' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>Table Fallback</span>
            </button>
          </div>
        </div>
      </div>

      {mapError && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-xs text-amber-800 flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>{mapError}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 relative min-h-[460px]">
        {viewMode === 'map' ? (
          <div ref={mapContainerRef} className="w-full h-full min-h-[460px] z-10" />
        ) : (
          /* Accessible Table Fallback */
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-xs border border-slate-200 rounded">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Ticket</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Priority</th>
                  <th className="p-2.5">Location</th>
                  <th className="p-2.5">Corroborations</th>
                  <th className="p-2.5">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => onSelectReport && onSelectReport(r)}
                  >
                    <td className="p-2.5 font-medium text-slate-900">#{r.ticket_number}</td>
                    <td className="p-2.5 capitalize">{r.category.replace('_', ' ')}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          r.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold text-slate-800">{r.priority_score}</td>
                    <td className="p-2.5 text-slate-600">{r.address_text || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}</td>
                    <td className="p-2.5">{r.duplicate_count}</td>
                    <td className="p-2.5 text-slate-500 font-mono text-[10px]">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
            <span>Critical / Drain Obstruction (Pulsing halo)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Pending Incident</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span>Assigned / On Route</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span>Resolved</span>
          </span>
        </div>
        <div className="text-slate-400">Map tiles &copy; OpenStreetMap contributors</div>
      </div>
    </div>
  );
};
