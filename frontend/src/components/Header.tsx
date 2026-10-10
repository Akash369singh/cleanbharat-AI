import React, { useState, useRef, useEffect } from 'react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { UserRole } from '../types';
import { Language, translations, setStoredLanguage } from '../i18n';
import { HealthStatusBadge } from './HealthStatusBadge';
import { NotificationsDrawer } from './NotificationsDrawer';
import { HonestyModal, HonestyChip } from './HonestyModal';
import {
  Compass,
  Search,
  Bell,
  Sparkles,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Globe,
  Shield,
  Layers
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
  onSelectLang: (lang: Language) => void;
  onOpenAssistant: () => void;
  onOpenJudgeMode: () => void;
  onOpenCommandPalette: () => void;
  onSelectReportId?: (id: number) => void;
}

const TAB_TITLES: Record<string, string> = {
  map: 'Command Centre',
  report: 'Report Waste',
  'my-reports': 'My Submissions',
  routes: 'Route Studio',
  verification: 'Resolution Audit',
  'worker-tasks': 'Work Orders',
  'drain-guard': 'DrainGuard Flood Risk',
  recycle: 'RecycleConnect',
  quiz: 'Segregation Quiz',
  events: 'Community Drives',
  'command-center': 'Municipal Analytics',
  impact: 'Impact Simulator',
  'admin-config': 'System Config'
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  lang,
  onSelectLang,
  onOpenAssistant,
  onOpenJudgeMode,
  onOpenCommandPalette,
  onSelectReportId,
}) => {
  const { user, logout, switchDemoRole } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHonestyModalOpen, setIsHonestyModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  const role = user?.role || 'citizen';

  const handleLangChange = (newLang: Language) => {
    setStoredLanguage(newLang);
    onSelectLang(newLang);
  };

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30 border-b border-slate-800 flex-shrink-0">
      {/* Slim Top Bar Only (No Duplicate Nav Row) */}
      <div className="w-full px-3 md:px-5 py-2.5 flex items-center justify-between gap-2.5">
        {/* Left: Brand & Dynamic Page Title */}
        <div className="flex items-center space-x-3 min-w-0">
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none"
            onClick={() => onSelectTab('map')}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0">
              <span className="text-amber-300 text-base">स</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold text-white tracking-tight leading-none flex items-center gap-1.5">
                <span>SmartRoute AI</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  Clean Bharat
                </span>
              </div>
            </div>
          </div>

          {/* Breadcrumb Separator & Page Title */}
          <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />
          <h2 className="text-xs md:text-sm font-semibold text-slate-200 truncate">
            {TAB_TITLES[currentTab] || 'Dashboard'}
          </h2>
        </div>

        {/* Center: Command Palette Search Bar */}
        <div className="flex-1 max-w-xs md:max-w-md mx-2">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300 transition cursor-pointer"
            title="Search tickets, addresses, and actions (Ctrl+K)"
          >
            <div className="flex items-center space-x-2 truncate">
              <Search className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-slate-400 truncate text-[11px] md:text-xs">
                Search reports, wards, actions...
              </span>
            </div>
            <kbd className="hidden md:inline-block px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-[10px] text-amber-300 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Honesty Chip, Health, Bell, User Avatar Menu */}
        <div className="flex items-center space-x-2 text-xs flex-shrink-0">
          {/* Honesty Chip */}
          <HonestyChip onClick={() => setIsHonestyModalOpen(true)} />

          {/* Telemetry Health Badge */}
          <HealthStatusBadge />

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition relative cursor-pointer"
              title="System Alerts & Notifications"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
            <NotificationsDrawer
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              onSelectReportId={onSelectReportId}
            />
          </div>

          {/* User Avatar Menu Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-1.5 bg-slate-800/90 hover:bg-slate-700/80 p-1 md:px-2.5 md:py-1 rounded-xl border border-slate-700 text-xs transition cursor-pointer"
              title="User Account & Quick Controls"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-700/60 text-emerald-200 font-bold flex items-center justify-center text-[11px]">
                {user?.role ? user.role[0].toUpperCase() : 'U'}
              </div>
              <span className="hidden md:inline font-medium text-slate-200 capitalize">
                {user?.role || 'Guest'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </button>

            {/* Dropdown Content */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-10 z-50 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 text-left space-y-3">
                {/* User Info Header */}
                <div className="border-b border-slate-800 pb-2.5">
                  <div className="font-bold text-slate-100 text-xs truncate">
                    {user?.full_name || 'Municipal User'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{user?.email || 'demo@cleanbharat.gov.in'}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Active: {role}
                    </span>
                    {user?.role === 'citizen' && (
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                        🪙 {user.points_balance} pts
                      </span>
                    )}
                  </div>
                </div>

                {/* Demo Role Switcher */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Switch Demo Role:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {(['citizen', 'worker', 'supervisor', 'admin'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          switchDemoRole(r);
                          setIsUserMenuOpen(false);
                        }}
                        className={`py-1.5 px-2 rounded-lg font-medium capitalize text-center transition ${
                          role === r
                            ? 'bg-amber-600 text-white font-bold shadow-sm'
                            : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Switcher */}
                <div className="border-t border-slate-800 pt-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>Language / भाषा:</span>
                  </div>
                  <select
                    value={lang}
                    onChange={(e) => handleLangChange(e.target.value as Language)}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-400"
                  >
                    <option value="en">English (EN)</option>
                    <option value="hi">हिन्दी (HI)</option>
                    <option value="gu">ગુજરાતી (GU)</option>
                  </select>
                </div>

                {/* Quick Actions: Judge Mode & Assistant */}
                <div className="border-t border-slate-800 pt-2.5 space-y-1.5">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenJudgeMode();
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg bg-gradient-to-r from-indigo-900/60 to-purple-900/60 hover:from-indigo-800/80 hover:to-purple-800/80 border border-indigo-700/50 text-indigo-200 transition text-xs font-semibold"
                  >
                    <Compass className="w-4 h-4 text-indigo-300" />
                    <span>Judge / Evaluator Mode</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAssistant();
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 text-emerald-200 transition text-xs font-semibold"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    <span>AI Sanitation Assistant</span>
                  </button>
                </div>

                {/* Sign Out */}
                <div className="border-t border-slate-800 pt-2">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center space-x-1.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Honesty Modal Dialog */}
      <HonestyModal
        isOpen={isHonestyModalOpen}
        onClose={() => setIsHonestyModalOpen(false)}
      />
    </header>
  );
};
