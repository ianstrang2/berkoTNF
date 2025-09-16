'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlayerProfile } from '@/types/player.types';

interface Runner {
  name: string;
  points?: number;
  goals?: number;
  selected_club?: {
    name: string;
    filename: string;
  } | null;
}

interface SeasonWinner {
  season_id: number;
  season_name: string;
  winners: {
    winner: string;
    winner_points: number;
    selected_club?: {
      name: string;
      filename: string;
    } | null;
    runners_up?: Runner[];
  };
}

interface TopScorer {
  season_id: number;
  season_name: string;
  scorers: {
    winner: string;
    winner_goals: number;
    selected_club?: {
      name: string;
      filename: string;
    } | null;
    runners_up?: Runner[];
  };
}

interface StreakHolder {
  name: string;
  streak: number;
  start_date: string;
  end_date: string;
}

interface GoalRecord {
  name: string;
  goals: number;
  date: string;
}

interface BiggestVictory {
  date: string;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string;
  team_b_players: string;
  winning_team: 'A' | 'B';
}

interface Records {
  most_goals_in_game?: GoalRecord[];
  consecutive_goals?: {
    holders: StreakHolder[];
  };
  biggest_victory?: BiggestVictory[];
  streaks?: {
    'Win Streak'?: {
      holders: StreakHolder[];
    };
    'Loss Streak'?: {
      holders: StreakHolder[];
    };
    'No Win Streak'?: {
      holders: StreakHolder[];
    };
    'Undefeated Streak'?: {
      holders: StreakHolder[];
    };
  };
}

interface LegendsData {
  seasonWinners: SeasonWinner[];
  topScorers: TopScorer[];
}

interface LegendsProps {
  initialView?: 'winners' | 'scorers';
}

const Legends: React.FC<LegendsProps> = ({ initialView = 'winners' }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'winners' | 'scorers'>(initialView);
  const [data, setData] = useState<LegendsData>({
    seasonWinners: [],
    topScorers: []
  });
  const [allPlayers, setAllPlayers] = useState<PlayerProfile[]>([]);

  // Update activeTab when initialView changes
  useEffect(() => {
    setActiveTab(initialView);
  }, [initialView]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch honourroll and players in parallel
        const [honourRollResponse, playersResponse] = await Promise.all([
          fetch('/api/honourroll'),
          fetch('/api/players')
        ]);

        const result = await honourRollResponse.json();
        
        if (result.data) {
          const modifiedData = {
            seasonWinners: result.data.seasonWinners,
            topScorers: result.data.topScorers
          };
          setData(modifiedData);
        }

        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          // The API now returns full PlayerProfile objects, so no transformation is needed.
          setAllPlayers(playersData.data || []);
        } else {
          console.warn('Failed to fetch players for Legends component');
          setAllPlayers([]);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching legends:', error);
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  // Added getPlayerIdByName (copied from other components)
  const getPlayerIdByName = (name: string): string | undefined => {
    if (!name) return undefined; // Handle cases where name might be null or undefined
    const player = allPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
    return player?.id;
  };

  const renderPlayerWithLink = (name: string) => {
    const playerId = getPlayerIdByName(name);
    if (playerId) {
      return (
        <Link href={`/players/${playerId}`} className="hover:underline">
          {name}
        </Link>
      );
    }
    return <>{name}</>; // Render as plain text if no ID
  };

  const renderSeasonWinners = () => (
    <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6 lg:w-fit">
      <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
        <h5 className="mb-0">Season Winners</h5>
      </div>
      {/* Container for horizontal scrolling only */}
      <div className="overflow-x-auto">
        <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500 relative">
          <thead className="align-bottom">
            <tr>
              {/* Sticky Headers */}
              <th className="sticky left-0 z-40 px-2 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-8">
                Season
              </th>
              <th className="sticky left-8 z-40 px-1 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-10"></th> {/* Icon Placeholder */}
              <th className="sticky left-[4.5rem] z-40 px-2 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[120px]">
                Champion
              </th>
              {/* Scrollable Headers */}
              <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-24">
                Points
              </th>
              <th className="px-6 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[200px]">
                Runners Up
              </th>
            </tr>
          </thead>
          <tbody>
            {data.seasonWinners.map((season) => (
              <tr key={season.season_id} className="hover:bg-gray-50">
                {/* Sticky Data */}
                <td className="sticky left-0 z-20 p-2 text-center align-middle bg-white border-b whitespace-nowrap w-8">
                  <span className="font-normal leading-normal text-sm">{season.season_name}</span>
                </td>
                <td className="sticky left-8 z-20 p-2 align-middle bg-white border-b whitespace-nowrap w-10">
                  {/* Champion Icon */}
                  {season.winners.selected_club ? (
                    <img
                      src={`/club-logos-40px/${season.winners.selected_club.filename}`}
                      alt={season.winners.selected_club.name}
                      className="w-8 h-8"
                    />
                  ) : (
                    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  )}
                </td>
                <td className="sticky left-[4.5rem] z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[120px]">
                  <div className="flex px-2 py-1">
                    <div className="flex flex-col justify-center">
                      <h6 className="mb-0 leading-normal text-sm font-semibold">
                        {renderPlayerWithLink(season.winners.winner)}
                      </h6>
                    </div>
                  </div>
                </td>
                {/* Scrollable Data */}
                <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap w-24">
                  <span className="font-normal leading-normal text-sm">{season.winners.winner_points}</span>
                </td>
                <td className="p-2 align-middle bg-transparent border-b min-w-[200px]">
                  <span className="font-normal leading-normal text-sm">
                    {season.winners.runners_up?.map((runner, idx) => {
                      const runnerContent = <>{renderPlayerWithLink(runner.name)} ({runner.points})</>;
                      return (
                        <React.Fragment key={idx}>
                          {runnerContent}
                          {idx < (season.winners.runners_up?.length ?? 0) - 1 ? ', ' : ''}
                        </React.Fragment>
                      );
                    })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTopScorers = () => (
    <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6 lg:w-fit">
      <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
        <h5 className="mb-0">Top Scorers</h5>
      </div>
      {/* Container for horizontal scrolling only */}
      <div className="overflow-x-auto">
        <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500 relative">
          <thead className="align-bottom">
            <tr>
              {/* Sticky Headers */}
              <th className="sticky left-0 z-40 px-2 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-8">
                Season
              </th>
              <th className="sticky left-8 z-40 px-1 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-10"></th> {/* Icon Placeholder */}
              <th className="sticky left-[4.5rem] z-40 px-2 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[120px]">
                Top Scorer
              </th>
              {/* Scrollable Headers */}
              <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-24">
                Goals
              </th>
              <th className="px-6 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[200px]">
                Runners Up
              </th>
            </tr>
          </thead>
          <tbody>
            {data.topScorers.map((season) => (
              <tr key={season.season_name} className="hover:bg-gray-50">
                {/* Sticky Data */}
                <td className="sticky left-0 z-20 p-2 text-center align-middle bg-white border-b whitespace-nowrap w-8">
                  <span className="font-normal leading-normal text-sm">{season.season_name}</span>
                </td>
                <td className="sticky left-8 z-20 p-2 align-middle bg-white border-b whitespace-nowrap w-10">
                  {/* Top Scorer (Champion) Icon */}
                  {season.scorers.selected_club ? (
                    <img
                      src={`/club-logos-40px/${season.scorers.selected_club.filename}`}
                      alt={season.scorers.selected_club.name}
                      className="w-8 h-8"
                    />
                  ) : (
                    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  )}
                </td>
                <td className="sticky left-[4.5rem] z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[120px]">
                  <div className="flex px-2 py-1">
                    <div className="flex flex-col justify-center">
                      <h6 className="mb-0 leading-normal text-sm font-semibold">
                        {renderPlayerWithLink(season.scorers.winner)}
                      </h6>
                    </div>
                  </div>
                </td>
                {/* Scrollable Data */}
                <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap w-24">
                  <span className="font-normal leading-normal text-sm">{season.scorers.winner_goals}</span>
                </td>
                <td className="p-2 align-middle bg-transparent border-b min-w-[200px]">
                  <span className="font-normal leading-normal text-sm">
                    {season.scorers.runners_up?.map((runner, idx) => {
                      const runnerContent = <>{renderPlayerWithLink(runner.name)} ({runner.goals})</>;
                      return (
                        <React.Fragment key={idx}>
                          {runnerContent}
                          {idx < (season.scorers.runners_up?.length ?? 0) - 1 ? ', ' : ''}
                        </React.Fragment>
                      );
                    })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-wrap justify-start -mx-3">
        <div className="w-full max-w-full px-3 flex-none">
          <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
            <div className="text-center">
              <h6 className="mb-2 text-lg">Loading...</h6>
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap -mx-3 max-w-screen-2xl mx-auto">
      {/* Single table display controlled by tertiary navigation */}
      <div className="w-full px-3 mb-4">
        {activeTab === 'winners' && renderSeasonWinners()}
        {activeTab === 'scorers' && renderTopScorers()}
      </div>
    </div>
  );
};

export default Legends; 