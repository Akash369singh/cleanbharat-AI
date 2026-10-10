import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Report } from '../types';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Upload,
  MapPin,
  Navigation,
  Play,
  Check
} from 'lucide-react';

export const WorkerTasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const allReports = await api.getReports();
      const workerJobs = allReports.filter((r) =>
        ['assigned', 'in_progress'].includes(r.status)
      );
      setTasks(workerJobs);
    } catch (err: any) {
      setError(err.message || 'Failed to load worker field tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStartTask = async (reportId: number) => {
    setError(null);
    try {
      await api.updateReportStatus(reportId, 'in_progress', 'Sanitation crew arrived on site.');
      await fetchTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to update task status.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File exceeds max 5 MB limit.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadPhoto(file);
      setUploadedPath(res.photo_path);
    } catch (err: any) {
      setError(err.message || 'Failed to upload after photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitEvidence = async (reportId: number) => {
    if (!uploadedPath) {
      setError('Please capture and upload an after-clearance photograph first.');
      return;
    }

    setError(null);
    try {
      await api.submitEvidence(
        reportId,
        uploadedPath,
        evidenceNotes || 'Site cleared and sanitized by municipal team.'
      );
      setSuccessMessage(`Resolution proof for ticket #${reportId} submitted for supervisor audit.`);
      setActiveTaskId(null);
      setUploadedPath(null);
      setEvidenceNotes('');
      await fetchTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to submit evidence.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 text-left pb-16">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Today's Assigned Stops</h2>
          <p className="text-xs text-slate-500">
            Field execution flow: Navigate to site → Start Work → Capture photo proof & Mark Done.
          </p>
        </div>
        <button
          onClick={fetchTasks}
          className="flex items-center space-x-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 min-h-[44px] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Shifts</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && <div className="p-8 text-center text-xs text-slate-500">Loading assigned tasks...</div>}

      {!loading && tasks.length === 0 && (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">All Shift Stops Completed!</h3>
          <p className="text-[11px] text-slate-400">
            No pending assigned or in-progress collection stops found on your shift.
          </p>
        </div>
      )}

      {/* Stop Cards */}
      <div className="space-y-4">
        {tasks.map((task, idx) => (
          <div key={task.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 text-xs space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-mono font-bold flex items-center justify-center text-[11px]">
                  {idx + 1}
                </span>
                <span className="font-bold text-sm text-slate-900">#{task.ticket_number}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    task.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {task.status.replace('_', ' ')}
                </span>
              </div>
              <div className="font-mono font-bold text-amber-800">
                Priority: {task.priority_score.toFixed(1)}
              </div>
            </div>

            {/* Description & Location */}
            <p className="text-slate-800 text-sm leading-relaxed">{task.description}</p>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{task.address_text || `${task.lat.toFixed(5)}, ${task.lng.toFixed(5)}`}</span>
            </div>

            {/* Navigate / Start / Done Flow */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                {/* 1. Navigate Button */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${task.lat},${task.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl flex items-center space-x-1.5 transition text-xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>Navigate</span>
                </a>

                {/* 2. Start Work Button */}
                {task.status === 'assigned' && (
                  <button
                    onClick={() => handleStartTask(task.id)}
                    className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center space-x-1.5 transition text-xs cursor-pointer shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Work</span>
                  </button>
                )}
              </div>

              {/* 3. Upload Photo Proof & Complete */}
              {task.status === 'in_progress' && (
                <button
                  onClick={() => setActiveTaskId(activeTaskId === task.id ? null : task.id)}
                  className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center space-x-1.5 transition text-xs cursor-pointer shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>{activeTaskId === task.id ? 'Close Upload' : 'Upload Proof & Complete'}</span>
                </button>
              )}
            </div>

            {/* Upload Drawer within card */}
            {activeTaskId === task.id && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 mt-3">
                <div className="font-bold text-slate-800 text-xs">Capture After-Clearance Photograph</div>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    Native Camera / Photo Gallery (EXIF GPS auto-stripped):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="w-full text-base md:text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer min-h-[44px]"
                  />
                </div>

                {uploading && (
                  <div className="text-xs text-amber-700 flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading and sanitizing image bytes...</span>
                  </div>
                )}

                {uploadedPath && (
                  <div className="p-2 bg-emerald-100/70 border border-emerald-300 rounded-lg text-emerald-900 text-xs flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <span className="truncate">Uploaded: {uploadedPath}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Crew Clearance Notes:</label>
                  <input
                    type="text"
                    value={evidenceNotes}
                    onChange={(e) => setEvidenceNotes(e.target.value)}
                    placeholder="e.g. 50 kg waste collected, street swept and limed"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base md:text-xs text-slate-900 focus:outline-none focus:border-emerald-600 min-h-[44px]"
                  />
                </div>

                <button
                  disabled={uploading || !uploadedPath}
                  onClick={() => handleSubmitEvidence(task.id)}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-2 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Resolution for Supervisor Audit</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
