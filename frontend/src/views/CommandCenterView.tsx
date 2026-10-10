import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { api } from '../api/client';
import {
  BarChart3,
  Download,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  PieChart as PieIcon,
  Shield,
  Layers
} from 'lucide-react';
import { SkeletonCard, SkeletonMetricCard } from '../components/SkeletonLoader';

const CATEGORY_COLORS = ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#6B7280'];

export const CommandCenterView: React.FC = () => {
  const [seriesData, setSeriesData] = useState<any | null>(null);
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAnalyticsSeries(days);
      setSeriesData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytical time-series metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const handleExportFullCsv = () => {
    window.open(api.getCsvExportUrl(), '_blank');
  };

  const handleExportChartCsv = (chartId: string) => {
    window.open(api.getChartCsvExportUrl(chartId), '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left text-slate-800">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Municipal Governance & Predictive Analytics
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200">
              DEMO DATA (30 DAYS)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real SQL time-series aggregations across 8 Delhi-NCR wards. Zero fabricated data points.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {/* Days Filter */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  days === d
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          {/* Full Audit Export */}
          <button
            onClick={handleExportFullCsv}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-sm transition"
            title="Download full 180+ records CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Full Audit CSV</span>
          </button>

          <button
            onClick={fetchAnalytics}
            className="p-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-600 transition"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !seriesData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {seriesData && (
        <div className="space-y-6">
          {/* CHART ROW 1: Created vs Resolved (Area) & Resolution Distribution (Bar) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: 30-Day Created vs Resolved */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span>Report Intake vs Resolution Velocity ({days} Days)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Daily creation vs verified closure events</p>
                </div>
                <button
                  onClick={() => handleExportChartCsv('created_vs_resolved')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-amber-600 px-2 py-1 rounded border border-slate-200 hover:border-amber-400 transition"
                  title="Export chart data as CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seriesData.daily_created_vs_resolved} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px', border: 'none' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="created" name="Reports Created" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorCreated)" />
                    <Area type="monotone" dataKey="resolved" name="Reports Resolved" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorResolved)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Resolution Time Distribution */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Resolution Duration Distribution</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Breakdown of hours taken from report creation to resolution</p>
                </div>
                <button
                  onClick={() => handleExportChartCsv('resolution_time')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 px-2 py-1 rounded border border-slate-200 hover:border-blue-400 transition"
                  title="Export chart data as CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seriesData.resolution_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px', border: 'none' }}
                    />
                    <Bar dataKey="count" name="Closed Reports" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* CHART ROW 2: Ward Comparison (Stacked Bar) & Category Mix (Donut) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart 3: Ward Comparison (7 cols) */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>Ward-Level Caseload (Open vs Resolved)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Density comparison across all 8 monitored Delhi municipal wards</p>
                </div>
                <button
                  onClick={() => handleExportChartCsv('wards')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-purple-600 px-2 py-1 rounded border border-slate-200 hover:border-purple-400 transition"
                  title="Export chart data as CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seriesData.ward_comparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="ward_name" tick={{ fontSize: 10 }} stroke="#94A3B8" interval={0} angle={-15} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px', border: 'none' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="open" name="Open Backlog" stackId="a" fill="#F59E0B" />
                    <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Category Mix Donut (5 cols) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <PieIcon className="w-4 h-4 text-amber-600" />
                    <span>Report Category Mix</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Distribution of civic sanitation incident types</p>
                </div>
                <button
                  onClick={() => handleExportChartCsv('categories')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-amber-600 px-2 py-1 rounded border border-slate-200 hover:border-amber-400 transition"
                  title="Export chart data as CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={seriesData.category_mix}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {seriesData.category_mix.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px', border: 'none' }}
                      formatter={(val: any, name: any) => [`${val} reports`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* CHART ROW 3: SLA Compliance Trend (Line) & Recyclable Materials Diverted */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 5: SLA Compliance */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>Weekly SLA Compliance Rate (%)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Percentage of tickets resolved before mandated deadline</p>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seriesData.sla_compliance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                    <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} stroke="#94A3B8" unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px', border: 'none' }}
                    />
                    <Line type="monotone" dataKey="rate" name="SLA Met (%)" stroke="#10B981" strokeWidth={3} dot={{ r: 5, fill: '#10B981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6: Circular Economy Diverted Materials */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>Circular Economy: Materials Diverted (kg)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Citizen recyclable listings by material stream</p>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seriesData.recyclable_materials} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="material" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" unit="kg" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px', border: 'none' }}
                    />
                    <Bar dataKey="total_weight_kg" name="Diverted Weight (kg)" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
