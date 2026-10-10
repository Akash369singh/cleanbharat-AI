import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Sliders, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck, Database, Trash2 } from 'lucide-react';

export const AdminConfigView: React.FC = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset confirmation
  const [confirmReset, setConfirmReset] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getConfigs();
      setConfigs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load system configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSeed = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await api.seedData();
      setSuccessMessage(res.message || 'Demo dataset seeded successfully.');
      await fetchConfigs();
    } catch (err: any) {
      setError(err.message || 'Failed to seed database.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSafeReset = async () => {
    if (!confirmReset) {
      setError('Please check the confirmation box before initiating safe reset.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await api.resetData(true);
      setSuccessMessage(res.message || 'Seeded demo records safely deleted.');
      setConfirmReset(false);
      await fetchConfigs();
    } catch (err: any) {
      setError(err.message || 'Reset failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-slate-900">System Parameters, Scoring Weights & Demo Engine</h2>
        <p className="text-xs text-slate-500">
          Admin portal managing explainable formula parameters and database demo state.
        </p>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Demo Controls Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
          <Database className="w-4 h-4 text-blue-600" />
          <span>Demo Lifecycle Management (Seed & Safe Reset)</span>
        </h3>
        <p className="text-slate-600 leading-relaxed">
          The Clean Bharat platform enforces strict idempotency. Seeding creates realistic demo records flagged{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">seed_demo: true</code>.
          Safe Reset only deletes rows flagged as demo records, keeping authentic citizen reports completely intact.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleSeed}
            disabled={isProcessing}
            className="px-4 py-2.5 min-h-[44px] bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isProcessing ? 'Processing...' : 'Idempotent Demo Seed'}
          </button>

          <div className="flex items-center space-x-2 pl-4 border-l border-slate-200">
            <label className="flex items-center space-x-2 text-slate-700 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={confirmReset}
                onChange={(e) => setConfirmReset(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 cursor-pointer"
              />
              <span>Confirm Safe Reset of Seed Rows</span>
            </label>
            <button
              onClick={handleSafeReset}
              disabled={!confirmReset || isProcessing}
              className="px-4 py-2.5 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition disabled:opacity-40 cursor-pointer shadow-sm"
            >
              Safe Reset Demo Data
            </button>
          </div>
        </div>
      </div>

      {/* Config Settings Listing */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span>Active ConfigSettings in Database</span>
        </h3>

        {loading ? (
          <div className="text-slate-400">Loading configurations...</div>
        ) : (
          <div className="space-y-3">
            {configs.map((c) => (
              <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800">{c.key}</span>
                  <span className="text-[10px] text-slate-400">ID #{c.id}</span>
                </div>
                <p className="text-[11px] text-slate-500">{c.description || 'System setting'}</p>
                <pre className="p-2 bg-slate-900 text-emerald-400 rounded text-[11px] font-mono overflow-x-auto mt-2">
                  {JSON.stringify(c.value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demo Credentials Reference Box */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-xs text-amber-950 space-y-2">
        <h4 className="font-bold text-amber-900 flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-amber-700" />
          <span>Official Hackathon Demo Credentials</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
          <div><strong>Admin:</strong> admin@cleanbharat.gov.in / Password123!</div>
          <div><strong>Supervisor:</strong> supervisor@cleanbharat.gov.in / Password123!</div>
          <div><strong>Worker:</strong> worker@cleanbharat.gov.in / Password123!</div>
          <div><strong>Citizen:</strong> citizen@cleanbharat.gov.in / Password123!</div>
        </div>
      </div>
    </div>
  );
};
