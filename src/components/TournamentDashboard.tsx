import React, { useState, useEffect } from "react";
import { Trophy, Plus, LayoutList, ChevronRight, Play, Tv, LogOut, Search } from "lucide-react";
import { ScreenType } from "../types";

interface Props {
  onNavigate: (screen: ScreenType) => void;
}

export default function TournamentDashboard({ onNavigate }: Props) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states for adding details
  const [showAddTournament, setShowAddTournament] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  
  const [tName, setTName] = useState("");
  const [mType, setMType] = useState("Group Stage");
  const [mVenue, setMVenue] = useState("");

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await fetch("/api/tournaments");
      const data = await res.json();
      setTournaments(data);
    } catch(err) {
      console.error(err);
    }
  };

  const fetchMatches = async (tId: string) => {
    try {
      const res = await fetch(`/api/matches?tournamentId=${tId}`);
      const data = await res.json();
      setMatches(data);
    } catch(err) {
      console.error(err);
    }
  };

  const handleSelectTournament = (t: any) => {
    setSelectedTournament(t);
    fetchMatches(t._id);
    setShowAddTournament(false);
    setShowAddMatch(false);
  };

  const loadMatch = async (matchId: string, destination: "controller" | "overlay") => {
    setLoading(true);
    try {
      await fetch(`/api/match-state/load/${matchId}`, { method: "POST" });
      if (destination === "overlay") {
        window.open(`/overlay?matchId=${matchId}`, "_blank");
      } else {
        onNavigate("controller");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!tName.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tName, format: "T20", season: "2026", startDate: new Date() })
      });
      setTName("");
      setShowAddTournament(false);
      await fetchTournaments();
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async () => {
    if (!selectedTournament || !mVenue.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tournamentId: selectedTournament._id, 
          matchType: mType,
          venue: mVenue,
          date: new Date()
        })
      });
      setMVenue("");
      setShowAddMatch(false);
      await fetchMatches(selectedTournament._id);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col">
      {/* Navbar */}
      <header className="flex bg-slate-950 border-b border-slate-800 h-16 items-center px-6 shadow-xl shadow-black/50 z-10 sticky top-0 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-widest uppercase">CRICSHOW DASHBOARD</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Tournament Management</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-300">Admin Active</span>
          </div>
          <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Logout (Placeholder)">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Tournaments */}
        <div className="w-1/3 max-w-md border-r border-slate-800 bg-[#071226] flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#071226] z-10">
            <h2 className="text-sm font-black text-slate-300 flex items-center gap-2 tracking-widest uppercase">
              <LayoutList className="w-4 h-4 text-cyan-400" />
              TOURNAMENTS
            </h2>
            <button 
              onClick={() => setShowAddTournament(true)}
              className="p-1.5 bg-slate-800 text-cyan-400 hover:bg-cyan-900 hover:text-cyan-300 rounded transition-colors shadow-[0_4px_6px_rgba(0,0,0,0.3)] active:translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Search Box */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search tournaments..." 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-300 focus:border-cyan-500 outline-none"
              />
            </div>

            {showAddTournament && (
              <div className="p-4 bg-slate-900 rounded-xl border border-cyan-500/30 shadow-lg mb-4">
                <input 
                  autoFocus
                  placeholder="Tournament Name" 
                  value={tName} onChange={e => setTName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-cyan-500 mb-3"
                />
                <div className="flex gap-2">
                  <button onClick={handleCreateTournament} disabled={loading} className="flex-1 py-2 bg-gradient-to-b from-cyan-600 to-blue-700 text-white rounded shadow-lg text-xs font-bold transition-all active:translate-y-0.5">CREATE</button>
                  <button onClick={() => setShowAddTournament(false)} className="px-4 py-2 bg-slate-800 text-white rounded text-xs transition-all active:translate-y-0.5">CANCEL</button>
                </div>
              </div>
            )}

            {tournaments.map(t => (
              <div 
                key={t._id} 
                onClick={() => handleSelectTournament(t)}
                className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${selectedTournament?._id === t._id ? "bg-gradient-to-r from-indigo-900/40 to-[#071226] border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "bg-slate-900/40 border-slate-800/50 hover:bg-slate-800"}`}
              >
                <div>
                  <div className="font-bold text-slate-300 text-sm">{t.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-wider">{t.format} • {t.status}</div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform ${selectedTournament?._id === t._id ? "text-cyan-400 translate-x-1" : "text-slate-600"}`} />
              </div>
            ))}
            
            {tournaments.length === 0 && !loading && (
              <div className="text-center p-6 text-slate-500 text-sm">No tournaments found. Create one.</div>
            )}
          </div>
        </div>

        {/* Right Column: Matches Dashboard */}
        <div className="flex-1 flex flex-col bg-[#020617] relative">
          {!selectedTournament ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <Trophy className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm font-bold tracking-widest uppercase">Select a tournament to manage matches</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#071226] sticky top-0 z-10 shadow-lg">
                <div>
                  <div className="text-[10px] text-cyan-400 font-bold mb-1 uppercase tracking-widest">{selectedTournament.name}</div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                    MATCH SCHEDULE
                  </h2>
                </div>
                <button 
                  onClick={() => setShowAddMatch(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded transition-colors flex items-center gap-2 text-xs font-bold shadow-[0_4px_6px_rgba(0,0,0,0.3)] active:translate-y-0.5"
                >
                  <Plus className="w-4 h-4" /> ADD MATCH
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {showAddMatch && (
                  <div className="p-6 bg-slate-900 rounded-xl border border-cyan-500/30 shadow-2xl mb-6 max-w-xl">
                    <h3 className="text-xs font-bold tracking-widest text-slate-400 mb-4 uppercase">Create New Match</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Venue Name</label>
                        <input 
                          placeholder="e.g. Wankhede Stadium" 
                          value={mVenue} onChange={e => setMVenue(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Match Type</label>
                        <select
                          value={mType} onChange={e => setMType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-cyan-500"
                        >
                          <option>Group Stage</option>
                          <option>Quarter Final</option>
                          <option>Semi Final</option>
                          <option>Final</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button onClick={handleCreateMatch} disabled={loading} className="py-2 px-6 bg-gradient-to-b from-cyan-600 to-blue-700 text-white rounded text-xs font-bold transition-all active:translate-y-0.5">SAVE MATCH</button>
                      <button onClick={() => setShowAddMatch(false)} className="px-6 py-2 bg-slate-800 text-white rounded text-xs transition-all active:translate-y-0.5">CANCEL</button>
                    </div>
                  </div>
                )}

                {matches.length === 0 && !showAddMatch && (
                  <div className="text-center p-12 text-slate-500 border border-slate-800 border-dashed rounded-xl">
                    <p className="text-sm">No matches scheduled in this tournament.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {matches.map(m => (
                    <div key={m._id} className="p-5 rounded-xl border bg-[#071226] border-slate-800 flex flex-col gap-4 shadow-xl relative overflow-hidden group hover:border-slate-600 transition-colors">
                      {/* Active Indicator Mock */}
                      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10" />
                      
                      <div className="flex items-center justify-between relative z-10">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded tracking-widest uppercase">{m.matchType}</span>
                        <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {m.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-base text-slate-200 flex flex-col gap-1 relative z-10 font-bold">
                        <div className="flex items-center justify-between">
                          <span>{m.battingTeam?.teamName || "TBD"}</span>
                          <span className="text-[10px] text-slate-600">vs</span>
                          <span>{m.bowlingTeam?.teamName || "TBD"}</span>
                        </div>
                      </div>
                      
                      <div className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1 relative z-10 border-b border-slate-800 pb-3">
                        <LayoutList className="w-3 h-3" /> {m.venue}
                      </div>
                      
                      <div className="mt-auto grid grid-cols-2 gap-2 relative z-10">
                        <button 
                          onClick={() => loadMatch(m._id, "controller")}
                          disabled={loading}
                          className="py-2.5 bg-gradient-to-b from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 border-t border-indigo-400 text-white rounded font-bold text-[10px] tracking-widest flex items-center justify-center gap-1 transition-all active:translate-y-0.5 shadow-[0_4px_6px_rgba(0,0,0,0.3)] disabled:opacity-50"
                        >
                          <Play className="w-3 h-3" />
                          CONTROLLER
                        </button>
                        
                        <button 
                          onClick={() => {
                            // Load it in backend first, then navigate.
                            loadMatch(m._id, "overlay");
                          }}
                          disabled={loading}
                          className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded font-bold text-[10px] tracking-widest flex items-center justify-center gap-1 transition-all active:translate-y-0.5 shadow-[0_4px_6px_rgba(0,0,0,0.3)] disabled:opacity-50"
                        >
                          <Tv className="w-3 h-3" />
                          OVERLAY
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
