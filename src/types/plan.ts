// ─── Long-term Goals ───────────────────────────────────────────────

export type GoalType = 'race' | 'strength' | 'body_composition' | 'general_fitness' | 'mobility';
export type GoalStatus = 'active' | 'completed' | 'paused';

export interface Goal {
  id: string;
  type: GoalType;
  title: string;              // "Run a 5K under 25 min"
  description?: string;       // Longer context
  targetDate?: number;
  targetMetrics?: Record<string, number>; // { distance_km: 5, time_minutes: 25 }
  currentMetrics?: Record<string, number>; // Updated as progress is made
  status: GoalStatus;
  createdAt: number;
  updatedAt: number;
  _deleted?: boolean;
  _synced?: boolean;
}

// ─── Weekly Commit ─────────────────────────────────────────────────

export type WeekCommitStatus = 'draft' | 'committed' | 'completed';

export interface WeekCommit {
  id: string;
  weekStartDate: number;      // Monday epoch of the target week
  status: WeekCommitStatus;
  goalIds: string[];           // Goals this week is working toward
  coachNotes: string;          // Coach's summary of the week focus
  conversationSnapshot: CoachMessage[]; // The planning conversation
  adjustmentLog: AdjustmentEntry[];    // Mid-week changes
  completionRate?: number;     // 0-1, calculated on week end
  createdAt: number;
  updatedAt: number;
  _deleted?: boolean;
  _synced?: boolean;
}

export interface AdjustmentEntry {
  timestamp: number;
  description: string;        // "Moved legs from Tue→Thu due to soreness"
  changedWorkoutIds: string[];
}

// ─── Staged Workouts ───────────────────────────────────────────────

export type StagedWorkoutType = 'lift' | 'cardio' | 'mobility';
export type StagedWorkoutStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface StagedWorkout {
  id: string;
  weekCommitId: string;
  date: number;                // Epoch of the planned day (start of day)
  dayOfWeek: number;           // 0=Sun, 1=Mon, ...
  orderInDay: number;          // Sequence within the day (0=morning stretch, 1=lift, 2=post-workout stretch, 3=run)
  type: StagedWorkoutType;
  status: StagedWorkoutStatus;

  // Display
  title: string;               // "Push Day" / "Easy 3mi Run" / "Morning Dynamic Stretches"
  description?: string;        // Brief context shown in checklist
  estimatedMinutes?: number;

  // Links to what gets created when started
  routineId?: string;          // For lifts - pre-built routine to load
  plannedExercises?: PlannedExercise[]; // For lifts without a saved routine
  cardioTarget?: CardioTarget;          // For cardio sessions
  mobilitySequenceId?: string;          // For mobility sessions

  // Link to the actual completed log
  completedWorkoutLogId?: string;
  completedCardioSessionId?: string;
  completedMobilityLogId?: string;

  // Coach reasoning
  coachRationale?: string;     // "Building base mileage for 5K goal"
  linkedGoalId?: string;       // Which goal this serves

  createdAt: number;
  updatedAt: number;
  _deleted?: boolean;
  _synced?: boolean;
}

export interface PlannedExercise {
  exerciseId: string;
  targetSets: number;
  targetReps: string;          // "5x5" or "3x8-12"
  targetWeight?: number;       // Suggested based on history + progression
  restSeconds: number;
  notes?: string;              // "Increase 5lbs from last week"
}

export interface CardioTarget {
  type: 'run' | 'cycle' | 'walk' | 'swim' | 'row' | 'elliptical';
  distanceMeters?: number;
  durationMinutes?: number;
  targetPace?: string;         // "5:30/km" or "Zone 2"
  notes?: string;
}

// ─── Coach Conversation ────────────────────────────────────────────

export interface CoachMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  // Structured actions the coach can take mid-conversation
  action?: CoachAction;
  createdAt: number;
}

export type CoachAction =
  | { type: 'propose_week'; weekCommitId: string }
  | { type: 'adjust_workout'; stagedWorkoutId: string; change: string }
  | { type: 'commit_week'; weekCommitId: string }
  | { type: 'set_goal'; goalId: string };

export interface CoachThread {
  id: string;
  title: string;
  weekCommitId?: string;       // Link to the week being planned/adjusted
  messages: CoachMessage[];
  createdAt: number;
  updatedAt: number;
}

// ─── Legacy compat ─────────────────────────────────────────────────
// Keep these for backward compat but they're superseded by the above

export interface TrainingGoal {
  type: GoalType;
  description: string;
  targetDate?: number;
  metrics?: Record<string, number>;
}

export interface DayPlan {
  dayOfWeek: number;
  workoutType: 'weights' | 'cardio' | 'mobility' | 'rest' | 'active_recovery';
  routineId?: string;
  cardioDescription?: string;
  mobilitySequenceId?: string;
  notes?: string;
}

export interface WeeklyPlan {
  id: string;
  weekNumber: number;
  days: DayPlan[];
  focusAreas: string[];
  coachNotes: string;
}

export interface TrainingPlan {
  id: string;
  name: string;
  goal: TrainingGoal;
  startDate: number;
  endDate: number;
  weeks: WeeklyPlan[];
  generatedBy: 'claude';
  rawResponse?: string;
  createdAt: number;
  updatedAt: number;
  _deleted?: boolean;
  _synced?: boolean;
}
