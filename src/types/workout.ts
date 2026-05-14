export type SetType = 'working' | 'warmup' | 'dropset' | 'failure';

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  type: SetType;
  reps: number | null;
  weight: number | null;
  rpe?: number | null;
  isPersonalRecord: boolean;
  completedAt: number | null;
}

export interface WorkoutExerciseEntry {
  id: string;
  exerciseId: string;
  order: number;
  sets: WorkoutSet[];
  notes?: string;
  restSeconds: number;
}

export interface WorkoutLog {
  id: string;
  routineId?: string;
  name: string;
  startedAt: number;
  completedAt: number | null;
  exercises: WorkoutExerciseEntry[];
  totalVolume: number;
  duration: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  _deleted?: boolean;
  _synced?: boolean;
}

export interface RoutineExercise {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  exercises: RoutineExercise[];
  lastPerformedAt?: number;
  createdAt: number;
  updatedAt: number;
  _deleted?: boolean;
  _synced?: boolean;
}
