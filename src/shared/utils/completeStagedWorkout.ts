import { db } from '@/data/db';
import { getWeekStart, getDayStart } from '@/shared/hooks/useWeekPlan';
import type { StagedWorkout, StagedWorkoutType } from '@/types';

/**
 * When a workout/cardio/mobility session is completed, find the matching
 * staged workout for today and mark it as completed with a link to the log.
 *
 * Matching priority:
 *  1. Status 'active' + correct type + today's date
 *  2. Status 'pending' + correct type + today's date (first by orderInDay)
 */
export async function completeStagedWorkout(
  type: StagedWorkoutType,
  logId: string,
): Promise<void> {
  // Find the current week commit
  const weekStart = getWeekStart();
  const commit = await db.weekCommits.where('weekStartDate').equals(weekStart).first();
  if (!commit || commit.status === 'draft') return;

  // Get today's staged workouts of this type
  const todayStart = getDayStart();
  const allStaged = await db.stagedWorkouts
    .where('weekCommitId')
    .equals(commit.id)
    .toArray();

  const todayOfType = allStaged
    .filter((w) => {
      const wDay = new Date(w.date);
      wDay.setHours(0, 0, 0, 0);
      return wDay.getTime() === todayStart && w.type === type;
    })
    .sort((a, b) => a.orderInDay - b.orderInDay);

  if (todayOfType.length === 0) return;

  // Prefer the one already marked 'active', otherwise take the first pending
  const target =
    todayOfType.find((w) => w.status === 'active') ??
    todayOfType.find((w) => w.status === 'pending');

  if (!target) return;

  const now = Date.now();
  const updates: Partial<StagedWorkout> = {
    status: 'completed',
    updatedAt: now,
  };
  if (type === 'lift') updates.completedWorkoutLogId = logId;
  else if (type === 'cardio') updates.completedCardioSessionId = logId;
  else updates.completedMobilityLogId = logId;

  await db.stagedWorkouts.update(target.id, updates);
}
