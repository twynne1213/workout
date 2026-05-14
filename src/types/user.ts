import type { TrainingGoal } from './plan';

export type WeightUnit = 'kg' | 'lbs';
export type DistanceUnit = 'km' | 'mi';

export interface UserProfile {
  id: string;
  email?: string;
  displayName?: string;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  bodyweightKg?: number;
  heightCm?: number;
  dateOfBirth?: string;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: TrainingGoal[];
  darkMode: boolean;
  createdAt: number;
  updatedAt: number;
}
