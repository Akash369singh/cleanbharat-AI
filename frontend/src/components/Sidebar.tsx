import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Route as RouteIcon,
  CheckCircle2,
  Briefcase,
  Droplets,
  Recycle,
  Award,
  HelpCircle,
  BarChart3,
  Sliders,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MapPin,
  Menu,
  X,
  Compass,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  label: string;
  roles: UserRole[];
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user } = useAuth();
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const role = user?.role || 'citizen';

  const navGroups: NavGroup[] = [
    {
      label: 'Core',
      roles: ['citizen', 'worker', 'supervisor', 'admin'],
      items: [
        {
          id: 'map',
          label: role === 'citizen' ? 'Home' : 'Command Centre',
          icon: <LayoutDashboard className="w-5 h-5" />,
          badge: 'LIVE',
        },
      ],
    },
    {
      label: 'Operations',
      roles: ['citizen', 'worker', 'supervisor', 'admin'],
      items: [
        ...(role === 'citizen'
          ? [
              { id: 'report', label: 'Report Waste', icon: <MapPin className="w-5 h-5" /> },
              { id: 'my-reports', label: 'My Submissions', icon: <FileText className="w-5 h-5" /> },
            ]
          : []),
        ...(role === 'worker'
          ? [
              { id: 'worker-tasks', label: 'Work Orders', icon: <Briefcase className="w-5 h-5" /> },
            ]
          : []),
        ...(role === 'supervisor' || role === 'admin'
          ? [
              { id: 'routes', label: 'Route Studio', icon: <RouteIcon className="w-5 h-5" /> },
              { id: 'verification', label: 'Resolution Audit', icon: <CheckCircle2 className="w-5 h-5" /> },
            ]
          : []),
      ],
    },
    {
      label: 'Infrastructure',
      roles: ['supervisor', 'admin', 'citizen'],
      items: [
        { id: 'drain-guard', label: 'DrainGuard Flood Risk', icon: <Droplets className="w-5 h-5" /> },
      ],
    },
    {
      label: 'Circular Economy',
      roles: ['citizen', 'supervisor', 'admin'],
      items: [
        { id: 'recycle', label: 'RecycleConnect', icon: <Recycle className="w-5 h-5" /> },
      ],
    },
    {
      label: 'Citizen Action',
      roles: ['citizen', 'admin'],
      items: [
        { id: 'quiz', label: 'Segregation Quiz', icon: <HelpCircle className="w-5 h-5" /> },
        { id: 'events', label: 'Community Drives', icon: <Award className="w-5 h-5" /> },
      ],
    },
    {
      label: 'Analytics & Admin',
      roles: ['supervisor', 'admin'],
      items: [
        { id: 'command-center', label: 'Municipal Analytics', icon: <BarChart3 className="w-5 h-5" /> },
        { id: 'impact', label: 'Impact Simulator', icon: <TrendingUp className="w-5 h-5" /> },
        ...(role === 'admin'
          ? [{ id: 'admin-config', label: 'System Config', icon: <Sliders className="w-5 h-5" /> }]
          : []),
      ],
    },
  ];

  // All accessible items for this role
  const visibleGroups = navGroups.filter((g) => g.roles.includes(role) && g.items.length > 0);
  const allItems = visibleGroups.flatMap((g) => g.items);

  // Mobile Bottom Navigation: 4 main items + 1 "More"
  let primaryMobileItems: NavItem[] = [];
  if (role === 'citizen') {
    primaryMobileItems = allItems.filter((i) => ['map', 'report', 'my-reports', 'recycle'].includes(i.id));
  } else if (role === 'worker') {
    primaryMobileItems = allItems.filter((i) => ['worker-tasks', 'map'].includes(i.id));
  } else {
    // supervisor or admin
    primaryMobileItems = allItems.filter((i) => ['map', 'verification', 'routes', 'command-center'].includes(i.id));
  }

  const moreItems = allItems.filter((i) => !primaryMobileItems.some((p) => p.id === i.id));

  return (
    <>
      {/* Desktop (>=1024px: w-60 / w-16) & Tablet (768-1023px: w-16 icon rail) */}
      <aside
        className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 z-20 select-none flex-shrink-0 ${
          isCollapsed ? 'w-16' : 'w-16 lg:w-60'
        }`}
      >
        {/* Toggle Collapse Button (Desktop) */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="hidden lg:block truncate">
            {!isCollapsed && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Operations Menu
              </span>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition mx-auto lg:mx-0 cursor-pointer"
            title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {visibleGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="hidden lg:block px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    title={item.label}
                    className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-medium transition-colors text-left relative cursor-pointer min-h-[44px] ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    } ${isCollapsed ? 'justify-center' : 'justify-center lg:justify-start'}`}
                  >
                    <span className={`${isActive ? 'text-amber-400' : 'text-slate-400'}`}>
                      {item.icon}
                    </span>
                    <span className={`truncate ${isCollapsed ? 'hidden' : 'hidden lg:inline'}`}>
                      {item.label}
                    </span>
                    {!isCollapsed && item.badge && (
                      <span className="hidden lg:inline text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ml-auto">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Role Indicator */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between text-[11px]">
            <div className={`truncate ${isCollapsed ? 'hidden' : 'hidden lg:block'}`}>
              <div className="text-[10px] text-slate-400">Current Role</div>
              <div className="font-bold text-amber-400 capitalize">{role}</div>
            </div>
            <span
              className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] mx-auto lg:mx-0"
              title={`Role: ${role}`}
            />
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (<768px: Max 5 items + More sheet) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 flex items-center justify-around py-1.5 px-2 text-slate-300 text-[10px] shadow-2xl safe-area-bottom">
        {primaryMobileItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[56px] py-1 px-2 rounded-lg transition ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="mb-0.5">{item.icon}</span>
              <span className="truncate max-w-[64px] text-[10px]">{item.label}</span>
            </button>
          );
        })}

        {/* More Button */}
        {moreItems.length > 0 && (
          <button
            onClick={() => setIsMobileMoreOpen(true)}
            className="flex flex-col items-center justify-center min-h-[44px] min-w-[56px] py-1 px-2 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">More</span>
          </button>
        )}
      </nav>

      {/* Mobile "More" Sheet Modal */}
      <AnimatePresence>
        {isMobileMoreOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 space-y-4 max-h-[80dvh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-white text-sm">Additional Features</h3>
                  <p className="text-[11px] text-slate-400">All modules for role: {role}</p>
                </div>
                <button
                  onClick={() => setIsMobileMoreOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {moreItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      setIsMobileMoreOpen(false);
                    }}
                    className={`p-3 rounded-xl border flex items-center space-x-2.5 transition text-left min-h-[48px] ${
                      currentTab === item.id
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                        : 'bg-slate-800/70 border-slate-700/60 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-amber-400 flex-shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
