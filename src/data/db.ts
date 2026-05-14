import Dexie, { type Table } from 'dexie';
import type {
  Exercise,
  Routine,
  WorkoutLog,
  CardioSession,
  Stretch,
  MobilitySequence,
  MobilityLog,
  TrainingPlan,
  CoachThread,
  UserProfile,
  Goal,
  WeekCommit,
  StagedWorkout,
} from '@/types';

export class FitnessDB extends Dexie {
  exercises!: Table<Exercise>;
  routines!: Table<Routine>;
  workoutLogs!: Table<WorkoutLog>;
  cardioSessions!: Table<CardioSession>;
  stretches!: Table<Stretch>;
  mobilitySequences!: Table<MobilitySequence>;
  mobilityLogs!: Table<MobilityLog>;
  trainingPlans!: Table<TrainingPlan>;
  coachThreads!: Table<CoachThread>;
  userProfile!: Table<UserProfile>;
  goals!: Table<Goal>;
  weekCommits!: Table<WeekCommit>;
  stagedWorkouts!: Table<StagedWorkout>;

  constructor() {
    super('FitnessDB');

    this.version(1).stores({
      exercises: 'id, name, *muscleGroups, category, isCustom, updatedAt, _synced',
      routines: 'id, name, lastPerformedAt, updatedAt, _synced',
      workoutLogs: 'id, routineId, startedAt, completedAt, updatedAt, _synced',
      cardioSessions: 'id, type, startedAt, completedAt, updatedAt, _synced',
      stretches: 'id, name, category, *targetAreas, isCustom, updatedAt, _synced',
      mobilitySequences: 'id, name, timing, linkedRoutineId, updatedAt, _synced',
      mobilityLogs: 'id, sequenceId, completedAt, linkedWorkoutId, updatedAt, _synced',
      trainingPlans: 'id, startDate, endDate, updatedAt, _synced',
      coachThreads: 'id, updatedAt',
      userProfile: 'id',
    });

    this.version(2).stores({
      // Updated table (added weekCommitId index)
      coachThreads: 'id, weekCommitId, updatedAt',

      // New tables
      goals: 'id, type, status, targetDate, updatedAt, _synced',
      weekCommits: 'id, weekStartDate, status, updatedAt, _synced',
      stagedWorkouts: 'id, weekCommitId, date, dayOfWeek, type, status, orderInDay, linkedGoalId, updatedAt, _synced',
    });
  }
}

export const db = new FitnessDB();
