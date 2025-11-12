export enum Status {
  Eligible = 'Eligible',
  NotEligible = 'Not Eligible',
  Inactive = 'Inactive',
}

export interface Player {
  id: string;
  name: string;
  lastPlayed: string | null;
  eligibilityExpiresAt: string | null;
  status: Status;
}

export interface HistoryEntry {
  id: string;
  playerName: string;
  timestamp: string;
  action: string;
}

export type StatusFilter = 'All' | Status.Eligible | Status.NotEligible | Status.Inactive;
export type SortOption = 'status' | 'name' | 'time';

export type ManualOverridePayload = {
  status: Status;
  eligibilityExpiresAt: string | null;
};