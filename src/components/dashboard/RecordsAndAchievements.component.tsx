'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FeatBreakingItem, RecordsTimelineItem, generateFeatContent } from '@/types/feat-breaking.types';
import { getFeatIcon } from '@/components/icons/FeatIcons.component';
import FireIcon from '@/components/icons/FireIcon.component';
import GrimReaperIcon from '@/components/icons/GrimReaperIcon.component';
import { apiFetch } from '@/lib/apiConfig';

interface PersonalBestsData {
  broken_pbs_data: {
    [playerId: string]: {
      name: string;
      pbs: {
        metric_type: string;
        value: number;
        previous_best_value?: number;
      }[];
    };
  };
}

interface MatchReportData {
  matchInfo: {
    match_date: string;
    team_a_score: number;
    team_b_score: number;
    team_a_players: string[];
    team_b_players: string[];
  };
  featBreakingData?: FeatBreakingItem[];
}

const RecordsAndAchievements: React.FC = () => {
  const [timelineItems, setTimelineItems] = useState<RecordsTimelineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to format dates safely
  const formatDateSafely = useCallback((dateString: string | undefined | null): string => {
    if (!dateString) return new Date().toLocaleDateString('en-GB');
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return new Date().toLocaleDateString('en-GB');
      }
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date().toLocaleDateString('en-GB');
    }
  }, []);

  // Process feat-breaking data with comprehensive error handling
  const processFeatBreakingWithErrorHandling = useCallback((featData: unknown, matchDate: string): RecordsTimelineItem[] => {
    try {
      if (!featData || !Array.isArray(featData)) {
        console.warn('Invalid feat breaking data format:', typeof featData);
        return [];
      }
      
      return featData
        .filter((feat): feat is FeatBreakingItem => {
          if (!feat || typeof feat !== 'object') return false;
          if (!('feat_type' in feat) || !('player_name' in feat) || !('status' in feat)) return false;
          if (!['broken', 'equaled'].includes(feat.status)) return false;
          return true;
        })
        .map((feat, index) => {
          const Icon = getFeatIcon(feat.feat_type);
          return {
            type: feat.status === 'broken' ? 'feat_broken' : 'feat_equaled',
            feat_type: feat.feat_type,
            player: feat.player_name,
            playerId: feat.player_id ? String(feat.player_id) : undefined,
            content: generateFeatContent(feat),
            subtext: feat.current_record ? `Previous record: ${feat.current_record}` : undefined,
            icon: Icon,
            date: formatDateSafely(matchDate),
            color: feat.status === 'broken' ? 'red' : 'amber',
            previous_record_value: feat.current_record,
            key: `feat-${index}-${feat.feat_type}-${feat.player_id}`
          } as RecordsTimelineItem;
        })
        .slice(0, 10); // Limit to prevent UI overload
    } catch (error) {
      console.error('Error processing feat breaking data:', error);
      return [];
    }
  }, [formatDateSafely]);

  // Process personal bests data
  const processPersonalBests = useCallback((pbData: PersonalBestsData | null, matchDate: string): RecordsTimelineItem[] => {
    if (!pbData?.broken_pbs_data) return [];
    
    const items: RecordsTimelineItem[] = [];
    
    Object.values(pbData.broken_pbs_data).forEach((playerData, playerIndex) => {
      playerData.pbs.forEach((pb, pbIndex) => {
        const metricName = pb.metric_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        items.push({
          type: 'milestone',
          player: playerData.name,
          content: `Personal best: ${metricName}`,
          subtext: pb.previous_best_value ? `Previous: ${pb.previous_best_value}, New: ${pb.value}` : `${pb.value}`,
          icon: FireIcon,
          date: formatDateSafely(matchDate),
          color: 'green',
          key: `pb-${playerIndex}-${pbIndex}-${pb.metric_type}`
        } as RecordsTimelineItem);
      });
    });
    
    return items.slice(0, 5); // Limit personal bests
  }, [formatDateSafely]);

  // Fetch data from APIs
  const fetchTimelineData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [matchResponse, pbResponse] = await Promise.all([
        apiFetch('/matchReport'),
        apiFetch('/personal-bests')
      ]);
      
      let allTimelineItems: RecordsTimelineItem[] = [];
      
      // Process match report data with feat-breaking
      if (matchResponse.ok) {
        const matchResult = await matchResponse.json();
        if (matchResult.success && matchResult.data) {
          const matchData = matchResult.data as MatchReportData;
          const matchDate = matchData.matchInfo?.match_date;
          
          // Process feat-breaking data
          const featItems = processFeatBreakingWithErrorHandling(
            matchData.featBreakingData, 
            matchDate
          );
          allTimelineItems.push(...featItems);
        }
      }
      
      // Process personal bests data
      if (pbResponse.ok) {
        const pbResult = await pbResponse.json();
        if (pbResult.success && pbResult.data) {
          const matchDate = new Date().toISOString(); // Use current date as fallback
          const pbItems = processPersonalBests(pbResult.data, matchDate);
          allTimelineItems.push(...pbItems);
        }
      }
      
      // Sort by priority: feat breaking first, then personal bests, then by date
      allTimelineItems.sort((a, b) => {
        // Feat breaking events have higher priority
        if (a.type.includes('feat') && !b.type.includes('feat')) return -1;
        if (!a.type.includes('feat') && b.type.includes('feat')) return 1;
        
        // Then sort by date (most recent first)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      setTimelineItems(allTimelineItems.slice(0, 8)); // Limit total items
    } catch (error) {
      console.error('Error fetching timeline data:', error);
      setError('Failed to load achievement data');
    } finally {
      setLoading(false);
    }
  }, [processFeatBreakingWithErrorHandling, processPersonalBests]);

  useEffect(() => {
    fetchTimelineData();
  }, [fetchTimelineData]);

  // Timeline item component
  const TimelineItem: React.FC<{ item: RecordsTimelineItem }> = ({ item }) => {
    const IconComponent = item.icon;
    
    const colorClasses = {
      purple: 'bg-purple-100 text-purple-600 border-purple-200',
      amber: 'bg-amber-100 text-amber-600 border-amber-200', 
      green: 'bg-green-100 text-green-600 border-green-200',
      blue: 'bg-blue-100 text-blue-600 border-blue-200',
      red: 'bg-red-100 text-red-600 border-red-200'
    };
    
    const content = (
      <div className="flex items-start space-x-3 p-3 hover:bg-slate-50 transition-colors duration-200 rounded-lg">
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${colorClasses[item.color]}`}>
          <IconComponent className="w-4 h-4" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-900 truncate">
              {item.player}
            </p>
            <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
              {item.date}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            {item.content}
          </p>
          {item.subtext && (
            <p className="text-xs text-slate-500 mt-1">
              {item.subtext}
            </p>
          )}
        </div>
      </div>
    );
    
    // Wrap with link if playerId exists
    if (item.playerId) {
      return (
        <Link 
          href={`/player/profiles/${item.playerId}`}
          className="block hover:no-underline"
        >
          {content}
        </Link>
      );
    }
    
    return content;
  };

  if (loading) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="flex-auto p-6">
          <div className="mb-4">
            <h6 className="mb-1 text-lg font-semibold text-slate-700">Records & Achievements</h6>
            <p className="text-sm text-slate-500">Latest record-breaking moments and personal bests</p>
          </div>
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Loading achievements...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="flex-auto p-6">
          <div className="mb-4">
            <h6 className="mb-1 text-lg font-semibold text-slate-700">Records & Achievements</h6>
            <p className="text-sm text-slate-500">Latest record-breaking moments and personal bests</p>
          </div>
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
            <button 
              onClick={fetchTimelineData}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
      <div className="flex-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h6 className="mb-1 text-lg font-semibold text-slate-700">Records & Achievements</h6>
              <p className="text-sm text-slate-500">Latest record-breaking moments and personal bests</p>
            </div>
            <Link href="/player/records" className="text-sm text-purple-600 hover:text-purple-800 font-medium">
              View All →
            </Link>
          </div>
        </div>

        {/* Timeline */}
        {timelineItems.length > 0 ? (
          <div className="space-y-1">
            {timelineItems.map((item) => (
              <TimelineItem key={item.key} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FireIcon className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm">No recent achievements</p>
            <p className="text-slate-400 text-xs mt-1">Records and personal bests will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordsAndAchievements; 