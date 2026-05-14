import { nanoid } from 'nanoid';
import { db } from '@/data/db';
import { getWeekStart } from '@/shared/hooks/useWeekPlan';
import type { StagedWorkout, StagedWorkoutType } from '@/types';

export type AdjustmentAction =
  | { type: 'skip'; title: string }
  | { type: 'move'; title: string; toDay: string }
  | { type: 'swap'; title: string; toDay: string; newType: StagedWorkoutType; newTitle: string; newDescription: string }
  | { type: 'add'; day: string; activityType: StagedWorkoutType; title: string; description: string };

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function parseDay(dayStr: string): number | undefined {
  return DAY_MAP[dayStr.toLowerCase().trim()];
}

function inferType(tag: string): StagedWorkoutType {
  const lower = tag.toLowerCase();
  if (lower.includes('lift') || lower.includes('strength') || lower.includes('weight')) return 'lift';
  if (lower.includes('cardio') || lower.includes('run') || lower.includes('cycle') || lower.includes('swim')) return 'cardio';
  if (lower.includes('mobil') || lower.includes('stretch') || lower.includes('yoga') || lower.includes('foam')) return 'mobility';
  return 'lift';
}

/**
 * Parse [ADJUST] lines from coach response.
 */
export function parseAdjustments(text: string): AdjustmentAction[] {
  const actions: AdjustmentAction[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('[ADJUST]')) continue;

    const content = trimmed.slice(8).trim();

    // SKIP "Title"
    const skipMatch = content.match(/^SKIP\s+"([^"]+)"/i);
    if (skipMatch) {
      actions.push({ type: 'skip', title: skipMatch[1] });
      continue;
    }

    // MOVE "Title" -> Day
    const moveMatch = content.match(/^MOVE\s+"([^"]+)"\s*->\s*(\w+)/i);
    if (moveMatch) {
      actions.push({ type: 'move', title: moveMatch[1], toDay: moveMatch[2] });
      continue;
    }

    // SWAP "Title" -> Day: [Type] New Title — description
    const swapMatch = content.match(/^SWAP\s+"([^"]+)"\s*->\s*(\w+):\s*\[([^\]]+)\]\s*(.+)$/i);
    if (swapMatch) {
      const rest = swapMatch[4];
      const sepMatch = rest.match(/^(.+?)\s*(?:—|–|-)\s*(.+)$/);
      actions.push({
        type: 'swap',
        title: swapMatch[1],
        toDay: swapMatch[2],
        newType: inferType(swapMatch[3]),
        newTitle: sepMatch ? sepMatch[1].trim() : rest.trim(),
        newDescription: sepMatch ? sepMatch[2].trim() : '',
      });
      continue;
    }

    // ADD Day: [Type] Title — description
    const addMatch = content.match(/^ADD\s+(\w+):\s*\[([^\]]+)\]\s*(.+)$/i);
    if (addMatch) {
      const rest = addMatch[3];
      const sepMatch = rest.match(/^(.+?)\s*(?:—|–|-)\s*(.+)$/);
      actions.push({
        type: 'add',
        day: addMatch[1],
        activityType: inferType(addMatch[2]),
        title: sepMatch ? sepMatch[1].trim() : rest.trim(),
        description: sepMatch ? sepMatch[2].trim() : '',
      });
      continue;
    }
  }

  return actions;
}

/**
 * Check if a message contains any adjustment actions.
 */
export function hasAdjustments(text: string): boolean {
  return /\[ADJUST\]/i.test(text);
}

/**
 * Get a human-readable summary of each adjustment action.
 */
export function describeAction(action: AdjustmentAction): string {
  switch (action.type) {
    case 'skip':
      return `Skip "${action.title}"`;
    case 'move':
      return `Move "${action.title}" to ${action.toDay}`;
    case 'swap':
      return `Replace "${action.title}" with "${action.newTitle}" on ${action.toDay}`;
    case 'add':
      return `Add "${action.title}" on ${action.day}`;
  }
}

/**
 * Apply approved adjustments to the staged workouts in the DB.
 */
export async function applyAdjustments(
  actions: AdjustmentAction[],
  weekCommitId: string,
): Promise<string[]> {
  const allStaged = await db.stagedWorkouts
    .where('weekCommitId')
    .equals(weekCommitId)
    .toArray();

  const weekStart = getWeekStart();
  const now = Date.now();
  const applied: string[] = [];

  for (const action of actions) {
    switch (action.type) {
      case 'skip': {
        const target = findByTitle(allStaged, action.title);
        if (target) {
          await db.stagedWorkouts.update(target.id, { status: 'skipped', updatedAt: now });
          applied.push(`Skipped "${action.title}"`);
        }
        break;
      }

      case 'move': {
        const target = findByTitle(allStaged, action.title);
        const dow = parseDay(action.toDay);
        if (target && dow !== undefined) {
          const newDate = dayToEpoch(weekStart, dow);
          // Put it at the end of that day's order
          const dayWorkouts = allStaged.filter((w) => w.dayOfWeek === dow);
          const maxOrder = dayWorkouts.reduce((max, w) => Math.max(max, w.orderInDay), -1);
          await db.stagedWorkouts.update(target.id, {
            date: newDate,
            dayOfWeek: dow,
            orderInDay: maxOrder + 1,
            updatedAt: now,
          });
          applied.push(`Moved "${action.title}" to ${action.toDay}`);
        }
        break;
      }

      case 'swap': {
        const target = findByTitle(allStaged, action.title);
        const dow = parseDay(action.toDay);
        if (target && dow !== undefined) {
          const newDate = dayToEpoch(weekStart, dow);
          await db.stagedWorkouts.update(target.id, {
            type: action.newType,
            title: action.newTitle,
            description: action.newDescription || undefined,
            date: newDate,
            dayOfWeek: dow,
            updatedAt: now,
          });
          applied.push(`Replaced "${action.title}" with "${action.newTitle}"`);
        }
        break;
      }

      case 'add': {
        const dow = parseDay(action.day);
        if (dow !== undefined) {
          const newDate = dayToEpoch(weekStart, dow);
          const dayWorkouts = allStaged.filter((w) => w.dayOfWeek === dow);
          const maxOrder = dayWorkouts.reduce((max, w) => Math.max(max, w.orderInDay), -1);
          const workout: StagedWorkout = {
            id: nanoid(),
            weekCommitId,
            date: newDate,
            dayOfWeek: dow,
            orderInDay: maxOrder + 1,
            type: action.activityType,
            status: 'pending',
            title: action.title,
            description: action.description || undefined,
            createdAt: now,
            updatedAt: now,
          };
          await db.stagedWorkouts.add(workout);
          applied.push(`Added "${action.title}" on ${action.day}`);
        }
        break;
      }
    }
  }

  // Log the adjustment on the week commit
  if (applied.length > 0) {
    const commit = await db.weekCommits.get(weekCommitId);
    if (commit) {
      const entry = {
        timestamp: now,
        description: applied.join('; '),
        changedWorkoutIds: [],
      };
      await db.weekCommits.update(weekCommitId, {
        adjustmentLog: [...commit.adjustmentLog, entry],
        updatedAt: now,
      });
    }
  }

  return applied;
}

function findByTitle(workouts: StagedWorkout[], title: string): StagedWorkout | undefined {
  // Exact match first
  const exact = workouts.find(
    (w) => w.title.toLowerCase() === title.toLowerCase() && w.status !== 'completed' && w.status !== 'skipped'
  );
  if (exact) return exact;

  // Partial match
  return workouts.find(
    (w) => w.title.toLowerCase().includes(title.toLowerCase()) && w.status !== 'completed' && w.status !== 'skipped'
  );
}

function dayToEpoch(weekStart: number, dow: number): number {
  const monday = new Date(weekStart);
  let offset = dow - 1;
  if (dow === 0) offset = 6;
  const d = new Date(monday);
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
