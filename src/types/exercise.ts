export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quadriceps' | 'hamstrings' | 'glutes' | 'calves'
  | 'core' | 'forearms' | 'traps' | 'full_body';

export type ExerciseCategory = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'band';

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  category: ExerciseCategory;
  isCustom: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  _deleted?: boolean;
  _synced?: boolean;
}
