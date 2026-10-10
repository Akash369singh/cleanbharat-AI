import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CleanupEvent } from '../types';
import { Award, Calendar, MapPin, ShieldCheck, Users, CheckCircle2, AlertCircle } from 'lucide-react';

export const CleanupEventsView: React.FC = () => {
  const [events, setEvents] = useState<CleanupEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registeredEvents, setRegisteredEvents] = useState<number[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evList, lbList] = await Promise.all([
          api.getEvents(),
          api.getLeaderboard()
        ]);
        setEvents(evList);
        setLeaderboard(lbList);
      } catch (err: any) {
        setError(err.message || 'Failed to load community events.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleVolunteer = async (eventId: number, taskId?: number) => {
    setError(null);
    try {
      await api.volunteerForEvent(eventId, taskId);
      setRegisteredEvents((prev) => [...prev, eventId]);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Events */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Community Cleanup & Mobilization Drives</h2>
            <p className="text-xs text-slate-500">
              Citizen volunteer programs. Safety protocol: Tasks are restricted strictly to non-hazardous sorting & awareness.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && <div className="p-8 text-center text-xs text-slate-500">Loading civic events...</div>}

          <div className="space-y-4">
            {events.map((ev) => {
              const isRegistered = registeredEvents.includes(ev.id);
              return (
                <div key={ev.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-sm text-slate-900">{ev.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      {ev.status}
                    </span>
                  </div>

                  <p className="text-slate-600">{ev.description}</p>

                  <div className="grid grid-cols-2 gap-2 text-slate-500 text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ev.location_name}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ev.scheduled_date}</span>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div>
                    <span className="font-semibold text-slate-700 block mb-1">Available Non-Hazardous Tasks:</span>
                    <div className="space-y-1.5">
                      {ev.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{task.title}</span>
                            <p className="text-slate-500 text-[11px] mt-0.5">{task.safety_instructions}</p>
                          </div>
                          <span className="font-bold text-amber-700">+{task.points_reward} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    {isRegistered ? (
                      <span className="flex items-center space-x-1 text-emerald-700 font-bold text-xs py-1.5 px-3 bg-emerald-50 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Registered as Volunteer</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleVolunteer(ev.id, ev.tasks[0]?.id)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition"
                      >
                        Register as Volunteer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Citizen Leaderboard */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Clean Bharat Leaderboard</span>
            </h3>
            <p className="text-[11px] text-slate-500">Top citizen champions by verified action points.</p>

            <div className="divide-y divide-slate-100">
              {leaderboard.map((champ) => (
                <div key={champ.rank} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                      {champ.rank}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800">{champ.name}</div>
                      <div className="text-[10px] text-slate-400">{champ.ward_name}</div>
                    </div>
                  </div>
                  <span className="font-bold text-amber-800 font-mono">{champ.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
