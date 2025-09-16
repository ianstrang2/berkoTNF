// Season types for the frontend
export interface Season {
  id: string;
  startDate: string;
  halfDate: string;
  endDate: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeasonFormData {
  startDate: string;
  endDate: string;
}

export interface CreateSeasonResponse {
  success: boolean;
  data?: Season;
  error?: string;
}

export interface SeasonsListResponse {
  success: boolean;
  data?: Season[];
  error?: string;
}

export interface CurrentSeasonResponse {
  success: boolean;
  data?: Season | null;
  error?: string;
}

export interface ValidateMatchResponse {
  success: boolean;
  canCreate: boolean;
  season?: Season | null;
  error?: string;
}
