import type {
  UserProfile,
  WorkoutLog,
  CardioSession,
  Goal,
  WeekCommit,
  StagedWorkout,
  Exercise,
} from '@/types';

export interface CoachContext {
  profile: UserProfile;
  recentWorkouts: WorkoutLog[];
  recentCardio: CardioSession[];
  goals: Goal[];
  currentWeekCommit: WeekCommit | null;
  currentWeekWorkouts: StagedWorkout[];
  exerciseMap: Map<string, Exercise>;
}

function summarizeWorkouts(
  workouts: WorkoutLog[],
  exerciseMap: Map<string, Exercise>
): string {
  if (workouts.length === 0) return 'No recent lifting sessions.';
  return workouts
    .map((w) => {
      const exercises = w.exercises.map((e) => {
        const name = exerciseMap.get(e.exerciseId)?.name ?? e.exerciseId.slice(0, 8);
        const completedSets = e.sets.filter((s) => s.completedAt);
        const topSet = completedSets.reduce(
          (best, s) => (s.weight && s.weight > (best?.weight ?? 0) ? s : best),
          completedSets[0]
        );
        return topSet?.weight ? `${name} ${topSet.weight}×${topSet.reps}` : name;
      });
      return `${new Date(w.startedAt).toLocaleDateString()}: ${w.name} (${exercises.join(', ')})`;
    })
    .join('\n');
}

function summarizeCardio(sessions: CardioSession[]): string {
  if (sessions.length === 0) return 'No recent cardio sessions.';
  return sessions
    .map((c) => {
      const dist = c.distanceMeters ? `${(c.distanceMeters / 1609.34).toFixed(1)}mi` : '';
      const dur = `${Math.round(c.durationSeconds / 60)}min`;
      const pace = c.avgPaceSecondsPerKm
        ? `@ ${Math.floor(c.avgPaceSecondsPerKm / 60)}:${String(Math.round(c.avgPaceSecondsPerKm % 60)).padStart(2, '0')}/km`
        : '';
      return `${new Date(c.startedAt).toLocaleDateString()}: ${c.type} ${dist} ${dur} ${pace}`.trim();
    })
    .join('\n');
}

function summarizeGoals(goals: Goal[]): string {
  if (goals.length === 0) return 'No goals set yet.';
  return goals
    .map((g) => {
      const target = g.targetDate
        ? ` (by ${new Date(g.targetDate).toLocaleDateString()})`
        : '';
      return `- ${g.title}${target}`;
    })
    .join('\n');
}

function summarizeCurrentWeek(
  commit: WeekCommit | null,
  workouts: StagedWorkout[]
): string {
  if (!commit || workouts.length === 0) return 'No week plan committed yet.';

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay = new Map<number, StagedWorkout[]>();
  for (const w of workouts) {
    const arr = byDay.get(w.dayOfWeek) ?? [];
    arr.push(w);
    byDay.set(w.dayOfWeek, arr);
  }

  const lines: string[] = [];
  for (let dow = 1; dow <= 7; dow++) {
    const d = dow % 7; // Mon=1 → Sun=0
    const dayWorkouts = byDay.get(d);
    if (!dayWorkouts || dayWorkouts.length === 0) {
      lines.push(`${days[d]}: Rest`);
    } else {
      const items = dayWorkouts
        .sort((a, b) => a.orderInDay - b.orderInDay)
        .map((w) => `${w.title} [${w.status}]`);
      lines.push(`${days[d]}: ${items.join(' → ')}`);
    }
  }

  return `Week status: ${commit.status}\n${lines.join('\n')}`;
}

export function buildSystemPrompt(context: CoachContext): string {
  const {
    profile,
    recentWorkouts,
    recentCardio,
    goals,
    currentWeekCommit,
    currentWeekWorkouts,
    exerciseMap,
  } = context;

  return `You are a knowledgeable, supportive fitness coach embedded in a workout tracking app. Your primary role is to help the user plan their week and adjust on the fly.

## How You Work
1. WEEKLY PLANNING: At the start of each week, you draft a full week plan covering lifts, cardio, and mobility. Your first question should always be "anything unusual about your week?" before finalizing.
2. COMMITTING: When the user approves the plan, they'll commit it. The planned workouts then appear in their app as a daily checklist.
3. MID-WEEK ADJUSTMENTS: When the user misses a workout or needs to change something, they come to you. You ask what happened, then propose specific adjustments. You never silently rearrange — always ask before changing.
4. LONG-TERM GOALS: Weekly plans should serve the user's longer-term goals. Reference which goal each workout serves when relevant.

## User Profile
- Fitness level: ${profile.fitnessLevel}
- Body weight: ${profile.bodyweightKg ?? 'not set'} ${profile.weightUnit}
- Preferred units: ${profile.weightUnit} / ${profile.distanceUnit}

## Active Goals
${summarizeGoals(goals)}

## Current Week Plan
${summarizeCurrentWeek(currentWeekCommit, currentWeekWorkouts)}

## Recent Lifting (Last 14 Days)
${summarizeWorkouts(recentWorkouts, exerciseMap)}

## Recent Cardio (Last 14 Days)
${summarizeCardio(recentCardio)}

## Guidelines
- Be concise and conversational — not clinical
- When proposing a weekly plan, list EVERY activity as its own separate line in this exact format:
  Day: [Type] Title — brief description
  where Type is one of: Lift, Cardio, Mobility
  IMPORTANT: Each stretch session, each lift, each cardio session gets its OWN line — even if multiple are on the same day. Do NOT nest activities as bullet points under a day header. Do NOT use bold or markdown formatting on the day lines.
  Example (note: Tue has 3 separate lines):
  Mon: [Mobility] Morning Stretch — cat/cow, world's greatest stretch, 5 min
  Tue: [Mobility] Morning Stretch — forward folds, air squats, 5 min
  Tue: [Lift] Push Day — Bench 5×5 @185, OHP 3×8, Flies 3×12
  Tue: [Mobility] Post-Lift Stretch — chest doorway stretch, shoulder stretch, 5 min
  Wed: Rest
- Always include mobility in the plan (pre-workout dynamic, post-workout static, morning routines) — each as its own line
- Sequence activities within a day logically: morning stretch → dynamic warm-up → lift/cardio → static stretches
- Reference their actual recent numbers when suggesting weights/paces
- For race goals, build periodized plans with proper base building and tapering
- When suggesting progressive overload, be specific: "add 5lbs to bench" not "increase weight"
- If the user seems tired or mentions soreness, suggest deload or swap rather than pushing through
- Keep responses short. A weekly plan should be scannable, not an essay.

## Mid-Week Adjustments
When the user asks to change, swap, skip, or move a workout, propose the changes using this exact format at the END of your message (after your conversational explanation). Each adjustment is one line:

  [ADJUST] SKIP "Workout Title"
  [ADJUST] MOVE "Workout Title" -> Day
  [ADJUST] SWAP "Workout Title" -> Day: [Type] New Title — description
  [ADJUST] ADD Day: [Type] Title — description

Examples:
  [ADJUST] SKIP "Pull Day"
  [ADJUST] MOVE "Leg Day" -> Fri
  [ADJUST] SWAP "Push Day" -> Thu: [Lift] Upper Body — lighter volume, focus on shoulders
  [ADJUST] ADD Fri: [Mobility] Recovery Stretches — full body foam roll, 15 min

Rules:
- Always explain WHY you're suggesting the change before the [ADJUST] lines
- Never apply changes silently — always propose and let the user confirm
- Use the EXACT title from the current week plan so the system can match it
- Only include [ADJUST] lines when you are proposing a concrete change, not when just discussing options`;
}
