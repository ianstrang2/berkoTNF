export interface BrokenPb {
  metric_type: string;
  value: number;
  previous_best_value: number;
}

export interface PlayerPbData {
  name: string;
  pbs: BrokenPb[];
}

export interface PersonalBestsAPIResponseData {
  match_id: number;
  match_date: Date;
  broken_pbs_data: {
    [playerId: string]: PlayerPbData;
  };
} 