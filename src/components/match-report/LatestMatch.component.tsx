'use client';
import React, { useState, useEffect } from 'react';

interface MatchInfo {
  match_date: string;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string[];
  team_b_players: string[];
  team_a_scorers?: string;
  team_b_scorers?: string;
}

interface LatestMatchData {
  matchInfo: MatchInfo;
}

const LatestMatch: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [matchData, setMatchData] = useState<LatestMatchData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [teamAName, setTeamAName] = useState<string>('Team A');
  const [teamBName, setTeamBName] = useState<string>('Team B');

  // Format date safely
  const formatDateSafely = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      // Use toLocaleDateString with explicit locale for consistency
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const fetchTeamNames = async () => {
    try {
      const response = await fetch('/api/admin/app-config?group=match_settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const teamAConfig = data.data.find((config: any) => config.config_key === 'team_a_name');
          const teamBConfig = data.data.find((config: any) => config.config_key === 'team_b_name');
          
          if (teamAConfig && teamAConfig.config_value) {
            setTeamAName(teamAConfig.config_value);
          }
          
          if (teamBConfig && teamBConfig.config_value) {
            setTeamBName(teamBConfig.config_value);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching team names:', error);
      // Fall back to default names if fetch fails
    }
  };

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/matchReport');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText || 'No details'}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setMatchData({
          matchInfo: result.data.matchInfo
        });
      } else {
        setError(new Error(result.error || 'Failed to fetch match data'));
      }
    } catch (error) {
      console.error('Error in fetchMatchData:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch match data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchData();
    fetchTeamNames();
  }, []);

  if (loading) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="p-4">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Loading match data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="p-4">
          <div className="text-center text-red-500">
            <p>Error loading match data</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!matchData || !matchData.matchInfo) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="p-4">
          <div className="text-center">
            <p className="text-slate-500">No recent match data available</p>
          </div>
        </div>
      </div>
    );
  }

  const { matchInfo } = matchData;
  
  return (
    <div className="animate-fade-in-up relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-6">
      {/* Header with Title and Date */}
      <div className="flex justify-between items-center mb-6">
        <h6 className="font-bold text-lg text-slate-700">Latest Match Result</h6>
        <div className="flex items-center text-sm text-slate-500">
          <i className="fas fa-calendar-alt text-slate-400 mr-2"></i>
          <span suppressHydrationWarning>{formatDateSafely(matchInfo.match_date)}</span>
        </div>
      </div>
      
      {/* Match Score Section */}
      <div className="flex justify-center items-center gap-8 mb-6">
        {/* Team A */}
        <div className="transition-soft transform hover:scale-105 hover:shadow-soft-xl flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-700 to-pink-500 text-white flex items-center justify-center shadow-soft-md">
            <span className="text-xl font-bold">A</span>
          </div>
          <h6 className="mt-2 text-sm font-semibold text-slate-700">{teamAName}</h6>
        </div>

        {/* Score */}
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-slate-800">
            {matchInfo.team_a_score} - {matchInfo.team_b_score}
          </h1>
          <p className="mt-0.5 text-sm uppercase text-slate-400 font-semibold">FINAL SCORE</p>
        </div>

        {/* Team B */}
        <div className="transition-soft transform hover:scale-105 hover:shadow-soft-xl flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-700 to-pink-500 text-white flex items-center justify-center shadow-soft-md">
            <span className="text-xl font-bold">B</span>
          </div>
          <h6 className="mt-2 text-sm font-semibold text-slate-700">{teamBName}</h6>
        </div>
      </div>
      
      {/* Team Players Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team A */}
        <div className="rounded-xl border border-slate-100 p-4">
          <h6 className="text-sm font-bold mb-4 text-slate-700">{teamAName}</h6>
          
          <div className="space-y-2">
            {matchInfo.team_a_players.map((player, index) => (
              <li key={`player-a-${index}`} className="animate-fade-in-up delay-100 flex items-center list-none" style={{animationFillMode: 'forwards'}}>
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 flex items-center justify-center text-xs font-semibold mr-3">
                  {index + 1}
                </div>
                <span className="text-sm text-slate-700">{player}</span>
              </li>
            ))}
          </div>
          
          {matchInfo.team_a_scorers && (
            <div className="mt-4 flex items-start">
              <i className="ni ni-football text-purple-600 mr-2 text-lg"></i>
              <div className="text-sm text-slate-600">
                {matchInfo.team_a_scorers}
              </div>
            </div>
          )}
        </div>
        
        {/* Team B */}
        <div className="rounded-xl border border-slate-100 p-4">
          <h6 className="text-sm font-bold mb-4 text-slate-700">{teamBName}</h6>
          
          <div className="space-y-2">
            {matchInfo.team_b_players.map((player, index) => (
              <li key={`player-b-${index}`} className="animate-fade-in-up delay-100 flex items-center list-none" style={{animationFillMode: 'forwards'}}>
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 flex items-center justify-center text-xs font-semibold mr-3">
                  {index + 1}
                </div>
                <span className="text-sm text-slate-700">{player}</span>
              </li>
            ))}
          </div>
          
          {matchInfo.team_b_scorers && (
            <div className="mt-4 flex items-start">
              <i className="ni ni-football text-purple-600 mr-2 text-lg"></i>
              <div className="text-sm text-slate-600">
                {matchInfo.team_b_scorers}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LatestMatch; 