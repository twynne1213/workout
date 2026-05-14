import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import type { WorkoutSet } from '@/types';

export interface PreviousSetData {
  weight: number | null;
  reps: number | null;
}

/**
 * Returns a map of exerciseId → array of previous sets (from the most recent
 * workout containing that exercise). Used to populate the "Prev" column.
 */
export function usePreviousSets(exerciseIds: string[]) {
  return useLiveQuery(async () => {
    if (exerciseIds.length === 0) return new Map<string, PreviousSetData[]>();

    const allLogs = await db.workoutLogs
      .orderBy('startedAt')
      .reverse()
      .toArray();

    const result = new Map<string, PreviousSetData[]>();

    for (const exId of exerciseIds) {
      // Find the most recent completed workout containing this exercise
      for (const log of allLogs) {
        const entry = log.exercises.find((e) => e.exerciseId === exId);
        if (entry) {
          const completedSets = entry.sets.filter((s) => s.completedAt);
          if (completedSets.length > 0) {
            result.set(
              exId,
              completedSets.map((s) => ({ weight: s.weight, reps: s.reps }))
            );
            break;
          }
        }
      }
    }

    return result;
  }, [exerciseIds.join(',')]);
}

/**
 * Returns the personal record (heaviest single-set weight) for each exercise.
 */
export function usePersonalRecords(exerciseIds: string[]) {
  return useLiveQuery(async () => {
    if (exerciseIds.length === 0) return new Map<string, { weight: number; reps: number }>();

    const allLogs = await db.workoutLogs.toArray();
    const result = new Map<string, { weight: number; reps: number }>();

    for (const log of allLogs) {
      for (const entry of log.exercises) {
        if (!exerciseIds.includes(entry.exerciseId)) continue;
        for (const set of entry.sets) {
          if (!set.completedAt || !set.weight || !set.reps) continue;
          const current = result.get(entry.exerciseId);
          if (!current || set.weight > current.weight) {
            result.set(entry.exerciseId, { weight: set.weight, reps: set.reps });
          }
        }
      }
    }

    return result;
  }, [exerciseIds.join(',')]);
}

/**
 * Returns all historical sets for a single exercise, sorted by date.
 * Used for progress charts on ExerciseDetailPage.
 */
export function useExerciseProgressData(exerciseId: string | undefined) {
  return useLiveQuery(async () => {
    if (!exerciseId) return [];

    const allLogs = await db.workoutLogs
      .orderBy('startedAt')
      .toArray();

    const dataPoints: Array<{
      date: number;
      topWeight: number;
      totalVolume: number;
      estimated1RM: number;
      sets: number;
    }> = [];

    for (const log of allLogs) {
      const entry = log.exercises.find((e) => e.exerciseId === exerciseId);
      if (!entry) continue;

      const completedSets = entry.sets.filter((s) => s.completedAt && s.weight && s.reps);
      if (completedSets.length === 0) continue;

      const topSet = completedSets.reduce(
        (best, s) => (s.weight! > best.weight! ? s : best),
        completedSets[0]
      );

      const totalVolume = completedSets.reduce(
        (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
        0
      );

      // Epley formula for estimated 1RM
      const estimated1RM =
        topSet.reps === 1
          ? topSet.weight!
          : topSet.weight! * (1 + topSet.reps! / 30);

      dataPoints.push({
        date: log.startedAt,
        topWeight: topSet.weight!,
        totalVolume,
        estimated1RM: Math.round(estimated1RM),
        sets: completedSets.length,
      });
    }

    return dataPoints;
  }, [exerciseId]);
}
