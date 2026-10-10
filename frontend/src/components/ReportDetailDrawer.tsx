import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  AlertTriangle,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Check,
  AlertCircle
} from 'lucide-react';
import { Report, ReportEvent } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface ReportDetailDrawerProps {
  report: Report | null;
  onClose: () => void;
  onReportUpdated?: (updatedReport: Report) => void;
}

export const ReportDetailDrawer: React.FC<ReportDetailDrawerProps> = ({
  report,
  onClose,
  onReportUpdated
}) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [selectedTargetStatus, setSelectedTargetStatus] = useState<string>('');

  useEffect(() => {
    if (report?.id) {
      fetchEvents(report.id);
      setShowStatusForm(false);
      setActionError(null);
    }
  }, [report?.id]);

  const fetchEvents = async (id: number) => {
    setLoadingEvents(true);
    try {
      const data = await api.getReportEvents(id);
      setEvents(data || []);
    } catch {
      // fallback
    } finally {
      setLoadingEvents(false);
    }
  };

  if (!report) return null;

  // SLA Calculation
  const now = new Date();
  const slaDue = report.sla_due_at ? new Date(report.sla_due_at) : null;
  const isOverdue = slaDue ? slaDue < now && report.status !== 'resolved' : false;
  const hoursLeft = slaDue ? Math.round((slaDue.getTime() - now.getTime()) / (1000 * 60 * 60)) : null;

  // Priority Breakdown Math
  const breakdown = report.priority_breakdown;
  const baseSev = breakdown?.severity_weighted || 5.0;
  const ageWt = breakdown?.age_weighted || 1.5;
  const locWt = breakdown?.location_weighted || 0;
  const dupWt = breakdown?.duplicate_weighted || 0;
  const totalScore = Math.max(1, report.priority_score || (baseSev + ageWt + locWt + dupWt));

  const baseSevPct = Math.min(100, (baseSev / totalScore) * 100);
  const ageWtPct = Math.min(100, (ageWt / totalScore) * 100);
  const locWtPct = Math.min(100, (locWt / totalScore) * 100);
  const dupWtPct = Math.min(100, (dupWt / totalScore) * 100);

  const handleStatusTransition = async (newStatus: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await api.updateReportStatus(report.id, newStatus, statusComment || undefined);
      setShowStatusForm(false);
      setStatusComment('');
      fetchEvents(report.id);
      if (onReportUpdated) {
        onReportUpdated(updated);
      }
    } catch (err: any) {
      setActionError(err.message || 'Status transition rejected by server.');
    } finally {
      setActionLoading(false);
    }
  };

  const role = user?.role || 'citizen';

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800 text-white overflow-hidden shadow-2xl text-left">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm font-bold text-amber-300">
            #{report.ticket_number}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              report.status === 'resolved'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : report.status === 'in_progress'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : report.status === 'verified'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : report.status === 'rejected'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {report.status}
          </span>
          {report.seed_demo && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
              DEMO DATA
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* SLA Alert Strip */}
        {slaDue && (
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between ${
              isOverdue
                ? 'bg-red-950/40 border-red-800/80 text-red-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className={`w-4 h-4 ${isOverdue ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
              <span className="font-medium text-[11px]">
                {isOverdue ? 'SLA Target Breached' : 'Resolution SLA Target'}
              </span>
            </div>
            <span
              className={`font-mono font-bold text-[11px] ${
                isOverdue ? 'text-red-400' : 'text-amber-300'
              }`}
            >
              {isOverdue ? `Overdue by ${Math.abs(hoursLeft || 0)}h` : `${hoursLeft}h remaining`}
            </span>
          </div>
        )}

        {/* Photo Container */}
        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
          {report.photo_path ? (
            <img
              src={report.photo_path}
              alt="Report evidence"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 p-4">
              <Layers className="w-8 h-8 mb-1 text-slate-600" />
              <span className="text-[11px]">Photo Evidence Uploaded</span>
              <span className="text-[10px] text-slate-600 mt-0.5">EXIF stripped by municipal firewall</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-[10px] font-semibold text-slate-300 border border-slate-700/60">
            {report.category.replace('_', ' ').toUpperCase()} • {report.waste_type}
          </div>
        </div>

        {/* Description & Location */}
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 space-y-2">
          <p className="text-slate-200 leading-relaxed">{report.description}</p>
          <div className="flex items-start space-x-1.5 text-slate-400 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{report.address_text || `${report.lat.toFixed(5)}, ${report.lng.toFixed(5)}`}</span>
          </div>
        </div>

        {/* AI Waste Intelligence Box */}
        {report.ai_result && (
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-emerald-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-200">AI Waste Intelligence</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold border ${
                  report.ai_result.source === 'model'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                Source: {report.ai_result.source}
              </span>
            </div>

            {/* Confidence Bar */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Model Confidence</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {Math.round(report.ai_result.confidence * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-700/60 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.round(report.ai_result.confidence * 100)}%` }}
                />
              </div>
            </div>

            {/* AI Flags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {report.ai_result.is_large_pile && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Large Heap Pile
                </span>
              )}
              {report.ai_result.is_overflow && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Bin Overflowing
                </span>
              )}
              {report.ai_result.is_drain_obstruction && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                  Drainage Obstruction
                </span>
              )}
            </div>

            {/* Recommendations & Limitations */}
            <div className="text-[10px] text-slate-400 space-y-1 pt-1 border-t border-slate-700/40">
              <div>
                <strong className="text-slate-300">Action:</strong> {report.ai_result.recommended_action}
              </div>
              {report.ai_result.limitations && (
                <div className="text-slate-500 italic">
                  <strong>Limitation:</strong> {report.ai_result.limitations}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Explainable Priority Score Breakdown */}
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-amber-500/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200">Explainable Priority Score</span>
            <span className="font-mono text-base font-bold text-amber-400">
              {report.priority_score.toFixed(1)} <span className="text-xs text-slate-400">/ 20</span>
            </span>
          </div>

          {/* Animated Stacked Bar */}
          <div className="h-2.5 w-full bg-slate-700/50 rounded-full overflow-hidden flex shadow-inner">
            <div
              title={`Base Severity (${baseSev.toFixed(1)})`}
              style={{ width: `${baseSevPct}%` }}
              className="bg-amber-500 hover:opacity-90 transition-all"
            />
            <div
              title={`SLA Age Decay (${ageWt.toFixed(1)})`}
              style={{ width: `${ageWtPct}%` }}
              className="bg-red-500 hover:opacity-90 transition-all"
            />
            {locWt > 0 && (
              <div
                title={`Sensitive Location (${locWt.toFixed(1)})`}
                style={{ width: `${locWtPct}%` }}
                className="bg-purple-500 hover:opacity-90 transition-all"
              />
            )}
            {dupWt > 0 && (
              <div
                title={`Corroborations (${dupWt.toFixed(1)})`}
                style={{ width: `${dupWtPct}%` }}
                className="bg-emerald-500 hover:opacity-90 transition-all"
              />
            )}
          </div>

          {/* Breakdown Legend */}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Base Sev: {baseSev.toFixed(1)}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Age Decay: {ageWt.toFixed(1)}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Location: {locWt.toFixed(1)}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Corrob: {dupWt.toFixed(1)}</span>
            </div>
          </div>

          {report.duplicate_count > 0 && (
            <div className="p-2 rounded bg-amber-950/20 border border-amber-800/40 text-[10px] text-amber-300 flex items-center justify-between">
              <span>Clustered Corroborations:</span>
              <span className="font-bold">{report.duplicate_count} reports merged within 50m</span>
            </div>
          )}
        </div>

        {/* Audit Trail Timeline */}
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200">ReportEvent Audit History</span>
            <span className="text-[10px] text-slate-400">{events.length} records</span>
          </div>

          {loadingEvents ? (
            <div className="py-4 text-center text-slate-500 text-[11px]">Loading audit trail...</div>
          ) : events.length === 0 ? (
            <div className="py-2 text-slate-500 text-[11px]">Initial report submission event logged.</div>
          ) : (
            <div className="space-y-2 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
              {events.map((ev) => (
                <div key={ev.id} className="relative pl-6 text-[11px]">
                  <span className="absolute left-1 top-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-900" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 capitalize">
                      {ev.event_type.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {ev.comment && <p className="text-slate-400 text-[10px] mt-0.5 italic">{ev.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Role-Based Action Controls Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/90 space-y-2">
        {actionError && (
          <div className="p-2 rounded bg-red-950/50 border border-red-800 text-red-300 text-[10px] flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Supervisor & Admin Actions */}
        {(role === 'supervisor' || role === 'admin') && (
          <div className="space-y-2">
            {!showStatusForm ? (
              <div className="grid grid-cols-2 gap-2">
                {report.status === 'submitted' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => {
                      setSelectedTargetStatus('verified');
                      setShowStatusForm(true);
                    }}
                    className="py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-bold text-xs transition"
                  >
                    Verify Report
                  </button>
                )}
                {(report.status === 'verified' || report.status === 'submitted') && (
                  <button
                    disabled={actionLoading}
                    onClick={() => {
                      setSelectedTargetStatus('assigned');
                      setShowStatusForm(true);
                    }}
                    className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-xs transition"
                  >
                    Assign Route
                  </button>
                )}
                {report.status === 'assigned' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => {
                      setSelectedTargetStatus('in_progress');
                      setShowStatusForm(true);
                    }}
                    className="py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-xs transition"
                  >
                    Start Work
                  </button>
                )}
                {report.status !== 'resolved' && report.status !== 'rejected' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => {
                      setSelectedTargetStatus('resolved');
                      setShowStatusForm(true);
                    }}
                    className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-xs transition"
                  >
                    Resolve Ticket
                  </button>
                )}
                {report.status !== 'rejected' && report.status !== 'resolved' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => {
                      setSelectedTargetStatus('rejected');
                      setShowStatusForm(true);
                    }}
                    className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-red-950/60 text-red-300 font-medium text-xs transition border border-red-800/40"
                  >
                    Reject
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>Confirm: {selectedTargetStatus.toUpperCase()}</span>
                  <button
                    onClick={() => setShowStatusForm(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Optional audit comment or reason..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition(selectedTargetStatus)}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 font-bold rounded-lg text-xs transition flex items-center justify-center space-x-1.5"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Commit Transition</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Worker Actions */}
        {role === 'worker' && report.status !== 'resolved' && (
          <div className="space-y-2">
            {report.status === 'assigned' && (
              <button
                disabled={actionLoading}
                onClick={() => handleStatusTransition('in_progress')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg text-xs transition"
              >
                Mark In Progress
              </button>
            )}
            {report.status === 'in_progress' && (
              <button
                disabled={actionLoading}
                onClick={() => handleStatusTransition('resolved')}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-lg text-xs transition"
              >
                Mark Cleared / Resolved
              </button>
            )}
          </div>
        )}

        {/* Citizen Note */}
        {role === 'citizen' && (
          <div className="text-center text-[10px] text-slate-400">
            Citizen Mode: Updates are broadcast in real-time as municipal crews service this location.
          </div>
        )}
      </div>
    </div>
  );
};
