import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Play, GripVertical, Trash2 } from 'lucide-react';
import { db } from '@/data/db';
import { PageHeader } from '@/shared/components/PageHeader';
import { ExercisePicker } from '@/features/weightlifting/components/ExercisePicker';
import { useWorkoutStore } from '@/stores/workoutStore';
import { MUSCLE_GROUP_LABELS, DEFAULT_REST_SECONDS } from '@/shared/utils/constants';
import type { RoutineExercise } from '@/types';

export function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showPicker, setShowPicker] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const routine = useLiveQuery(() => (id ? db.routines.get(id) : undefined), [id]);
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const exerciseMap = new Map(exercises?.map((e) => [e.id, e]) ?? []);

  if (!routine) return null;

  const updateRoutine = (updates: Partial<typeof routine>) => {
    db.routines.update(routine.id, { ...updates, updatedAt: Date.now() });
  };

  const addExercise = (exerciseId: string) => {
    const entry: RoutineExercise = {
      exerciseId,
      order: routine.exercises.length,
      targetSets: 3,
      targetReps: '8-12',
      restSeconds: DEFAULT_REST_SECONDS,
    };
    updateRoutine({ exercises: [...routine.exercises, entry] });
  };

  const removeExercise = (index: number) => {
    const updated = routine.exercises.filter((_, i) => i !== index);
    updateRoutine({ exercises: updated.map((e, i) => ({ ...e, order: i })) });
  };

  const updateExerciseField = (index: number, field: keyof RoutineExercise, value: unknown) => {
    const updated = [...routine.exercises];
    updated[index] = { ...updated[index], [field]: value };
    updateRoutine({ exercises: updated });
  };

  const startWorkout = () => {
    useWorkoutStore.getState().startWorkout(routine);
    navigate('/workout/active');
  };

  return (
    <div>
      <PageHeader
        title="Edit Routine"
        showBack
        rightAction={
          <button
            onClick={startWorkout}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
          >
            <Play size={14} /> Start
          </button>
        }
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Routine name */}
        {editingName ? (
          <input
            type="text"
            value={routine.name}
            onChange={(e) => updateRoutine({ name: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
            className="text-xl font-bold bg-transparent border-b-2 border-primary focus:outline-none w-full"
            autoFocus
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="text-xl font-bold text-left w-full">
            {routine.name}
          </button>
        )}

        {/* Exercise list */}
        <div className="space-y-2">
          {routine.exercises.map((re, index) => {
            const exercise = exerciseMap.get(re.exerciseId);
            return (
              <div key={`${re.exerciseId}-${index}`} className="bg-surface-secondary rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <GripVertical size={14} className="text-text-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{exercise?.name ?? 'Unknown'}</p>
                    <p className="text-[10px] text-text-muted">
                      {exercise?.muscleGroups.map((g) => MUSCLE_GROUP_LABELS[g]).join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => removeExercise(index)}
                    className="p-1 text-text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-text-muted block mb-0.5">Sets</label>
                    <input
                      type="number"
                      value={re.targetSets}
                      onChange={(e) => updateExerciseField(index, 'targetSets', Number(e.target.value))}
                      className="w-full text-center text-sm bg-surface rounded-lg py-1.5 border border-border focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-text-muted block mb-0.5">Reps</label>
                    <input
                      type="text"
                      value={re.targetReps}
                      onChange={(e) => updateExerciseField(index, 'targetReps', e.target.value)}
                      className="w-full text-center text-sm bg-surface rounded-lg py-1.5 border border-border focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-text-muted block mb-0.5">Rest (s)</label>
                    <input
                      type="number"
                      value={re.restSeconds}
                      onChange={(e) => updateExerciseField(index, 'restSeconds', Number(e.target.value))}
                      className="w-full text-center text-sm bg-surface rounded-lg py-1.5 border border-border focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add exercise */}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-xl text-sm font-medium text-text-secondary hover:border-primary hover:text-primary transition-colors"
        >
          <Plus size={16} /> Add Exercise
        </button>
      </div>

      <ExercisePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={addExercise}
      />
    </div>
  );
}
