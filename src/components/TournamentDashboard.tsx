/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { ScreenType } from "../types";
import { Trophy, Calendar, MapPin, Users, Settings, Plus, LayoutList, ChevronRight, Activity } from "lucide-react";

interface ITournament {
  _id: string;
  name: string;
  season: string;
  format: string;
  startDate: string;
  endDate?: string;
  winnerTeamName?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

interface IMatch {
  _id: string;
  tournamentId: string;
  matchType: string;
  venue: string;
  date: string;
  battingTeamName: string;
  bowlingTeamName: string;
  status: 'scheduled' | 'live' | 'completed' | 'abandoned';
}

interface Props {
  onNavigate: (screen: ScreenType) => void;
}

export default function TournamentDashboard({ onNavigate }: Props) {
  const [tournaments, setTournaments] = useState<ITournament[]>([]);
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<ITournament | null>(null);

  // Mock initial fetch
  useEffect(() => {
    // We mock data for now because the API implementation will follow the DB schema update
    setTournaments([
      {
        _id: '1',
        name: 'ICC World Cup',
        season: '2026',
        format: 'ODI',
        startDate: new Date().toISOString(),
        status: 'ongoing',
        winnerTeamName: 'India (Predicted)'
      },
      {
        _id: '2',
        name: 'Indian Premier League',
        season: '2027',
        format: 'T20',
        startDate: new Date().toISOString(),
        status: 'upcoming'
      }
    ]);
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      setMatches([
        {
          _id: 'm1',
          tournamentId: selectedTournament._id,
          matchType: 'Group Stage',
          venue: 'Wankhede Stadium',
          date: new Date().toISOString(),
          battingTeamName: 'Mumbai',
          bowlingTeamName: 'Chennai',
          status: 'completed'
        },
        {
          _id: 'm2',
          tournamentId: selectedTournament._id,
          matchType: 'Final',
          venue: 'Narendra Modi Stadium',
          date: new Date().toISOString(),
          battingTeamName: 'India',
          bowlingTeamName: 'Australia',
          status: 'live'
        }
      ]);
    } else {
      setMatches([]);
    }
  }, [selectedTournament]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex flex-col font-sans">
      
      {/* Header */}
      <header className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
            <Trophy className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">TOURNAMENTS</h1>
            <p className="text-slate-400 font-medium">Manage Competitions and Matches</p>
          </div>
        </div>
        
        <button 
          onClick={() => onNavigate("launcher")}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-bold shadow-md"
        >
          Exit Dashboard
        </button>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-8">
        
        {/* Left Col: Tournament List */}
        <div className="col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-indigo-400" />
              ACTIVE TOURNAMENTS
            </h2>
            <button className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white shadow-md">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {tournaments.map(t => (
              <div 
                key={t._id} 
                onClick={() => setSelectedTournament(t)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedTournament?._id === t._id 
                    ? "bg-indigo-900/30 border-indigo-500/50 shadow-lg shadow-indigo-500/10" 
                    : "bg-slate-900 border-slate-800 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-3 py-1 bg-slate-800 rounded-full text-slate-300 tracking-widest">{t.season} {t.format}</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                    t.status === 'ongoing' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mb-1">{t.name}</h3>
                
                {t.winnerTeamName && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-500 rounded-r-lg">
                    <span className="text-xs font-bold text-amber-500 block mb-1">ULTIMATE WINNER</span>
                    <span className="font-black text-white flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      {t.winnerTeamName}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Matches inside Tournament */}
        <div className="col-span-8">
          {selectedTournament ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl h-full">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">{selectedTournament.name}</h2>
                  <p className="text-slate-400 mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Season {selectedTournament.season}
                  </p>
                </div>
                <button className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                  <Plus className="w-5 h-5" />
                  Add Match
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 tracking-widest mb-4">MATCHES</h3>
                
                {matches.map(m => (
                  <div key={m._id} className="group p-6 bg-slate-950 border border-slate-800 hover:border-slate-600 rounded-2xl transition-all flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full tracking-widest ${
                          m.status === 'live' ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {m.status === 'live' ? '🔴 LIVE' : m.status.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{m.matchType}</span>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-black text-white">{m.battingTeamName}</span>
                          <span className="text-slate-500 font-bold text-sm">vs</span>
                          <span className="text-xl font-black text-white">{m.bowlingTeamName}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center gap-4 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.venue}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {m.status === 'live' && (
                        <button 
                          onClick={() => onNavigate("controller")}
                          className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                          <Activity className="w-5 h-5" /> Open Controller
                        </button>
                      )}
                      <button className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl">
              <div className="text-center">
                <Trophy className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-500">Select a Tournament</h3>
                <p className="text-slate-600">Choose a tournament from the left to view its matches</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
