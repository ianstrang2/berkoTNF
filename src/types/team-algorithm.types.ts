// team-algorithm.types.ts

import { PlayerProfile, Club } from '@/types/player.types';

// Slot-related types
export interface Slot {
  slot_number: number;
  player_id: string | null;
  team?: string;
  position?: string | null;
}

export interface PlayerSlotProps {
  slotNumber: number;
  player: PlayerProfile | undefined;
  players: PlayerProfile[];
  onSelect: (slotIndex: number, playerId: string) => Promise<boolean>;
  disabled: boolean;
  stats: string;
  position: string;
  highlighted: boolean;
}

// Team structure types
export interface TeamStructure {
  name: string;
  slots: {
    defenders: number[];
    midfielders: number[];
    attackers: number[];
  };
}

export interface SlotInfo {
  team: TeamStructure;
  position: string;
}

export interface PositionGroup {
  title: string;
  slots: number[];
  position: string;
  startSlot: number;
  endSlot: number;
}

// Team statistics types
export interface TeamCharacteristics {
  resilience: number;
  teamwork: number;
}

export interface Stats {
  diffs: {
    defense: {
      goalscoring: number;
      defending: number;
      staminaPace: number;
      control: number;
      teamwork: number;
      resilience: number;
    };
    midfield: {
      goalscoring: number;
      defending: number;
      staminaPace: number;
      control: number;
      teamwork: number;
      resilience: number;
    };
    attack: {
      goalscoring: number;
      defending: number;
      staminaPace: number;
      control: number;
      teamwork: number;
      resilience: number;
    };
  };
  balanceScore: number;
  balancePercentage: number;
  rawBalanceScore?: string;
}

export interface StatBarProps {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
}

// UI-related types
export interface WarningMessage {
  type: 'warning' | 'error';
  message: string;
}

// Match-related types
export interface Match {
  match_id: string;
  upcoming_match_id?: string;
  match_date: string;
  team_size: number;
  is_balanced: boolean;
  date: string;
  team_a_name?: string;
  team_b_name?: string;
  players?: Array<{
    id: string;
    team?: string;
    slot_number?: number;
    position?: string;
  }>;
}

export interface NewMatchData {
  match_date: string;
  team_size: number;
  date: string;
}

// Form-related types
export interface PlayerFormData {
  name: string;
  phone?: string | null;
  authUserId?: string | null;
  isAdmin?: boolean;
  isRinger: boolean;
  isRetired: boolean;
  goalscoring: number;
  defending: number;
  staminaPace: number;
  control: number;
  teamwork: number;
  resilience: number;
  club?: Club | null;
}

export interface MatchFormData {
  match_date: string;
  team_size: number;
  maxPlayers?: number;
  pendingPlayers?: Set<number>;
}

// Drag and drop types
export interface DragItem {
  slotNumber: number;
  player: PlayerProfile;
}

// Component Props types
export interface TeamSectionProps {
  teamType: 'a' | 'b';
  slots: Slot[];
  players: PlayerProfile[];
  positionGroups: PositionGroup[];
  onSelect: (slotIndex: number, playerId: string) => Promise<boolean>;
  onDragStart: (slotNumber: number, player: PlayerProfile) => void;
  onDragOver: (e: React.DragEvent, slotNumber: number) => void;
  onDrop: (e: React.DragEvent, slotNumber: number) => void;
  onTap: (slotNumber: number) => void;
  isLoading: boolean;
  highlightedSlot: number | null;
  selectedSlot: number | null;
  getAvailablePlayers: (slot: Slot) => PlayerProfile[];
  isReadOnly?: boolean;
}

export interface TeamStatsProps {
  teamType: 'a' | 'b';
  stats: TeamStats | null;
}

export interface ComparativeStatsProps {
  stats: Stats | null;
}

export interface PlayerPoolProps {
  allPlayers: PlayerProfile[];
  selectedPlayers: PlayerProfile[];
  onTogglePlayer: (player: PlayerProfile) => void;
  teamSize: number;
  onBalanceTeams: () => void;
  isBalancing: boolean;
  maxPlayers?: number;
  pendingPlayers?: Set<number>;
}

export interface DraggablePlayerSlotProps extends PlayerSlotProps {
  onDragStart: (slotNumber: number, player: PlayerProfile) => void;
  onDragOver: (e: React.DragEvent, slotNumber: number) => void;
  onDrop: (e: React.DragEvent, slotNumber: number) => void;
  onTap: (slotNumber: number) => void;
  teamColor: string;
  isReadOnly?: boolean;
}

// Statistics interfaces
export interface TeamStats {
  defense: {
    goalscoring: number;
    defending: number;
    staminaPace: number;
    control: number;
    teamwork: number;
    resilience: number;
  };
  midfield: {
    goalscoring: number;
    defending: number;
    staminaPace: number;
    control: number;
    teamwork: number;
    resilience: number;
  };
  attack: {
    goalscoring: number;
    defending: number;
    staminaPace: number;
    control: number;
    teamwork: number;
    resilience: number;
  };
  playerCount: number;
}

export interface ComparativeStats {
  diffs: Record<string, number>;
  balanceScore: number;
  balanceQuality: string;
  rawBalanceScore?: string;
}

// API response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
} 