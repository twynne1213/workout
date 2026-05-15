/**
 * Cross-device sync engine.
 *
 * Strategy:
 *  - Dexie (IndexedDB) stays primary — the app works fully offline.
 *  - On app load, pull everything from Supabase and merge into Dexie (last-write-wins by updatedAt).
 *  - On Dexie writes, push the changed record to Supabase in the background.
 *  - A `_synced` boolean on each Dexie record tracks whether the latest version has been pushed.
 *
 * Naming convention:
 *  - Dexie uses camelCase (JS convention)
 *  - Supabase/Postgres uses snake_case
 *  - This file converts between the two.
 */

import { supabase } from './supabase';
import { db } from '@/data/db';
import type { Table } from 'dexie';

// ─── Table config ──────────────────────────────────────────────────
// Maps Dexie table name → Supabase table name, plus the list of columns
// that need camelCase ↔ snake_case conversion.
//
// Fields that are the same in both (id, name, notes, etc.) don't need mapping.
// JSONB columns that store nested objects are listed separately — they go
// straight to Supabase as-is since Postgres stores them as JSONB.

interface TableConfig {
  supabaseTable: string;
  /** Map from camelCase (Dexie) to snake_case (Supabase) */
  fieldMap: Record<string, string>;
}

const TABLE_CONFIGS: Record<string, TableConfig> = {
  exercises: {
    supabaseTable: 'exercises',
    fieldMap: {
      muscleGroups: 'muscle_groups',
      isCustom: 'is_custom',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      _deleted: '_deleted',
    },
  },
  routines: {
    supabaseTable: 'routines',
    fieldMap: {
      lastPerformedAt: 'last_performed_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      _deleted: '_deleted',
    },
  },
  workoutLogs: {
    supabaseTable: 'workout_logs',
    fieldMap: {
      routineId: 'routine_id',
      startedAt: 'started_at',
      completedAt: 'completed_at',
      totalVolume: 'total_volume',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      _deleted: '_deleted',
    },
  },
  cardioSessions: {
    supabaseTable: 'cardio_sessions',
    fieldMap: {
      distanceMeters: 'distance_meters',
      durationSeconds: 'duration_seconds',
      avgPaceSecondsPerKm: 'avg_pace_seconds_per_km',
      avgSpeedKmh: 'avg_speed_kmh',
      avgHeartRate: 'avg_heart_rate',
      maxHeartRate: 'max_heart_rate',
      caloriesEstimate: 'calories_estimate',
      elevationGainMeters: 'elevation_gain_meters',
      startedAt: 'started_at',
      completedAt: 'completed_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      _deleted: '_deleted',
    },
  },
  stretches: {
    supabaseTable: 'stretches',
    fieldMap: {
      targetAreas: 'target_areas',
      defaultDurationSeconds: 'default_duration_seconds',
      isCustom: 'is_custom',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      _deleted: '_deleted',
    },
  },
  mobilitySequences: {
    supabaseTable: 'mobility_sequences',
    fieldMap: {
      linkedRoutineId: 'linked_routine_id',
      totalDuration: 'total_duration',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      _deleted: '_deleted',
    },
  },
  mobilityLogs: {
    supabaseTable: 'mobility_logs',
    fieldMap: {
      sequenceId: 'sequence_id',
      completedStretches: 'completed_stretches',
      completedAt: 'completed_at',
      linkedWorkoutId: 'linked_workout_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      _deleted: '_deleted',
    },
  },
  trainingPlans: {
    supabaseTable: 'training_plans',
    fieldMap: {
      startDate: 'start_date',
      endDate: 'end_date',
      generatedBy: 'generated_by',
      rawResponse: 'raw_response',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      _deleted: '_deleted',
    },
  },
  coachThreads: {
    supabaseTable: 'coach_threads',
    fieldMap: {
      weekCommitId: 'week_commit_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  userProfile: {
    supabaseTable: 'user_profile',
    fieldMap: {
      displayName: 'display_name',
      weightUnit: 'weight_unit',
      distanceUnit: 'distance_unit',
      bodyweightKg: 'bodyweight_kg',
      heightCm: 'height_cm',
      dateOfBirth: 'date_of_birth',
      fitnessLevel: 'fitness_level',
      darkMode: 'dark_mode',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  goals: {
    supabaseTable: 'goals',
    fieldMap: {
      targetDate: 'target_date',
      targetMetrics: 'target_metrics',
      currentMetrics: 'current_metrics',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      _deleted: '_deleted',
    },
  },
  weekCommits: {
    supabaseTable: 'week_commits',
    fieldMap: {
      weekStartDate: 'week_start_date',
      goalIds: 'goal_ids',
      coachNotes: 'coach_notes',
      conversationSnapshot: 'conversation_snapshot',
      adjustmentLog: 'adjustment_log',
      completionRate: 'completion_rate',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      _deleted: '_deleted',
    },
  },
  stagedWorkouts: {
    supabaseTable: 'staged_workouts',
    fieldMap: {
      weekCommitId: 'week_commit_id',
      dayOfWeek: 'day_of_week',
      orderInDay: 'order_in_day',
      estimatedMinutes: 'estimated_minutes',
      routineId: 'routine_id',
      plannedExercises: 'planned_exercises',
      cardioTarget: 'cardio_target',
      mobilitySequenceId: 'mobility_sequence_id',
      completedWorkoutLogId: 'completed_workout_log_id',
      completedCardioSessionId: 'completed_cardio_session_id',
      completedMobilityLogId: 'completed_mobility_log_id',
      coachRationale: 'coach_rationale',
      linkedGoalId: 'linked_goal_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      _deleted: '_deleted',
    },
  },
};

// ─── Conversion helpers ────────────────────────────────────────────

/** Convert a Dexie record to a Supabase row (camelCase → snake_case). */
function toSupabaseRow(
  dexieRecord: Record<string, unknown>,
  config: TableConfig,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const reverseMap = config.fieldMap;

  for (const [key, value] of Object.entries(dexieRecord)) {
    if (key === '_synced') continue; // Don't send sync metadata to Supabase
    const snakeKey = reverseMap[key] ?? key;
    row[snakeKey] = value;
  }

  return row;
}

/** Convert a Supabase row to a Dexie record (snake_case → camelCase). */
function toDexieRecord(
  row: Record<string, unknown>,
  config: TableConfig,
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  // Build reverse: snake_case → camelCase
  const snakeToCamel: Record<string, string> = {};
  for (const [camel, snake] of Object.entries(config.fieldMap)) {
    snakeToCamel[snake] = camel;
  }

  for (const [key, value] of Object.entries(row)) {
    const camelKey = snakeToCamel[key] ?? key;
    record[camelKey] = value;
  }

  record._synced = true;
  return record;
}

// ─── Push (Dexie → Supabase) ──────────────────────────────────────

/** Push a single record to Supabase (upsert by id). */
export async function pushRecord(
  tableName: string,
  record: Record<string, unknown>,
): Promise<void> {
  if (!supabase) return;
  const config = TABLE_CONFIGS[tableName];
  if (!config) return;

  const row = toSupabaseRow(record, config);

  const { error } = await supabase
    .from(config.supabaseTable)
    .upsert(row, { onConflict: 'id' });

  if (error) {
    console.warn(`[sync] push ${tableName}/${record.id} failed:`, error.message);
  }
}

/** Push all unsynced records from a Dexie table. */
async function pushUnsynced(
  tableName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: Table<any>,
): Promise<number> {
  if (!supabase) return 0;
  const config = TABLE_CONFIGS[tableName];
  if (!config) return 0;

  // Find records where _synced is falsy or missing
  const unsynced = await table
    .filter((r: Record<string, unknown>) => !r._synced)
    .toArray();

  if (unsynced.length === 0) return 0;

  const rows = unsynced.map((r: Record<string, unknown>) => toSupabaseRow(r, config));

  const { error } = await supabase
    .from(config.supabaseTable)
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.warn(`[sync] pushUnsynced ${tableName} failed:`, error.message);
    return 0;
  }

  // Mark as synced
  const ids = unsynced.map((r: Record<string, unknown>) => r.id as string);
  await Promise.all(ids.map((id) => table.update(id, { _synced: true })));

  return unsynced.length;
}

// ─── Pull (Supabase → Dexie) ──────────────────────────────────────

/** Pull all records from a Supabase table and merge into Dexie (last-write-wins). */
async function pullTable(
  tableName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: Table<any>,
): Promise<number> {
  if (!supabase) return 0;
  const config = TABLE_CONFIGS[tableName];
  if (!config) return 0;

  // Fetch all rows from Supabase
  const { data, error } = await supabase
    .from(config.supabaseTable)
    .select('*');

  if (error) {
    console.warn(`[sync] pull ${tableName} failed:`, error.message);
    return 0;
  }

  if (!data || data.length === 0) return 0;

  let merged = 0;

  for (const row of data) {
    const remote = toDexieRecord(row as Record<string, unknown>, config);
    const remoteId = remote.id as string;
    const remoteUpdatedAt = (remote.updatedAt as number) ?? 0;

    const local = await table.get(remoteId);

    if (!local) {
      // New record from remote — add it
      await table.put(remote);
      merged++;
    } else {
      const localUpdatedAt = (local.updatedAt as number) ?? 0;
      if (remoteUpdatedAt > localUpdatedAt) {
        // Remote is newer — overwrite local
        await table.put(remote);
        merged++;
      }
      // If local is newer or equal, keep local (it'll get pushed next)
    }
  }

  return merged;
}

// ─── Full sync ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEXIE_TABLES: [string, () => Table<any>][] = [
  ['exercises', () => db.exercises],
  ['routines', () => db.routines],
  ['workoutLogs', () => db.workoutLogs],
  ['cardioSessions', () => db.cardioSessions],
  ['stretches', () => db.stretches],
  ['mobilitySequences', () => db.mobilitySequences],
  ['mobilityLogs', () => db.mobilityLogs],
  ['trainingPlans', () => db.trainingPlans],
  ['coachThreads', () => db.coachThreads],
  ['userProfile', () => db.userProfile],
  ['goals', () => db.goals],
  ['weekCommits', () => db.weekCommits],
  ['stagedWorkouts', () => db.stagedWorkouts],
];

export interface SyncResult {
  pulled: number;
  pushed: number;
  errors: string[];
}

/** Full sync: pull remote changes, then push local unsynced records. */
export async function fullSync(): Promise<SyncResult> {
  if (!supabase) {
    return { pulled: 0, pushed: 0, errors: ['Supabase not configured'] };
  }

  const result: SyncResult = { pulled: 0, pushed: 0, errors: [] };

  for (const [name, getTable] of DEXIE_TABLES) {
    try {
      const pulled = await pullTable(name, getTable());
      result.pulled += pulled;
    } catch (err) {
      result.errors.push(`pull ${name}: ${(err as Error).message}`);
    }

    try {
      const pushed = await pushUnsynced(name, getTable());
      result.pushed += pushed;
    } catch (err) {
      result.errors.push(`push ${name}: ${(err as Error).message}`);
    }
  }

  console.log(
    `[sync] complete — pulled ${result.pulled}, pushed ${result.pushed}` +
    (result.errors.length > 0 ? `, ${result.errors.length} errors` : ''),
  );

  return result;
}

// ─── Dexie change listener (push on write) ─────────────────────────
// Subscribes to Dexie's built-in hooks so every create/update pushes
// to Supabase in the background. Deletions set _deleted=true.

let listening = false;

export function startSyncListener(): void {
  if (listening || !supabase) return;
  listening = true;

  for (const [name, getTable] of DEXIE_TABLES) {
    const table = getTable();

    // After a record is created or updated, push it
    table.hook('creating', function (_primKey, obj) {
      // Fire-and-forget push
      setTimeout(() => {
        pushRecord(name, { ...obj, _synced: true }).then(() => {
          // Mark as synced locally
          if (obj.id) table.update(obj.id, { _synced: true }).catch(() => {});
        });
      }, 0);
    });

    table.hook('updating', function (mods, _primKey, obj) {
      // Skip if only _synced changed (avoids infinite loop)
      const modKeys = Object.keys(mods as Record<string, unknown>);
      if (modKeys.length === 1 && modKeys[0] === '_synced') return;

      const updated = { ...obj, ...mods };
      setTimeout(() => {
        pushRecord(name, { ...updated, _synced: true }).then(() => {
          if (updated.id) table.update(updated.id, { _synced: true }).catch(() => {});
        });
      }, 0);
    });
  }
}
