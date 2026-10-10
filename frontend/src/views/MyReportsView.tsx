import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Report, ReportEvent } from '../types';
import { Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Layers, RefreshCw } from 'lucide-react';

export const MyReportsView: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportEvents, setSelectedReportEvents] = useState<{ [id: number]: ReportEvent[] }>({});
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyReports();
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your citizen reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const toggleExpand = async (id: number) => {
    if (expandedReportId === id) {
      setExpandedReportId(null);
    } else {
      setExpandedReportId(id);
      if (!selectedReportEvents[id]) {
        try {
          const events = await api.getReportEvents(id);
          setSelectedReportEvents((prev) => ({ ...prev, [id]: events }));
        } catch {
          // ignore
        }
      }
    }
  };

  const steps = ['submitted', 'verified', 'assigned', 'in_progress', 'resolved'];

  return (
    <div className="max-w-4xl mx-auto space-y-4 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Tracked Reports & SLA Status</h2>
          <p className="text-xs text-slate-500">Live lifecycle tracking from civic submission to supervisor resolution verification.</p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center space-x-1 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {loading && <div className="p-8 text-center text-xs text-slate-500">Loading your reports from database...</div>}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
          You haven't submitted any civic reports yet. Click "Report Waste" to file one.
        </div>
      )}

      <div className="space-y-3">
        {reports.map((r) => {
          const isExpanded = expandedReportId === r.id;
          const currentStepIdx = steps.indexOf(r.status);

          return (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-xs transition">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-slate-900">#{r.ticket_number}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-100 text-slate-700">
                    {r.category.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">({r.source})</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-slate-500">
                    Priority Score: <strong className="text-slate-800">{r.priority_score}</strong>
                  </span>
                  {r.sla_due_at && (
                    <span className="flex items-center space-x-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Due: {new Date(r.sla_due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="py-4">
                <div className="flex items-center justify-between max-w-xl mx-auto relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
                  {steps.map((st, idx) => {
                    const isDone = currentStepIdx >= idx;
                    const isCurrent = currentStepIdx === idx;
                    return (
                      <div key={st} className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] transition ${
                            isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                          } ${isCurrent ? 'ring-2 ring-emerald-300' : ''}`}
                        >
                          {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <span className={`text-[10px] capitalize mt-1 font-medium ${isCurrent ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                          {st.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-slate-700 mb-2">{r.description}</p>
              <div className="text-[11px] text-slate-500 mb-3">{r.address_text || `${r.lat}, ${r.lng}`}</div>

              {/* Audit Details Toggle */}
              <button
                onClick={() => toggleExpand(r.id)}
                className="flex items-center space-x-1 text-emerald-700 font-semibold hover:underline text-[11px]"
              >
                <span>{isExpanded ? 'Hide Audit Log & AI Explanation' : 'View Audit Log & AI Scoring Breakdown'}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                  {/* Priority Breakdown Box */}
                  {r.priority_breakdown && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Explainable Priority Score Breakdown:</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-600">
                        <div>Base Severity: <strong>{r.priority_breakdown.base_severity}</strong></div>
                        <div>Age Urgent Bonus: <strong>+{r.priority_breakdown.age_weighted}</strong></div>
                        <div>Overflow Factor: <strong>+{r.priority_breakdown.overflow_weighted}</strong></div>
                        <div>Duplicate Corroborations: <strong>{r.priority_breakdown.duplicate_count}</strong></div>
                      </div>
                    </div>
                  )}

                  {/* Audit Event Timeline */}
                  <div>
                    <span className="font-semibold text-slate-800 text-[11px] block mb-1.5">Official Event Trail (ReportEvent):</span>
                    <div className="space-y-1.5">
                      {(selectedReportEvents[r.id] || []).map((ev) => (
                        <div key={ev.id} className="p-2 bg-slate-50 rounded border border-slate-100 flex items-start justify-between text-[11px]">
                          <div>
                            <span className="font-semibold text-slate-700 capitalize">{ev.event_type.replace('_', ' ')}: </span>
                            <span className="text-slate-600">{ev.comment}</span>
                          </div>
                          <span className="text-slate-400 font-mono text-[10px] ml-2">
                            {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
