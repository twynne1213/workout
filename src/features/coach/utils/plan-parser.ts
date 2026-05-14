import { nanoid } from 'nanoid';
import { getWeekStart } from '@/shared/hooks/useWeekPlan';
import type { StagedWorkout, StagedWorkoutType } from '@/types';

/**
 * Represents a parsed day from the coach's weekly plan response.
 */
export interface ParsedDay {
  dayLabel: string;         // "Mon", "Tue", etc.
  dayOfWeek: number;        // 0=Sun, 1=Mon, ...
  items: ParsedDayItem[];
}

export interface ParsedDayItem {
  type: StagedWorkoutType;
  title: string;
  description: string;
  estimatedMinutes?: number;
}

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const TYPE_MARKERS: Record<string, StagedWorkoutType> = {
  lift: 'lift',
  push: 'lift',
  pull: 'lift',
  legs: 'lift',
  upper: 'lift',
  lower: 'lift',
  strength: 'lift',
  weights: 'lift',
  bench: 'lift',
  squat: 'lift',
  deadlift: 'lift',
  run: 'cardio',
  jog: 'cardio',
  cycle: 'cardio',
  swim: 'cardio',
  cardio: 'cardio',
  hiit: 'cardio',
  sprint: 'cardio',
  walk: 'cardio',
  row: 'cardio',
  stretch: 'mobility',
  mobility: 'mobility',
  yoga: 'mobility',
  foam: 'mobility',
  dynamic: 'mobility',
  static: 'mobility',
  warmup: 'mobility',
  cooldown: 'mobility',
  'warm-up': 'mobility',
  'cool-down': 'mobility',
};

/**
 * Infer the workout type from a bracketed tag like [Lift], [Cardio], [Mobility].
 * Falls back to keyword detection in the title.
 */
function inferType(tag: string | undefined, title: string): StagedWorkoutType {
  if (tag) {
    const lower = tag.toLowerCase().replace(/[\[\]]/g, '');
    if (lower.includes('lift') || lower.includes('strength') || lower.includes('weight')) return 'lift';
    if (lower.includes('cardio') || lower.includes('run') || lower.includes('cycle') || lower.includes('swim')) return 'cardio';
    if (lower.includes('mobil') || lower.includes('stretch') || lower.includes('yoga') || lower.includes('foam')) return 'mobility';
  }

  const words = title.toLowerCase().split(/[\s\-\/]+/);
  for (const word of words) {
    if (TYPE_MARKERS[word]) return TYPE_MARKERS[word];
  }

  // Default to lift if we can't tell
  return 'lift';
}

/**
 * Attempt to extract estimated minutes from description text.
 * Looks for patterns like "~30 min", "20min", "30 minutes"
 */
function extractMinutes(text: string): number | undefined {
  const match = text.match(/~?(\d+)\s*min/i);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Parse the coach's weekly plan text into structured days.
 *
 * Expected format (flexible):
 *   Mon: [Lift] Push Day — Bench 5x5 @185, OHP 3x8
 *   Tue: [Cardio] Easy 3mi Run — Zone 2, ~30 min
 *   Tue: [Mobility] Post-Run Stretches — hamstrings, hip flexors, 10 min
 *   Wed: Rest
 *   ...
 */
export function parseWeekPlan(text: string): ParsedDay[] {
  const days: Map<number, ParsedDayItem[]> = new Map();
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match: "Mon: [Lift] Title — Description" or "Mon: [Lift] Title - Description"
    // Also handles: "Monday: Title — Description" without brackets
    const dayMatch = trimmed.match(
      /^(?:\*\*)?(\w+)(?:\*\*)?:\s*(?:\[([^\]]+)\])?\s*(.+)$/i
    );

    if (!dayMatch) continue;

    const dayKey = dayMatch[1].toLowerCase();
    const dow = DAY_MAP[dayKey];
    if (dow === undefined) continue;

    const tag = dayMatch[2];
    const rest = dayMatch[3].trim();

    // Skip rest days
    if (/^rest\b/i.test(rest)) continue;

    // Split title and description on — or -
    const separatorMatch = rest.match(/^(.+?)\s*(?:—|–|-)\s*(.+)$/);
    let title: string;
    let description: string;

    if (separatorMatch) {
      title = separatorMatch[1].replace(/\*+/g, '').trim();
      description = separatorMatch[2].replace(/\*+/g, '').trim();
    } else {
      title = rest.replace(/\*+/g, '').trim();
      description = '';
    }

    const type = inferType(tag, title);
    const estimatedMinutes = extractMinutes(description) ?? extractMinutes(title);

    if (!days.has(dow)) days.set(dow, []);
    days.get(dow)!.push({ type, title, description, estimatedMinutes });
  }

  const result: ParsedDay[] = [];
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (const [dow, items] of days.entries()) {
    result.push({
      dayLabel: labels[dow],
      dayOfWeek: dow,
      items,
    });
  }

  // Sort by day of week (Mon first)
  result.sort((a, b) => {
    const aIdx = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const bIdx = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    return aIdx - bIdx;
  });

  return result;
}

/**
 * Convert parsed days into StagedWorkout records ready for Dexie.
 */
export function createStagedWorkouts(
  parsedDays: ParsedDay[],
  weekCommitId: string,
): StagedWorkout[] {
  const now = Date.now();
  const weekStart = getWeekStart();
  const workouts: StagedWorkout[] = [];

  for (const day of parsedDays) {
    // Calculate the actual date for this day of the week
    const mondayDate = new Date(weekStart);
    let offset = day.dayOfWeek - 1; // Mon=1, so offset from Mon is dow-1
    if (day.dayOfWeek === 0) offset = 6; // Sunday is 6 days after Monday
    const dayDate = new Date(mondayDate);
    dayDate.setDate(dayDate.getDate() + offset);
    dayDate.setHours(0, 0, 0, 0);
    const dateEpoch = dayDate.getTime();

    day.items.forEach((item, orderInDay) => {
      workouts.push({
        id: nanoid(),
        weekCommitId,
        date: dateEpoch,
        dayOfWeek: day.dayOfWeek,
        orderInDay,
        type: item.type,
        status: 'pending',
        title: item.title,
        description: item.description || undefined,
        estimatedMinutes: item.estimatedMinutes,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  return workouts;
}

/**
 * Check if a message looks like it contains a weekly plan.
 * Heuristic: at least 3 day labels followed by a colon.
 */
export function looksLikeWeekPlan(text: string): boolean {
  const dayPattern = /^(?:\*\*)?(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\*\*)?:/gim;
  const matches = text.match(dayPattern);
  return (matches?.length ?? 0) >= 3;
}
