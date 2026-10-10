import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.heat';

import { api } from '../api/client';
import { Report, Bin, Depot } from '../types';
import { NumberCountUp } from '../components/NumberCountUp';
import { ReportDetailDrawer } from '../components/ReportDetailDrawer';
import {
  Layers,
  Compass,
  Filter,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  Map as MapIcon,
  Database,
  AlertTriangle
} from 'lucide-react';

interface CommandCenterHomeViewProps {
  onNavigateTab: (tab: string) => void;
  selectedReportIdProp?: number | null;
}

export type BasemapStyle = 'standard' | 'dark' | 'terrain' | 'satellite';

// Sparkline SVG helper (only rendered on screens >= 640px)
const MiniSparkline: React.FC<{ data: number[]; color?: string }> = ({ data, color = '#F59E0B' }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 48;
  const height = 16;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0 hidden sm:block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const CommandCenterHomeView: React.FC<CommandCenterHomeViewProps> = ({
  onNavigateTab,
  selectedReportIdProp
}) => {
  // Data states
  const [kpis, setKpis] = useState<any | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [wardsGeojson, setWardsGeojson] = useState<any | null>(null);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Progressive disclosure & layout controls
  const [showAllKpis, setShowAllKpis] = useState(false);
  const [displayMode, setDisplayMode] = useState<'map' | 'table'>('map');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showLayerDropdown, setShowLayerDropdown] = useState(false);

  // Filter & interaction states
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Map layer controls
  const [layerReports, setLayerReports] = useState(true);
  const [layerClustering, setLayerClustering] = useState(true);
  const [layerHeatmap, setLayerHeatmap] = useState(false);
  const [layerBins, setLayerBins] = useState(true);
  const [layerWards, setLayerWards] = useState(true);

  // Free Basemap selection (Standard, Dark, Terrain, Satellite)
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyle>(() => {
    return (localStorage.getItem('cleanbharat_basemap') as BasemapStyle) || 'standard';
  });
  const [isOfflineView, setIsOfflineView] = useState(false);
  const [tileErrorCount, setTileErrorCount] = useState(0);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const clusterGroupRef = useRef<any>(null);
  const normalMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<any>(null);
  const binsLayerRef = useRef<L.LayerGroup | null>(null);
  const wardsGeoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const depotsLayerRef = useRef<L.LayerGroup | null>(null);

  // Load Data
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiRes, repRes, binRes, depRes, geoRes, actRes] = await Promise.all([
        api.getKpiSummary().catch(() => null),
        api.getReports().catch(() => []),
        api.getBins().catch(() => []),
        api.getDepots().catch(() => []),
        api.getWardsGeojson().catch(() => null),
        api.getActivityFeed(20).catch(() => [])
      ]);
      setKpis(kpiRes);
      setReports(repRes || []);
      setBins(binRes || []);
      setDepots(depRes || []);
      setWardsGeojson(geoRes);
      setActivityFeed(actRes || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle Seed Demo Data
  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await api.seedData();
      await loadInitialData();
    } catch {
      // ignore
    } finally {
      setSeeding(false);
    }
  };

  // Sync prop selection if provided by Command Palette
  useEffect(() => {
    if (selectedReportIdProp && reports.length > 0) {
      const matched = reports.find((r) => r.id === selectedReportIdProp);
      if (matched) {
        setSelectedReport(matched);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([matched.lat, matched.lng], 16, { duration: 0.8 });
        }
      }
    }
  }, [selectedReportIdProp, reports]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [28.625, 77.21],
        zoom: 12,
        zoomControl: true,
        attributionControl: true
      });

      // Marker Cluster Group
      const clusterGroup = (L as any).markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 40,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div class="bg-amber-600/90 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-lg text-xs font-mono">${count}</div>`,
            className: 'custom-cluster-icon',
            iconSize: [32, 32]
          });
        }
      });
      clusterGroup.addTo(map);
      clusterGroupRef.current = clusterGroup;

      normalMarkersLayerRef.current = L.layerGroup().addTo(map);
      binsLayerRef.current = L.layerGroup().addTo(map);
      depotsLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    } catch {
      // Leaflet initialization fallback handled
    }
  }, []);

  // Update Basemap Provider (Free, No API Keys)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (baseTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }

    const container = mapContainerRef.current;
    if (container) {
      if (basemapStyle === 'dark') {
        container.classList.add('leaflet-dark-tiles');
      } else {
        container.classList.remove('leaflet-dark-tiles');
      }
    }

    let tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    let maxZoom = 19;
    let subdomains: string[] | undefined = undefined;

    if (basemapStyle === 'terrain') {
      tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> &copy; OpenStreetMap';
      maxZoom = 17;
      subdomains = ['a', 'b', 'c'];
    } else if (basemapStyle === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS';
      maxZoom = 19;
    }

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom,
      attribution,
      subdomains: subdomains || 'abc'
    });

    tileLayer.on('tileerror', () => {
      setTileErrorCount((cnt) => {
        const next = cnt + 1;
        if (next >= 4) {
          setIsOfflineView(true);
        }
        return next;
      });
    });

    tileLayer.addTo(mapInstanceRef.current);
    baseTileLayerRef.current = tileLayer;

    localStorage.setItem('cleanbharat_basemap', basemapStyle);
  }, [basemapStyle]);

  // FitBounds Helper with padding
  const handleResetView = useCallback(() => {
    if (!mapInstanceRef.current) return;
    if (reports.length > 0) {
      const bounds = L.latLngBounds(reports.map((r) => [r.lat, r.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else {
      mapInstanceRef.current.setView([28.625, 77.21], 12);
    }
  }, [reports]);

  // Render GeoJSON Ward Choropleth Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (wardsGeoJsonLayerRef.current) {
      mapInstanceRef.current.removeLayer(wardsGeoJsonLayerRef.current);
      wardsGeoJsonLayerRef.current = null;
    }

    if (layerWards && wardsGeojson) {
      const geoLayer = L.geoJSON(wardsGeojson, {
        style: (feature: any) => ({
          fillColor: feature?.properties?.fill_color || '#3B82F6',
          weight: 1.5,
          opacity: 0.8,
          color: '#FFFFFF',
          dashArray: '3',
          fillOpacity: 0.25
        }),
        onEachFeature: (feature, layer) => {
          const p = feature.properties;
          layer.bindTooltip(`
            <div style="font-family: sans-serif; font-size: 11px;">
              <strong>${p.name} (${p.code})</strong><br/>
              Open Reports: <strong style="color: #F59E0B;">${p.open_reports}</strong> / Total: ${p.total_reports}
            </div>
          `, { sticky: true });
        }
      });

      geoLayer.addTo(mapInstanceRef.current);
      wardsGeoJsonLayerRef.current = geoLayer;
    }
  }, [layerWards, wardsGeojson]);

  // Render Depots
  useEffect(() => {
    if (!depotsLayerRef.current) return;
    depotsLayerRef.current.clearLayers();

    depots.forEach((d) => {
      const marker = L.circleMarker([d.lat, d.lng], {
        radius: 8,
        fillColor: '#2563EB',
        color: '#FFFFFF',
        weight: 2,
        fillOpacity: 0.95
      });
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 11px;">
          <strong style="color: #2563EB;">Depot: ${d.name}</strong><br/>
          Fleet Capacity: ${d.capacity_vehicles} vehicles
        </div>
      `);
      depotsLayerRef.current?.addLayer(marker);
    });
  }, [depots]);

  // Render Smart Bins
  useEffect(() => {
    if (!binsLayerRef.current) return;
    binsLayerRef.current.clearLayers();

    if (layerBins) {
      bins.forEach((b) => {
        const binColor = b.status === 'overflow' ? '#EF4444' : b.status === 'near_full' ? '#F59E0B' : '#10B981';
        const binMarker = L.circleMarker([b.lat, b.lng], {
          radius: 6,
          fillColor: binColor,
          color: '#1E293B',
          weight: 1.5,
          fillOpacity: 0.9
        });
        binMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px;">
            <strong>Smart Bin: ${b.bin_code}</strong><br/>
            Fill Level: <strong>${b.fill_level_percent}%</strong> (${b.status})<br/>
            Telemetry: <span style="font-style: italic; color: #8B5CF6;">SIMULATED</span>
          </div>
        `);
        binsLayerRef.current?.addLayer(binMarker);
      });
    }
  }, [bins, layerBins]);

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const matchesCat = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesStat = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      !searchFilter ||
      r.ticket_number.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (r.address_text && r.address_text.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchesCat && matchesStat && matchesSearch;
  });

  // Render Reports, Clustering & Heatmap
  useEffect(() => {
    if (!mapInstanceRef.current || !clusterGroupRef.current || !normalMarkersLayerRef.current) return;

    clusterGroupRef.current.clearLayers();
    normalMarkersLayerRef.current.clearLayers();

    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!layerReports) return;

    // 1. Heatmap layer
    if (layerHeatmap) {
      const heatPoints = filteredReports.map((r) => [r.lat, r.lng, Math.min(1.0, r.priority_score / 15)]);
      const heat = (L as any).heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 15,
        gradient: { 0.2: '#3B82F6', 0.5: '#10B981', 0.8: '#F59E0B', 1.0: '#EF4444' }
      });
      heat.addTo(mapInstanceRef.current);
      heatLayerRef.current = heat;
    }

    // 2. Report Markers
    const markers: L.CircleMarker[] = [];

    filteredReports.forEach((r) => {
      const isCritical = r.category === 'drain_clog' || r.priority_score >= 12;
      let color = '#F59E0B'; // default amber
      if (r.status === 'resolved') color = '#10B981';
      else if (r.status === 'in_progress') color = '#3B82F6';
      else if (isCritical) color = '#EF4444';

      const radius = Math.min(12, Math.max(6, Math.round(r.priority_score * 0.75)));
      const marker = L.circleMarker([r.lat, r.lng], {
        radius,
        fillColor: color,
        color: '#FFFFFF',
        weight: 1.5,
        fillOpacity: 0.85
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 11px; min-width: 160px;">
          <strong>#${r.ticket_number}</strong> [${r.status.toUpperCase()}]<br/>
          Category: <strong>${r.category.replace('_', ' ')}</strong><br/>
          Priority: <strong style="color: #D97706;">${r.priority_score.toFixed(1)}</strong><br/>
          <div style="margin-top: 3px; font-size: 10px; color: #64748B;">${r.address_text || 'GPS Location'}</div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedReport(r);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([r.lat, r.lng], 15, { duration: 0.7 });
        }
      });

      markers.push(marker);
    });

    if (layerClustering) {
      clusterGroupRef.current.addLayers(markers);
    } else {
      markers.forEach((m) => normalMarkersLayerRef.current?.addLayer(m));
    }
  }, [filteredReports, layerReports, layerClustering, layerHeatmap]);

  // FitBounds on initial loaded markers
  const hasFitInitialBounds = useRef(false);
  useEffect(() => {
    if (!hasFitInitialBounds.current && reports.length > 0 && mapInstanceRef.current) {
      handleResetView();
      hasFitInitialBounds.current = true;
    }
  }, [reports, handleResetView]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-950 text-white select-none">
      {/* 1. TOP RESPONSIVE KPI GRID (2 cols on mobile, 4 on desktop, no clipping) */}
      <section className="bg-slate-900 border-b border-slate-800 p-2.5 md:p-3 flex-shrink-0">
        <div className="max-w-7xl mx-auto space-y-2">
          {/* Primary 4 KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {/* KPI 1: Open Reports */}
            <div
              className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-left flex items-center justify-between"
              title={kpis?.open_reports?.tooltip || 'Open municipal reports awaiting action'}
            >
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Open Reports</div>
                <div className="text-base md:text-lg font-mono font-bold text-amber-400">
                  <NumberCountUp value={kpis?.open_reports?.value ?? 0} />
                </div>
              </div>
              <MiniSparkline data={kpis?.open_reports?.sparkline || [10, 12, 14, 15, 17, 19, 21]} color="#F59E0B" />
            </div>

            {/* KPI 2: Critical Open */}
            <div
              className="p-2.5 rounded-xl bg-red-950/30 border border-red-800/50 text-left flex items-center justify-between"
              title={kpis?.critical_open?.tooltip || 'Open reports with priority score >= 12 or drain clogs'}
            >
              <div>
                <div className="text-[10px] uppercase font-bold text-red-300">Critical Open</div>
                <div className="text-base md:text-lg font-mono font-bold text-red-400">
                  <NumberCountUp value={kpis?.critical_open?.value ?? 0} />
                </div>
              </div>
              <MiniSparkline data={kpis?.critical_open?.sparkline || [4, 5, 6, 5, 7, 8, 9]} color="#EF4444" />
            </div>

            {/* KPI 3: Overdue SLA */}
            <div
              className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/50 text-left flex items-center justify-between"
              title={kpis?.overdue_sla?.tooltip || 'Reports exceeding mandated resolution SLA timestamp'}
            >
              <div>
                <div className="text-[10px] uppercase font-bold text-rose-300">Overdue SLA</div>
                <div className="text-base md:text-lg font-mono font-bold text-rose-400">
                  <NumberCountUp value={kpis?.overdue_sla?.value ?? 0} />
                </div>
              </div>
              <MiniSparkline data={kpis?.overdue_sla?.sparkline || [2, 3, 2, 4, 3, 5, 4]} color="#F43F5E" />
            </div>

            {/* KPI 4: Resolved 7d */}
            <div
              className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-left flex items-center justify-between"
              title={kpis?.resolved_7d?.tooltip || 'Reports verified and resolved in the last 7 calendar days'}
            >
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-300">Resolved (7d)</div>
                <div className="text-base md:text-lg font-mono font-bold text-emerald-400">
                  <NumberCountUp value={kpis?.resolved_7d?.value ?? 0} />
                </div>
              </div>
              <MiniSparkline data={kpis?.resolved_7d?.sparkline || [15, 18, 22, 25, 29, 32, 38]} color="#10B981" />
            </div>
          </div>

          {/* Expandable Secondary 6 KPIs Grid */}
          <AnimatePresence>
            {showAllKpis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-slate-800"
              >
                {/* Secondary KPI 1: Mean Resolution */}
                <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/40 text-left">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Mean Resolution</div>
                  <div className="text-sm font-mono font-bold text-blue-400">
                    <NumberCountUp value={kpis?.mean_resolution_hours?.value ?? 0} decimals={1} />
                    <span className="text-[10px] font-normal text-slate-400 ml-1">hrs</span>
                  </div>
                </div>

                {/* Secondary KPI 2: Active Routes */}
                <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/40 text-left">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Active Routes</div>
                  <div className="text-sm font-mono font-bold text-purple-400">
                    <NumberCountUp value={kpis?.active_routes?.value ?? 0} />
                  </div>
                </div>

                {/* Secondary KPI 3: Bins Above Threshold (SIMULATED) */}
                <div className="p-2 rounded-lg bg-purple-950/25 border border-purple-800/40 text-left">
                  <div className="text-[9px] uppercase font-bold text-purple-300 flex items-center gap-1">
                    <span>Overflow Bins</span>
                    <span className="text-[8px] bg-purple-900/80 px-1 py-0.2 rounded font-bold">SIM</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-purple-300">
                    <NumberCountUp value={kpis?.bins_above_threshold?.value ?? 0} />
                  </div>
                </div>

                {/* Secondary KPI 4: Recyclables Listed */}
                <div className="p-2 rounded-lg bg-teal-950/25 border border-teal-800/40 text-left">
                  <div className="text-[9px] uppercase font-bold text-teal-300">Recycled</div>
                  <div className="text-sm font-mono font-bold text-teal-400">
                    <NumberCountUp value={kpis?.recyclables_listed_kg?.value ?? 0} decimals={0} />
                    <span className="text-[10px] text-teal-300/80 ml-1">kg</span>
                  </div>
                </div>

                {/* Secondary KPI 5: Citizen Reward Points */}
                <div className="p-2 rounded-lg bg-amber-950/25 border border-amber-800/40 text-left">
                  <div className="text-[9px] uppercase font-bold text-amber-300">Citizen Points</div>
                  <div className="text-sm font-mono font-bold text-amber-300">
                    <NumberCountUp value={kpis?.points_awarded?.value ?? 0} />
                    <span className="text-[10px] text-amber-300/80 ml-1">pts</span>
                  </div>
                </div>

                {/* Secondary KPI 6: Pickup Completion */}
                <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/40 text-left">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Pickup Rate</div>
                  <div className="text-sm font-mono font-bold text-emerald-400">
                    <NumberCountUp value={kpis?.pickup_completion_percent?.value ?? 100} decimals={0} />
                    <span className="text-[10px] text-slate-400 ml-0.5">%</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* KPI Expansion Toggle Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowAllKpis(!showAllKpis)}
              className="text-[10px] font-semibold text-slate-400 hover:text-amber-400 flex items-center space-x-1 cursor-pointer transition py-0.5"
            >
              <span>{showAllKpis ? 'Show Primary Metrics Only' : 'Show All 10 Municipal Metrics'}</span>
              {showAllKpis ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </section>

      {/* 2. CONTROLS STRIP (Segmented Map/List, Filters, Layers, Basemap, Reset) */}
      <section className="bg-slate-900/90 border-b border-slate-800 px-3 md:px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0 z-10">
        <div className="flex items-center space-x-2">
          {/* Segmented View Switcher: Map | List */}
          <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setDisplayMode('map')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer text-xs ${
                displayMode === 'map' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
            <button
              onClick={() => setDisplayMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer text-xs ${
                displayMode === 'table' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Queue List</span>
            </button>
          </div>

          {/* Collapsible Filters Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                categoryFilter !== 'all' || statusFilter !== 'all' || searchFilter
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(categoryFilter !== 'all' || statusFilter !== 'all' || searchFilter) && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>

            {/* Filters Dropdown Popover */}
            {showFilterDropdown && (
              <div className="absolute left-0 top-10 z-30 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 space-y-2.5 text-left text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200">Incident Filters</span>
                  <button
                    onClick={() => {
                      setCategoryFilter('all');
                      setStatusFilter('all');
                      setSearchFilter('');
                    }}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    Reset
                  </button>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Search text / ticket #</label>
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filter ticket or address..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none"
                    >
                      <option value="all">All</option>
                      <option value="garbage_dump">Garbage Dump</option>
                      <option value="overflowing_bin">Overflowing Bin</option>
                      <option value="drain_clog">Drain Clog</option>
                      <option value="plastic_waste">Plastic Waste</option>
                      <option value="hazardous_waste">Hazardous</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none"
                    >
                      <option value="all">All</option>
                      <option value="submitted">Submitted</option>
                      <option value="verified">Verified</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => setShowFilterDropdown(false)}
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs"
                >
                  Apply Filters ({filteredReports.length})
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Layers Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLayerDropdown(!showLayerDropdown)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Layers</span>
            </button>

            {showLayerDropdown && (
              <div className="absolute left-0 top-10 z-30 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 space-y-2 text-left text-xs">
                <span className="font-bold text-slate-200 block border-b border-slate-800 pb-1.5">
                  Map Layers
                </span>
                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={layerReports}
                    onChange={(e) => setLayerReports(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Reports ({filteredReports.length})</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={layerClustering}
                    onChange={(e) => setLayerClustering(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Cluster Bubbles</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={layerHeatmap}
                    onChange={(e) => setLayerHeatmap(e.target.checked)}
                    className="accent-red-500 rounded"
                  />
                  <span>Incident Heatmap</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={layerBins}
                    onChange={(e) => setLayerBins(e.target.checked)}
                    className="accent-purple-500 rounded"
                  />
                  <span>Smart Bins (SIM)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={layerWards}
                    onChange={(e) => setLayerWards(e.target.checked)}
                    className="accent-blue-500 rounded"
                  />
                  <span>Ward Polygons</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right: Free Basemap Switcher & Reset View */}
        <div className="flex items-center space-x-2">
          {/* Basemap Selection */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            {(['standard', 'dark', 'terrain', 'satellite'] as BasemapStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => setBasemapStyle(style)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition cursor-pointer ${
                  basemapStyle === style ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          {/* Reset View Button */}
          <button
            onClick={handleResetView}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-semibold transition cursor-pointer text-xs"
            title="Auto fit bounds to active markers"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Reset View</span>
          </button>
        </div>
      </section>

      {/* 3. MAIN WORKSPACE (Map View or Table View + Responsive Drawer/Sheet) */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col md:flex-row">
        {/* Offline Tiles Notification Banner */}
        {isOfflineView && (
          <div className="absolute top-3 left-3 right-3 z-20 bg-rose-900/90 border border-rose-700 text-white p-2.5 rounded-xl flex items-center justify-between text-xs backdrop-blur-sm shadow-xl">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>Map tiles unavailable, showing offline grid view. Markers and routes remain fully interactive.</span>
            </div>
            <button
              onClick={() => {
                setIsOfflineView(false);
                setTileErrorCount(0);
              }}
              className="px-2.5 py-1 bg-white text-rose-900 rounded font-bold hover:bg-rose-100 transition"
            >
              Retry Tiles
            </button>
          </div>
        )}

        {/* Empty State when 0 reports exist */}
        {!loading && reports.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 p-6">
            <div className="p-6 md:p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
              <Database className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Database is Currently Empty</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No civic complaints or municipal entities were found. Populate ~180 realistic records across 8 Delhi wards with one click to test the full platform.
              </p>
              <button
                disabled={seeding}
                onClick={handleSeedData}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 font-bold text-white rounded-xl text-xs transition shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
              >
                {seeding ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Load Demo Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* MAP VIEW */}
        {displayMode === 'map' && (
          <div className="flex-1 h-full relative overflow-hidden">
            <div
              ref={mapContainerRef}
              className={`w-full h-full z-0 ${isOfflineView ? 'map-offline-grid' : ''}`}
            />

            {/* Bottom-left Operational Map Legend */}
            <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-xl text-left text-xs pointer-events-auto hidden sm:block max-w-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                <span>Live Map Counts</span>
                <span className="text-emerald-400 font-mono">100% Real SQL</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>Critical ({reports.filter((r) => r.category === 'drain_clog' || r.priority_score >= 12).length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Open ({reports.filter((r) => r.status === 'submitted' && r.priority_score < 12).length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>In Progress ({reports.filter((r) => r.status === 'in_progress' || r.status === 'assigned').length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Resolved ({reports.filter((r) => r.status === 'resolved').length})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TABLE / QUEUE LIST VIEW */}
        {displayMode === 'table' && (
          <div className="flex-1 h-full overflow-y-auto p-4 space-y-3 bg-slate-900 text-left">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm">
                Priority Queue ({filteredReports.length} incidents)
              </h3>
              <span className="text-[11px] text-slate-400">Click row to open details</span>
            </div>

            <div className="space-y-2">
              {filteredReports.map((r) => {
                const isCritical = r.category === 'drain_clog' || r.priority_score >= 12;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-wrap items-center justify-between gap-2 ${
                      selectedReport?.id === r.id
                        ? 'bg-amber-950/40 border-amber-500'
                        : isCritical
                        ? 'bg-red-950/20 border-red-800/60 hover:bg-slate-800'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-amber-300 text-xs">
                          #{r.ticket_number}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-slate-700 text-slate-300">
                          {r.category.replace('_', ' ')}
                        </span>
                        <span className="capitalize text-[11px] text-slate-300">{r.status}</span>
                      </div>
                      <p className="text-slate-300 text-xs mt-1 max-w-lg truncate">{r.description}</p>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {r.address_text || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Priority Score</div>
                        <div
                          className={`font-mono font-bold text-sm ${
                            isCritical ? 'text-red-400' : 'text-amber-400'
                          }`}
                        >
                          {r.priority_score.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* REPORT DETAIL DRAWER (Desktop: Right Rail; Mobile: Slide-Up Bottom Sheet) */}
        {selectedReport && (
          <>
            {/* Desktop Drawer (>=768px) */}
            <div className="hidden md:block w-96 h-full flex-shrink-0 z-20">
              <ReportDetailDrawer
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
                onReportUpdated={(updated) => {
                  setSelectedReport(updated);
                  setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                }}
              />
            </div>

            {/* Mobile Bottom Sheet (<768px) */}
            <div className="md:hidden fixed inset-x-0 bottom-14 z-50 max-h-[85dvh] bg-slate-900 border-t border-slate-700 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden">
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto my-2 flex-shrink-0" />
              <div className="flex-1 overflow-y-auto">
                <ReportDetailDrawer
                  report={selectedReport}
                  onClose={() => setSelectedReport(null)}
                  onReportUpdated={(updated) => {
                    setSelectedReport(updated);
                    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
