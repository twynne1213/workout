export type CardioType = 'run' | 'cycle' | 'walk' | 'swim' | 'row' | 'elliptical';

export interface CardioSession {
  id: string;
  type: CardioType;
  distanceMeters: number | null;
  durationSeconds: number;
  avgPaceSecondsPerKm?: number | null;
  avgSpeedKmh?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  caloriesEstimate?: number | null;
  elevationGainMeters?: number | null;
  notes?: string;
  startedAt: number;
  completedAt: number;
  createdAt: number;
  updatedAt: number;
  _deleted?: boolean;
  _synced?: boolean;
}
