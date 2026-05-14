import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, X, Trash2 } from 'lucide-react';
import { db } from '@/data/db';
import { useWorkoutStore } from '@/stores/workoutStore';
import { usePreviousSets, usePersonalRecords } from '@/features/weightlifting/hooks/useExerciseHistory';
import { SetRow } from '@/features/weightlifting/components/SetRow';
import { RestTimer } from '@/features/weightlifting/components/RestTimer';
import { ExercisePicker } from '@/features/weightlifting/components/ExercisePicker';
import { WorkoutSummary } from '@/features/weightlifting/components/WorkoutSummary';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Timer } from '@/shared/components/Timer';
import type { WorkoutLog } from '@/types';

export function ActiveWorkoutPage() {
  const navigate = useNavigate();
  const {
    activeWorkout,
    elapsedSeconds,
    tickElapsed,
    addExercise,
    removeExercise,
    updateSet,
    completeSet,
    addSet,
    finishWorkout,
    discardWorkout,
  } = useWorkoutStore();

  const [showPicker, setShowPicker] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [completedWorkout, setCompletedWorkout] = useState<WorkoutLog | null>(null);

  const exercises = useLiveQuery(() => db.exercises.toArray());
  const exerciseMap = new Map(exercises?.map((e) => [e.id, e]) ?? []);

  // Get unique exercise IDs for lookup
  const exerciseIds = useMemo(
    () => [...new Set(activeWorkout?.exercises.map((e) => e.exerciseId) ?? [])],
    [activeWorkout?.exercises]
  );

  // Previous set data and PRs
  const previousSets = usePreviousSets(exerciseIds);
  const personalRecords = usePersonalRecords(exerciseIds);

  const tickCb = useCallback(() => tickElapsed(), [tickElapsed]);

  // Redirect if no active workout and no summary showing
  useEffect(() => {
    if (!activeWorkout && !completedWorkout) navigate('/workout', { replace: true });
  }, [activeWorkout, completedWorkout, navigate]);

  // Show summary screen
  if (completedWorkout) {
    return (
      <WorkoutSummary
        workout={completedWorkout}
        exerciseMap={exerciseMap}
        onDone={() => {
          setCompletedWorkout(null);
          navigate('/', { replace: true });
        }}
      />
    );
  }

  if (!activeWorkout) return null;

  const handleFinish = async () => {
    setShowFinish(false);
    const result = await finishWorkout();
    if (result) {
      setCompletedWorkout(result);
    }
  };

  const handleDiscard = () => {
    discardWorkout();
    navigate('/workout', { replace: true });
  };

  const completedSetCount = activeWorkout.exercises.reduce(
    (count, entry) => count + entry.sets.filter((s) => s.completedAt).length,
    0
  );
  const totalSets = activeWorkout.exercises.reduce(
    (count, entry) => count + entry.sets.length,
    0
  );

  return (
    <div className="min-h-svh bg-surface">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-12 px-4 max-w-lg mx-auto">
          <button
            onClick={() => setShowDiscard(true)}
            className="text-sm font-medium text-danger"
          >
            Discard
          </button>
          <div className="text-center">
            <p className="text-xs text-text-muted">{activeWorkout.name}</p>
            <Timer seconds={elapsedSeconds} onTick={tickCb} className="!flex-row !gap-0" />
          </div>
          <button
            onClick={() => setShowFinish(true)}
            className="text-sm font-semibold text-primary"
          >
            Finish
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-surface-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: totalSets > 0 ? `${(completedSetCount / totalSets) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Exercise blocks */}
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4 pb-24">
        {activeWorkout.exercises.map((entry) => {
          const exercise = exerciseMap.get(entry.exerciseId);
          const prevSets = previousSets?.get(entry.exerciseId);
          const currentPR = personalRecords?.get(entry.exerciseId);

          return (
            <div key={entry.id} className="bg-surface-secondary rounded-xl overflow-hidden">
              {/* Exercise header */}
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-semibold text-primary">
                  {exercise?.name ?? 'Unknown Exercise'}
                </p>
                <button
                  onClick={() => removeExercise(entry.id)}
                  className="p-1 text-text-muted hover:text-danger transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Set headers */}
              <div className="flex items-center gap-2 px-4 py-1 text-[10px] font-medium text-text-muted uppercase tracking-wider">
                <span className="w-6 text-center">Set</span>
                <span className="w-16 text-center">Prev</span>
                <span className="w-16 text-center">lbs</span>
                <span className="w-14 text-center">Reps</span>
                <span className="w-8" />
              </div>

              {/* Sets */}
              <div className="px-4 pb-2">
                {entry.sets.map((set, setIndex) => {
                  // Check if this completed set beats the current PR
                  const isNewPR =
                    set.completedAt !== null &&
                    set.weight !== null &&
                    set.weight > 0 &&
                    (!currentPR || set.weight > currentPR.weight);

                  return (
                    <SetRow
                      key={set.id}
                      set={set}
                      previousSet={prevSets?.[setIndex]}
                      isNewPR={isNewPR}
                      onUpdate={(updates) => updateSet(entry.id, set.id, updates)}
                      onComplete={() => completeSet(entry.id, set.id)}
                    />
                  );
                })}
              </div>

              {/* Add set */}
              <button
                onClick={() => addSet(entry.id)}
                className="w-full py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                + Add Set
              </button>
            </div>
          );
        })}

        {/* Add exercise button */}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-xl text-sm font-medium text-text-secondary hover:border-primary hover:text-primary transition-colors"
        >
          <Plus size={16} /> Add Exercise
        </button>
      </div>

      {/* Rest Timer Overlay */}
      <RestTimer />

      {/* Exercise Picker */}
      <ExercisePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={addExercise}
      />

      {/* Discard Confirm */}
      <ConfirmDialog
        open={showDiscard}
        title="Discard Workout?"
        description="All progress from this session will be lost."
        confirmLabel="Discard"
        variant="danger"
        onConfirm={handleDiscard}
        onCancel={() => setShowDiscard(false)}
      />

      {/* Finish Confirm */}
      <ConfirmDialog
        open={showFinish}
        title="Finish Workout?"
        description={`${completedSetCount} of ${totalSets} sets completed.`}
        confirmLabel="Finish"
        onConfirm={handleFinish}
        onCancel={() => setShowFinish(false)}
      />
    </div>
  );
}
