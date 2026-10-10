import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  PlusCircle,
  FileText,
  MapPin,
  Award,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Coins
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Report } from '../types';
import L from 'leaflet';

interface CitizenHomeViewProps {
  onNavigateTab: (tab: string) => void;
}

export const CitizenHomeView: React.FC<CitizenHomeViewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [publicReports, setPublicReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [myRes, pubRes] = await Promise.all([
          api.getMyReports().catch(() => []),
          api.getReports().catch(() => [])
        ]);
        setMyReports(myRes || []);
        setPublicReports(pubRes || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Mini Map preview container
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [28.625, 77.21],
        zoom: 12,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(map);

      mapRef.current = map;
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || publicReports.length === 0) return;

    publicReports.slice(0, 30).forEach((r) => {
      const color = r.status === 'resolved' ? '#10B981' : '#F59E0B';
      const marker = L.circleMarker([r.lat, r.lng], {
        radius: 6,
        fillColor: color,
        color: '#FFFFFF',
        weight: 1.5,
        fillOpacity: 0.9
      });
      marker.addTo(mapRef.current!);
    });
  }, [publicReports]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left pb-16">
      {/* 1. Citizen Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-5 md:p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            Swachh Bharat Citizen Portal
          </span>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mt-0.5">
            Welcome back, {user?.full_name || 'Citizen'}!
          </h2>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-md">
            Report local sanitation issues with geo-tagged evidence. Earn Swachh rewards for keeping your neighbourhood clean.
          </p>
        </div>

        {/* Citizen Swachh Points Badge */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-400 text-amber-950 flex items-center justify-center font-bold text-lg shadow-inner">
            🪙
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-200">Reward Balance</div>
            <div className="text-lg font-mono font-bold text-white">
              {user?.points_balance ?? 150} <span className="text-xs font-normal text-amber-300">pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Large Primary Action Button: REPORT WASTE */}
      <div className="relative group">
        <button
          onClick={() => onNavigateTab('report')}
          className="w-full min-h-[58px] py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-base md:text-lg rounded-2xl shadow-xl hover:shadow-2xl transition flex items-center justify-center space-x-3 cursor-pointer border-2 border-emerald-400/40"
        >
          <Camera className="w-6 h-6 text-amber-300 flex-shrink-0" />
          <span>Report Waste Incident</span>
          <ArrowRight className="w-5 h-5 text-emerald-200 group-hover:translate-x-1 transition" />
        </button>
        <p className="text-[11px] text-slate-500 text-center mt-1.5">
          Take a photo with your mobile camera or upload from gallery • Auto GPS geolocation & AI analysis
        </p>
      </div>

      {/* 3. My Recent Reports & Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-sm">My Recent Submissions</h3>
          </div>
          <button
            onClick={() => onNavigateTab('my-reports')}
            className="text-xs text-amber-700 hover:text-amber-800 font-semibold hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-6 text-center text-slate-400 text-xs">Loading submissions...</div>
        ) : myReports.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No reports submitted yet</p>
            <p className="text-[11px] text-slate-500">
              When you report overflowing bins or garbage dumps, track their resolution here in real time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 space-y-2">
            {myReports.slice(0, 3).map((r) => (
              <div key={r.id} className="pt-2 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900">#{r.ticket_number}</span>
                    <span className="text-slate-600 font-medium capitalize">
                      {r.category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                    {r.address_text || r.description}
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    r.status === 'resolved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : r.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Small Nearby Map & Community Engagement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nearby Map Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Nearby Activity</h3>
            </div>
            <button
              onClick={() => onNavigateTab('map')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
            >
              Open Full Map →
            </button>
          </div>
          <div ref={mapContainerRef} className="h-44 w-full rounded-xl overflow-hidden border border-slate-200" />
          <p className="text-[11px] text-slate-500">
            {publicReports.length} civic incidents tracked across Delhi municipal wards.
          </p>
        </div>

        {/* Daily Quiz & Engagement Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
              <HelpCircle className="w-5 h-5 text-amber-600" />
              <span>Daily Waste Segregation Quiz</span>
            </div>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              Test your knowledge on dry vs. wet vs. hazardous waste separation. Earn <strong>+10 Swachh points</strong> for every correct response!
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('quiz')}
            className="mt-4 w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Coins className="w-4 h-4 text-amber-200" />
            <span>Play Today's Quiz</span>
          </button>
        </div>
      </div>
    </div>
  );
};
