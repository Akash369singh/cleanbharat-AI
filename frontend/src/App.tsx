import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Language, getStoredLanguage } from './i18n';
import { api } from './api/client';
import { pageVariants } from './lib/motion';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { AssistantModal } from './components/AssistantModal';
import { JudgeModeModal } from './components/JudgeModeModal';

// Views
import { CitizenHomeView } from './views/CitizenHomeView';
import { CommandCenterHomeView } from './views/CommandCenterHomeView';
import { ReportWasteView } from './views/ReportWasteView';
import { MyReportsView } from './views/MyReportsView';
import { RoutePlanningView } from './views/RoutePlanningView';
import { VerificationQueueView } from './views/VerificationQueueView';
import { WorkerTasksView } from './views/WorkerTasksView';
import { DrainGuardView } from './views/DrainGuardView';
import { RecycleConnectView } from './views/RecycleConnectView';
import { QuizView } from './views/QuizView';
import { CleanupEventsView } from './views/CleanupEventsView';
import { CommandCenterView } from './views/CommandCenterView';
import { ImpactAnalyticsView } from './views/ImpactAnalyticsView';
import { AdminConfigView } from './views/AdminConfigView';

import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('map');
  const [lang, setLang] = useState<Language>(getStoredLanguage());
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isJudgeModeOpen, setIsJudgeModeOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [isServerUnreachable, setIsServerUnreachable] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for backend connection telemetry events
  useEffect(() => {
    const handleConnection = (e: any) => {
      setIsServerUnreachable(!e.detail?.isOnline);
    };
    window.addEventListener('cleanbharat:connection', handleConnection);
    return () => window.removeEventListener('cleanbharat:connection', handleConnection);
  }, []);

  // Update default tab based on user role
  useEffect(() => {
    if (user?.role === 'worker') {
      setCurrentTab('worker-tasks');
    } else if (user?.role === 'supervisor') {
      setCurrentTab('verification');
    }
  }, [user?.role]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white text-xs">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-slate-300">Initializing SmartRoute AI Environment...</span>
        </div>
      </div>
    );
  }

  const role = user?.role || 'citizen';

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 flex flex-col font-sans text-slate-800 overflow-hidden">
      {/* 1. Slim Top Bar Only (No Duplicate Nav Row) */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedReportId(null);
        }}
        lang={lang}
        onSelectLang={setLang}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenJudgeMode={() => setIsJudgeModeOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onSelectReportId={(id) => {
          setSelectedReportId(id);
          setCurrentTab('map');
        }}
      />

      {/* 2. Unreachable Server Notice Banner (Only shown if API is offline) */}
      {isServerUnreachable && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md z-50 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-white flex-shrink-0 animate-pulse" />
            <span>Cannot reach the server. Please ensure backend is running on http://127.0.0.1:8000.</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-white text-rose-700 hover:bg-rose-50 rounded-lg font-bold transition flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* 3. Main Body Container with 100dvh Layout & Progressive Disclosure */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar (Desktop Collapsible, Tablet Icon Rail, Mobile Bottom Nav) */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setSelectedReportId(null);
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Content Viewport */}
        <main
          className={`flex-1 overflow-hidden flex flex-col ${
            currentTab === 'map' && role !== 'citizen'
              ? 'bg-slate-950'
              : 'bg-slate-100 overflow-y-auto'
          }`}
        >
          {currentTab === 'map' ? (
            role === 'citizen' ? (
              /* Citizen Home: Simple, large Report button, My Reports, mini map, and points */
              <div className="max-w-7xl w-full mx-auto p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">
                <CitizenHomeView onNavigateTab={(tab) => setCurrentTab(tab)} />
              </div>
            ) : (
              /* Supervisor & Admin Home: 3-Column Municipal Command Centre */
              <CommandCenterHomeView
                onNavigateTab={(tab) => setCurrentTab(tab)}
                selectedReportIdProp={selectedReportId}
              />
            )
          ) : (
            <div className="max-w-7xl w-full mx-auto p-4 md:p-6 pb-20 md:pb-6 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTab}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full"
                >
                  {currentTab === 'report' && (
                    <ReportWasteView
                      onReportSubmitted={() => {
                        setCurrentTab('my-reports');
                      }}
                    />
                  )}

                  {currentTab === 'my-reports' && <MyReportsView />}

                  {currentTab === 'routes' && (
                    <RoutePlanningView
                      onRouteCreated={() => {
                        setCurrentTab('map');
                      }}
                    />
                  )}

                  {currentTab === 'verification' && <VerificationQueueView />}

                  {currentTab === 'worker-tasks' && <WorkerTasksView />}

                  {currentTab === 'drain-guard' && <DrainGuardView />}

                  {currentTab === 'recycle' && <RecycleConnectView />}

                  {currentTab === 'quiz' && <QuizView />}

                  {currentTab === 'events' && <CleanupEventsView />}

                  {currentTab === 'command-center' && <CommandCenterView />}

                  {currentTab === 'impact' && <ImpactAnalyticsView />}

                  {currentTab === 'admin-config' && <AdminConfigView />}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* 4. Floating Round AI Assistant Action Button */}
      <button
        onClick={() => setIsAssistantOpen(true)}
        className="fixed right-4 bottom-16 md:bottom-6 z-30 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition cursor-pointer border-2 border-emerald-400/40"
        title="Open AI Sanitation Assistant"
      >
        <Sparkles className="w-5 h-5 text-amber-300" />
      </button>

      {/* 5. Global Command Palette Modal (Ctrl/Cmd+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={(tab) => setCurrentTab(tab)}
        onSelectReportId={(id) => {
          setSelectedReportId(id);
          setCurrentTab('map');
        }}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenJudgeMode={() => setIsJudgeModeOpen(true)}
      />

      {/* 6. Natural Language Assistant Modal */}
      <AssistantModal isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />

      {/* 7. Judge Mode Interactive Walkthrough Modal */}
      <JudgeModeModal
        isOpen={isJudgeModeOpen}
        onClose={() => setIsJudgeModeOpen(false)}
        onNavigateTab={(tab) => {
          if (tab === 'command') setCurrentTab('command-center');
          else if (tab === 'drains') setCurrentTab('drain-guard');
          else if (tab === 'recycling') setCurrentTab('recycle');
          else setCurrentTab(tab);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
