import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Award,
  Sparkles,
  Database,
  RefreshCw,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { modalVariants, defaultSpring } from '../lib/motion';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface JudgeModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

interface Step {
  id: number;
  title: string;
  tab: string;
  badge: string;
  summary: string;
  whatIsReal: string;
  whatIsSimulated: string;
  evaluationCriteria: string;
}

const DEMO_STEPS: Step[] = [
  {
    id: 1,
    title: '1. Citizen Report & Transparent AI Waste Classifier',
    tab: 'report',
    badge: 'Track 3: Waste Segregation',
    summary: 'Citizens upload geo-tagged photos of waste. The AI classifier predicts waste type, overflow flags, and confidence, with explicit "rules_fallback" labeling if deep model weights are not loaded.',
    whatIsReal: 'Real Pydantic schemas, EXIF metadata stripping, SHA256 hashed filenames, database persistence, and rules/model labeling.',
    whatIsSimulated: 'Demo image upload uses rules fallback classifier based on category keywords if local PyTorch weights are not installed.',
    evaluationCriteria: 'Honesty in AI attribution & robust validation pipeline.',
  },
  {
    id: 2,
    title: '2. Explainable Priority Score & Duplicate Clustering',
    tab: 'command',
    badge: 'Track 3: Priority Dispatch',
    summary: 'Every report is computed an explainable 0–100 score using configurable weights: severity, age, overflow risk, school/hospital proximity, and Haversine spatial duplicate clustering.',
    whatIsReal: 'Real mathematical scoring formula with audit breakdown stored in DB; real Haversine formula clustering within 50m radius.',
    whatIsSimulated: 'Seed reports are placed around Ward 12 (Shivajinagar, Pune).',
    evaluationCriteria: 'Algorithmic transparency — no black-box arbitrary scores.',
  },
  {
    id: 3,
    title: '3. Geospatial Command Center & Live Map',
    tab: 'command',
    badge: 'Cross-Track Spatial Intelligence',
    summary: 'Interactive Leaflet map showing Ward 12 boundaries, active waste clusters, high-priority incident pulsing rings, and smart bin locations with an accessible table fallback.',
    whatIsReal: 'Real Leaflet canvas, real Lat/Lng points from SQLite/PostgreSQL, SLA countdown timers, dynamic cluster markers.',
    whatIsSimulated: 'Map tiles fetched via OpenStreetMap; Ward boundaries seeded.',
    evaluationCriteria: 'Geospatial visualization & accessibility (WCAG AA).',
  },
  {
    id: 4,
    title: '4. Capacity-Constrained Route Optimizer (CVRP)',
    tab: 'routes',
    badge: 'Track 3: Fleet Optimization',
    summary: 'Solves multi-stop pickup routing from Depot across vehicles. Compares unoptimized baseline vs OR-Tools / 2-Opt optimized sequence, using real OSRM road distance or Haversine fallback.',
    whatIsReal: 'Real OR-Tools constraint solver or deterministic 2-Opt TSP; real baseline calculation; persistent Route & RouteStop records.',
    whatIsSimulated: 'Falls back to 1.3x circuity Haversine when public OSRM server is offline; simulated vehicle replay on map.',
    evaluationCriteria: 'Operational efficiency gains, vehicle capacity constraints & honest baseline comparisons.',
  },
  {
    id: 5,
    title: '5. Worker Task Execution & Two-Sided Resolution Verification',
    tab: 'verification',
    badge: 'Track 3: Accountability',
    summary: 'Workers mark tasks in-progress and upload resolution evidence (after photo). Supervisors review before/after photos side-by-side using an interactive slider. No fake AI cleanup approvals.',
    whatIsReal: 'Strict server-side state machine (submitted → verified → assigned → in_progress → resolved); real audit logs in ReportEvent.',
    whatIsSimulated: 'Demo photos from seed dataset.',
    evaluationCriteria: 'Human-in-the-loop audit trail, preventing fraudulent closure.',
  },
  {
    id: 6,
    title: '6. DrainGuard: Monsoon Drain Health & Flooding Hotspots',
    tab: 'drains',
    badge: 'Track 4: Drain Maintenance',
    summary: 'Identifies chronic silt and blockages. Aggregates reports by ward cell to calculate flood risk index and generate prioritized pre-monsoon desilting schedules.',
    whatIsReal: 'Spatial density queries grouping drain reports; desilting queue with severity indicators.',
    whatIsSimulated: 'Rainfall data shows "not configured" unless live OpenWeather API key is provided in .env.',
    evaluationCriteria: 'Proactive civic disaster mitigation & honest API integrations.',
  },
  {
    id: 7,
    title: '7. RecycleConnect: Circular Economy Marketplace',
    tab: 'recycling',
    badge: 'Track 5: Circular Economy',
    summary: 'Connects citizen bulk recyclables (scrap metal, plastics, e-waste) with verified local kabadiwalas/recyclers with transparent indicative price cards and pickup scheduling.',
    whatIsReal: 'DB models for listings, recyclers, pickups, and points ledger balance.',
    whatIsSimulated: 'Market rates are labeled "indicative, not guaranteed commercial quotes".',
    evaluationCriteria: 'Incentive design & informal recycling sector integration.',
  },
  {
    id: 8,
    title: '8. Smart Bins IoT Simulator',
    tab: 'drains',
    badge: 'Track 6: Hardware / IoT',
    summary: 'Simulated ultrasonic bin sensors monitoring fill level, battery, and tilt. Automatically flags overflow hazards and schedules auto-dispatch.',
    whatIsReal: 'Real DB schema for Bin and BinReading; API validation.',
    whatIsSimulated: 'Telemetry is explicitly marked `source: "simulated"` and badged "SIMULATED IOT".',
    evaluationCriteria: 'Hardware integration architecture and strict data provenance.',
  },
  {
    id: 9,
    title: '9. Civic Engagement: Gamified Quizzes & Cleanups',
    tab: 'quiz',
    badge: 'Track 1 & 2: Civic Education & Community Action',
    summary: 'Educational segregation quizzes awarding Swachh points and local community cleanup drives encouraging citizen collective action.',
    whatIsReal: 'Scored quiz questions with explanations, volunteer signup endpoints, leaderboard point tallying.',
    whatIsSimulated: 'Pre-seeded sample community events in Ward 12.',
    evaluationCriteria: 'Behavior change mechanisms and community retention.',
  },
];

export const JudgeModeModal: React.FC<JudgeModeModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const { user } = useAuth();

  if (!isOpen) return null;

  const currentStep = DEMO_STEPS[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < DEMO_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      onNavigateTab(DEMO_STEPS[nextIndex].tab);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      onNavigateTab(DEMO_STEPS[prevIndex].tab);
    }
  };

  const handleJumpToStep = (index: number) => {
    setCurrentStepIndex(index);
    onNavigateTab(DEMO_STEPS[index].tab);
  };

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      setSeedMessage(null);
      const res = await apiClient.post('/seed/demo');
      setSeedMessage(res.data.message || 'Demo data loaded successfully!');
    } catch {
      setSeedMessage('Failed to load demo data. Check backend connection.');
    } finally {
      setSeeding(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('Are you sure you want to reset all demo data? This will clear reports and reload default seed data.')) {
      return;
    }
    try {
      setSeeding(true);
      setSeedMessage(null);
      const res = await apiClient.post('/seed/reset');
      setSeedMessage(res.data.message || 'Demo data reset to clean baseline.');
    } catch {
      setSeedMessage('Failed to reset demo data. Check permissions or backend connection.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl border border-indigo-500/40 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Judge & Evaluator Interactive Walkthrough
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300 font-semibold border border-indigo-500/30">
                  Live Guided Demo
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Step {currentStepIndex + 1} of {DEMO_STEPS.length} • Powered by real database records & transparent provenance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-9 gap-1 bg-slate-900/40 p-2 border-b border-slate-800">
          {DEMO_STEPS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => handleJumpToStep(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentStepIndex
                  ? 'bg-indigo-400 ring-2 ring-indigo-400/30'
                  : idx < currentStepIndex
                  ? 'bg-emerald-500/70'
                  : 'bg-slate-800 hover:bg-slate-700'
              }`}
              title={s.title}
            />
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Step Details */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-300 border border-purple-500/20">
                {currentStep.badge}
              </span>
              <button
                onClick={() => {
                  onNavigateTab(currentStep.tab);
                  onClose();
                }}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline"
              >
                <span>Switch to Screen: {currentStep.tab.toUpperCase()}</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            <h3 className="text-xl font-bold text-white">{currentStep.title}</h3>
            <p className="text-sm leading-relaxed text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              {currentStep.summary}
            </p>

            {/* Grid of Real vs Simulated */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm mb-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>What is Real in This Step:</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentStep.whatIsReal}
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
                <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm mb-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  <span>What is Simulated / Labeled:</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentStep.whatIsSimulated}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">Evaluation Criteria: </span>
              {currentStep.evaluationCriteria}
            </div>
          </div>

          {/* Seed Management Section */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Seed Data Controls (Idempotent)
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="inline-flex items-center space-x-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${seeding ? 'animate-spin' : ''}`} />
                <span>Load Demo Data</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={handleResetDemo}
                  disabled={seeding}
                  className="inline-flex items-center space-x-2 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 disabled:opacity-50 transition"
                >
                  <span>Reset Demo Baseline</span>
                </button>
              )}

              {seedMessage && (
                <span className="text-xs text-indigo-300 font-medium">
                  {seedMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/80 px-6 py-4">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous Step</span>
          </button>

          <div className="text-xs text-slate-400">
            {currentStepIndex + 1} of {DEMO_STEPS.length}
          </div>

          {currentStepIndex < DEMO_STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
            >
              <span>Next Step</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/30"
            >
              <span>Finish Walkthrough</span>
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
