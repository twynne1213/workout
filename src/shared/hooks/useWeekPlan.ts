import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import type { StagedWorkout, WeekCommit } from '@/types';

/**
 * Returns the Monday 00:00:00 epoch of the current week.
 */
export function getWeekStart(date: Date = new Date()): number {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Returns the start-of-day epoch for a given date.
 */
export function getDayStart(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Returns the current week's commit (if any).
 */
export function useCurrentWeekCommit(): WeekCommit | undefined {
  const weekStart = getWeekStart();
  return useLiveQuery(
    () => db.weekCommits.where('weekStartDate').equals(weekStart).first(),
    [weekStart]
  );
}

/**
 * Returns all staged workouts for the current week, sorted by date + order.
 */
export function useWeekStagedWorkouts(weekCommitId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!weekCommitId) return [];
      return db.stagedWorkouts
        .where('weekCommitId')
        .equals(weekCommitId)
        .sortBy('date');
    },
    [weekCommitId]
  );
}

/**
 * Returns today's staged workouts, sorted by orderInDay.
 */
export function useTodayStagedWorkouts(weekCommitId: string | undefined) {
  const todayStart = getDayStart();
  return useLiveQuery(
    async () => {
      if (!weekCommitId) return [];
      const all = await db.stagedWorkouts
        .where('weekCommitId')
        .equals(weekCommitId)
        .toArray();
      return all
        .filter((w) => {
          const wDay = new Date(w.date);
          wDay.setHours(0, 0, 0, 0);
          return wDay.getTime() === todayStart;
        })
        .sort((a, b) => a.orderInDay - b.orderInDay);
    },
    [weekCommitId, todayStart]
  );
}

/**
 * Returns staged workouts for a specific type (lift/cardio/mobility) for today.
 */
export function useTodayStagedByType(
  weekCommitId: string | undefined,
  type: 'lift' | 'cardio' | 'mobility'
) {
  const today = useTodayStagedWorkouts(weekCommitId);
  return today?.filter((w) => w.type === type) ?? [];
}

/**
 * Returns all active goals.
 */
export function useActiveGoals() {
  return useLiveQuery(
    () => db.goals.where('status').equals('active').toArray()
  );
}
