/**
 * Dev helper: seeds a sample WeekCommit + StagedWorkouts so the Today
 * checklist and week strip can be tested without the coach generating a plan.
 *
 * Usage: call seedSampleWeek() from browser console or a dev button.
 * It's idempotent — if a commit already exists for this week, it skips.
 */
import { nanoid } from 'nanoid';
import { db } from '@/data/db';
import { getWeekStart } from '@/shared/hooks/useWeekPlan';
import type { WeekCommit, StagedWorkout } from '@/types';

export async function seedSampleWeek(): Promise<boolean> {
  const weekStart = getWeekStart();

  // Skip if already seeded
  const existing = await db.weekCommits.where('weekStartDate').equals(weekStart).first();
  if (existing) return false;

  const now = Date.now();
  const commitId = nanoid();

  const commit: WeekCommit = {
    id: commitId,
    weekStartDate: weekStart,
    status: 'committed',
    goalIds: [],
    coachNotes: 'Sample week plan for testing. Push/Pull/Legs with cardio and mobility.',
    conversationSnapshot: [],
    adjustmentLog: [],
    createdAt: now,
    updatedAt: now,
  };

  // Build dates for each day of the week
  const mondayDate = new Date(weekStart);
  const dayDate = (offset: number) => {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const workouts: StagedWorkout[] = [
    // Monday: Dynamic stretch + Push Day
    {
      id: nanoid(), weekCommitId: commitId,
      date: dayDate(0), dayOfWeek: 1, orderInDay: 0,
      type: 'mobility', status: 'pending',
      title: 'Morning Dynamic Stretches',
      description: 'Arm circles, leg swings, hip openers',
      estimatedMinutes: 10,
      createdAt: now, updatedAt: now,
    },
    {
      id: nanoid(), weekCommitId: commitId,
      date: dayDate(0), dayOfWeek: 1, orderInDay: 1,
      type: 'lift', status: 'pending',
      title: 'Push Day',
      description: 'Bench 5x5, OHP 3x8, Flies 3x12',
      estimatedMinutes: 50,
      createdAt: now, updatedAt: now,
    },

    // Tuesday: Easy run + post-run stretch
    {
      id: nanoid(), weekCommitId: commitId,
      date: dayDate(1), dayOfWeek: 2, orderInDay: 0,
      type: 'cardio', status: 'pending',
      title: 'Easy 3mi Run',
      description: 'Zone 2, conversational pace',
      estimatedMinutes: 30,
      createdAt: now, updatedAt: now,
    },
    {
      id: nanoid(), weekCommitId: commitId,
      date: dayDate(1), dayOfWeek: 2, orderInDay: 1,
      type: 'mobility', status: 'pending',
      title: 'Post-Run Stretches',
      description: 'Hamstrings, hip flexors, calves',
      estimatedMinutes: 10,
      createdAt: now, updatedAt: now,
    },

    // Wednesday: Pull Day
    {
      id: nanoid(), weekCommitId: commitId,
      date: dayDate(2), dayOfWeek: 3, orderInDay: 0,
      type: 'mobility', status: 'pending',
      title: 'Pre-Workout Warmup',
      description: 'Band pull-aparts, shoulder dislocates',
      estimatedMinutes: 8,
      createdAt: now, updatedAt: now,
    },
    {
      id: nanoid(), weekCommitId: commitId,
      date: dayDate(2), dayOfWeek: 3, orderInDay: 1,
      type: 'lift', status: 'pending',
      title: 'Pull Day',
      description: 'Deadlift 3x5, Rows 4x8, Curls 3x12',
      estimatedMinutes: 55,
      createdAt: now, updatedAt: now,
    },

    // Thursday: Rest (no staged workouts)

    // Friday: Legs + short run
    {
      id: nanoid(), weekCommitId: commitId,
      date: dayDate(4), dayOfWeek: 5, orderInDay: 0,
      type: 'lift', status: 'pending',
      title: 'Leg Day',
      description: 'Squat 5x5, RDL 3x10, Leg Press 3x12',
      estimatedMinutes: 55,
      createdAt: now, updatedAt: now,
    },
    {
      id: nanoid(), weekCommitId: commitId,
      date: dayDate(4), dayOfWeek: 5, orderInDay: 1,
      type: 'mobility', status: 'pending',
      title: 'Post-Leg Stretches',
      description: 'Quads, glutes, IT band foam roll',
      estimatedMinutes: 12,
      createdAt: now, updatedAt: now,
    },

    // Saturday: Long run
    {
      id: nanoid(), weekCommitId: commitId,
      date: dayDate(5), dayOfWeek: 6, orderInDay: 0,
      type: 'cardio', status: 'pending',
      title: 'Long Run 5mi',
      description: 'Easy pace, building base mileage',
      estimatedMinutes: 50,
      createdAt: now, updatedAt: now,
    },

    // Sunday: Active recovery
    {
      id: nanoid(), weekCommitId: commitId,
      date: dayDate(6), dayOfWeek: 0, orderInDay: 0,
      type: 'mobility', status: 'pending',
      title: 'Full Body Mobility',
      description: 'Yoga flow + foam rolling, 20 min',
      estimatedMinutes: 20,
      createdAt: now, updatedAt: now,
    },
  ];

  await db.weekCommits.add(commit);
  await db.stagedWorkouts.bulkAdd(workouts);

  return true;
}
