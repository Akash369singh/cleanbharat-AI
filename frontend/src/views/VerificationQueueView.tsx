import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { ResolutionEvidence } from '../types';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, SlidersHorizontal, Grid2X2 } from 'lucide-react';
import { BeforeAfterSlider } from '../components/BeforeAfterSlider';
import { SkeletonCard } from '../components/SkeletonLoader';
import { listItemVariants } from '../lib/motion';

export const VerificationQueueView: React.FC = () => {
  const [queue, setQueue] = useState<ResolutionEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<{ [id: number]: string }>({});
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const [sliderModes, setSliderModes] = useState<{ [id: number]: boolean }>({});

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getResolutionQueue();
      setQueue(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch verification queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleReview = async (evidenceId: number, decision: 'approved' | 'rejected') => {
    setActionInProgress(evidenceId);
    setError(null);
    try {
      const reason = rejectReasons[evidenceId] || '';
      await api.reviewEvidence(evidenceId, decision, 'Supervisor audit completed', reason);
      // Remove from queue
      setQueue((prev) => prev.filter((item) => item.id !== evidenceId));
    } catch (err: any) {
      setError(err.message || 'Review action failed.');
    } finally {
      setActionInProgress(null);
    }
  };

  const toggleSliderMode = (id: number) => {
    setSliderModes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Supervisor Resolution Verification Queue</h2>
          <p className="text-xs text-slate-500">
            Compare Before and After photographs. Honest protocol: Human supervisor inspection required before closing ticket.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="flex items-center space-x-1 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && queue.length === 0 && (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
          No pending cleanup evidence in queue. All field tasks are up-to-date!
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence>
          {queue.map((item) => {
            const isSlider = sliderModes[item.id] !== false; // default true for slider
            const beforeImg = item.before_photo_path
              ? `/api/uploads/${item.before_photo_path}`
              : 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&auto=format&fit=crop&q=80';
            const afterImg = item.after_photo_path
              ? `/api/uploads/${item.after_photo_path}`
              : 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80';

            return (
              <motion.div
                key={item.id}
                variants={listItemVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-sm text-slate-900">Report #{item.report_id}</span>
                    <span className="text-slate-500">Worker ID #{item.worker_id}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => toggleSliderMode(item.id)}
                      className="inline-flex items-center space-x-1 text-slate-500 hover:text-indigo-600 transition"
                      title="Toggle between Interactive Slider and Side-by-Side views"
                    >
                      {isSlider ? <Grid2X2 className="w-3.5 h-3.5" /> : <SlidersHorizontal className="w-3.5 h-3.5" />}
                      <span className="text-[11px] font-medium">{isSlider ? 'Side-by-Side' : 'Interactive Slider'}</span>
                    </button>
                    <span className="text-slate-400 font-mono text-[11px]">
                      Submitted: {new Date(item.submitted_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Photo comparison: Slider mode or Side-by-Side */}
                {isSlider ? (
                  <div>
                    <BeforeAfterSlider
                      beforeUrl={beforeImg}
                      afterUrl={afterImg}
                      beforeLabel="Original Incident (Before)"
                      afterLabel="Field Clearance (After)"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                      <span className="font-semibold text-slate-700 block mb-1">Before: Incident Photo</span>
                      <div className="h-48 bg-slate-200 rounded overflow-hidden flex items-center justify-center text-slate-400">
                        <img
                          src={beforeImg}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200 text-center">
                      <span className="font-semibold text-emerald-900 block mb-1">After: Field Worker Clearance</span>
                      <div className="h-48 bg-slate-200 rounded overflow-hidden flex items-center justify-center text-slate-400">
                        <img
                          src={afterImg}
                          alt="After Evidence"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {item.notes && (
                  <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                    <strong>Worker Remarks:</strong> {item.notes}
                  </p>
                )}

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex-1 max-w-sm">
                    <input
                      type="text"
                      placeholder="Rejection reason if re-cleaning required..."
                      value={rejectReasons[item.id] || ''}
                      onChange={(e) =>
                        setRejectReasons((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-base md:text-xs min-h-[44px]"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleReview(item.id, 'rejected')}
                      disabled={actionInProgress === item.id}
                      className="flex items-center space-x-1.5 px-3.5 py-2.5 min-h-[44px] bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl border border-red-200 transition disabled:opacity-50 cursor-pointer text-xs"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject & Re-clean</span>
                    </button>
                    <button
                      onClick={() => handleReview(item.id, 'approved')}
                      disabled={actionInProgress === item.id}
                      className="flex items-center space-x-1.5 px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition disabled:opacity-50 shadow-sm cursor-pointer text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Closure</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
