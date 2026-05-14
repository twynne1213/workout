import type { MuscleGroup } from './exercise';

export type StretchCategory = 'dynamic' | 'static' | 'foam_roll' | 'band';
export type MobilityTiming = 'morning' | 'pre_workout' | 'post_workout' | 'evening' | 'any';

export interface Stretch {
  id: string;
  name: string;
  category: StretchCategory;
  targetAreas: MuscleGroup[];
  defaultDurationSeconds: number;
  description?: string;
  isCustom: boolean;
  createdAt: number;
  updatedAt: number;
  _deleted?: boolean;
  _synced?: boolean;
}

export interface SequenceStretch {
  stretchId: string;
  order: number;
  durationSeconds: number;
  sides?: 'both' | 'left_right';
}

export interface MobilitySequence {
  id: string;
  name: string;
  timing: MobilityTiming;
  stretches: SequenceStretch[];
  linkedRoutineId?: string;
  totalDuration: number;
  createdAt: number;
  updatedAt: number;
  _deleted?: boolean;
  _synced?: boolean;
}

export interface MobilityLog {
  id: string;
  sequenceId: string;
  timing: MobilityTiming;
  completedStretches: string[];
  duration: number;
  completedAt: number;
  linkedWorkoutId?: string;
  createdAt: number;
  updatedAt: number;
  _deleted?: boolean;
  _synced?: boolean;
}
