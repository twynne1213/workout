import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { WorkoutLog, WorkoutExerciseEntry, WorkoutSet, Routine } from '@/types';
import { db } from '@/data/db';
import { completeStagedWorkout } from '@/shared/utils/completeStagedWorkout';

interface WorkoutStore {
  activeWorkout: WorkoutLog | null;
  restTimer: { remaining: number; total: number; exerciseEntryId: string } | null;
  elapsedSeconds: number;

  startWorkout: (routine?: Routine) => void;
  addExercise: (exerciseId: string) => void;
  removeExercise: (entryId: string) => void;
  updateSet: (exerciseEntryId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  completeSet: (exerciseEntryId: string, setId: string) => void;
  addSet: (exerciseEntryId: string) => void;
  removeSet: (exerciseEntryId: string, setId: string) => void;
  startRest: (seconds: number, exerciseEntryId: string) => void;
  tickRest: () => void;
  clearRest: () => void;
  tickElapsed: () => void;
  finishWorkout: () => Promise<WorkoutLog | null>;
  discardWorkout: () => void;
}

function calculateVolume(exercises: WorkoutExerciseEntry[]): number {
  return exercises.reduce((total, entry) => {
    return total + entry.sets.reduce((setTotal, set) => {
      if (set.completedAt && set.reps && set.weight) {
        return setTotal + set.reps * set.weight;
      }
      return setTotal;
    }, 0);
  }, 0);
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      restTimer: null,
      elapsedSeconds: 0,

      startWorkout: (routine) => {
        const now = Date.now();
        const exercises: WorkoutExerciseEntry[] = routine
          ? routine.exercises.map((re) => ({
              id: nanoid(),
              exerciseId: re.exerciseId,
              order: re.order,
              sets: Array.from({ length: re.targetSets }, (_, i) => ({
                id: nanoid(),
                exerciseId: re.exerciseId,
                setNumber: i + 1,
                type: 'working' as const,
                reps: null,
                weight: null,
                isPersonalRecord: false,
                completedAt: null,
              })),
              restSeconds: re.restSeconds,
            }))
          : [];

        set({
          activeWorkout: {
            id: nanoid(),
            routineId: routine?.id,
            name: routine?.name || 'Quick Workout',
            startedAt: now,
            completedAt: null,
            exercises,
            totalVolume: 0,
            duration: 0,
            createdAt: now,
            updatedAt: now,
          },
          elapsedSeconds: 0,
          restTimer: null,
        });
      },

      addExercise: (exerciseId) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          const entry: WorkoutExerciseEntry = {
            id: nanoid(),
            exerciseId,
            order: state.activeWorkout.exercises.length,
            sets: [
              {
                id: nanoid(),
                exerciseId,
                setNumber: 1,
                type: 'working',
                reps: null,
                weight: null,
                isPersonalRecord: false,
                completedAt: null,
              },
            ],
            restSeconds: 90,
          };
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: [...state.activeWorkout.exercises, entry],
            },
          };
        }),

      removeExercise: (entryId) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.filter((e) => e.id !== entryId),
            },
          };
        }),

      updateSet: (exerciseEntryId, setId, updates) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((entry) =>
                entry.id === exerciseEntryId
                  ? {
                      ...entry,
                      sets: entry.sets.map((s) =>
                        s.id === setId ? { ...s, ...updates } : s
                      ),
                    }
                  : entry
              ),
            },
          };
        }),

      completeSet: (exerciseEntryId, setId) => {
        const state = get();
        if (!state.activeWorkout) return;

        const entry = state.activeWorkout.exercises.find((e) => e.id === exerciseEntryId);
        if (!entry) return;

        set({
          activeWorkout: {
            ...state.activeWorkout,
            exercises: state.activeWorkout.exercises.map((e) =>
              e.id === exerciseEntryId
                ? {
                    ...e,
                    sets: e.sets.map((s) =>
                      s.id === setId ? { ...s, completedAt: Date.now() } : s
                    ),
                  }
                : e
            ),
          },
          restTimer: { remaining: entry.restSeconds, total: entry.restSeconds, exerciseEntryId },
        });
      },

      addSet: (exerciseEntryId) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          const entry = state.activeWorkout.exercises.find((e) => e.id === exerciseEntryId);
          if (!entry) return state;

          const lastSet = entry.sets[entry.sets.length - 1];
          const newSet: WorkoutSet = {
            id: nanoid(),
            exerciseId: entry.exerciseId,
            setNumber: entry.sets.length + 1,
            type: 'working',
            reps: lastSet?.reps ?? null,
            weight: lastSet?.weight ?? null,
            isPersonalRecord: false,
            completedAt: null,
          };

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((e) =>
                e.id === exerciseEntryId
                  ? { ...e, sets: [...e.sets, newSet] }
                  : e
              ),
            },
          };
        }),

      removeSet: (exerciseEntryId, setId) =>
        set((state) => {
          if (!state.activeWorkout) return state;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((e) =>
                e.id === exerciseEntryId
                  ? {
                      ...e,
                      sets: e.sets
                        .filter((s) => s.id !== setId)
                        .map((s, i) => ({ ...s, setNumber: i + 1 })),
                    }
                  : e
              ),
            },
          };
        }),

      startRest: (seconds, exerciseEntryId) =>
        set({ restTimer: { remaining: seconds, total: seconds, exerciseEntryId } }),

      tickRest: () =>
        set((state) => {
          if (!state.restTimer) return state;
          const next = state.restTimer.remaining - 1;
          if (next <= 0) return { restTimer: null };
          return { restTimer: { ...state.restTimer, remaining: next } };
        }),

      clearRest: () => set({ restTimer: null }),

      tickElapsed: () =>
        set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),

      finishWorkout: async () => {
        const state = get();
        if (!state.activeWorkout) return null;

        const now = Date.now();
        const completed: WorkoutLog = {
          ...state.activeWorkout,
          completedAt: now,
          duration: state.elapsedSeconds,
          totalVolume: calculateVolume(state.activeWorkout.exercises),
          updatedAt: now,
        };

        await db.workoutLogs.add(completed);
        // Close the loop: mark the matching staged workout as completed
        await completeStagedWorkout('lift', completed.id);
        set({ activeWorkout: null, restTimer: null, elapsedSeconds: 0 });
        return completed;
      },

      discardWorkout: () =>
        set({ activeWorkout: null, restTimer: null, elapsedSeconds: 0 }),
    }),
    {
      name: 'active-workout',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        activeWorkout: state.activeWorkout,
        elapsedSeconds: state.elapsedSeconds,
      }),
    }
  )
);
