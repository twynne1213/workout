import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import {
  Plus, ListChecks, Clock, Dumbbell, Play, Calendar,
  Trophy, ChevronRight,
} from 'lucide-react';
import { db } from '@/data/db';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { SwipeToDelete } from '@/shared/components/SwipeToDelete';
import { useCurrentWeekCommit, useWeekStagedWorkouts } from '@/shared/hooks/useWeekPlan';
import { useWorkoutStore } from '@/stores/workoutStore';
import { formatDate, formatDuration, formatVolume } from '@/shared/utils/format';
import { getDayStart } from '@/shared/hooks/useWeekPlan';
import { cn } from '@/shared/utils/cn';
import type { StagedWorkout, WorkoutLog } from '@/types';

export function WorkoutPage() {
  const navigate = useNavigate();
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);

  const weekCommit = useCurrentWeekCommit();
  const weekWorkouts = useWeekStagedWorkouts(weekCommit?.id);
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const exerciseMap = new Map(exercises?.map((e) => [e.id, e]) ?? []);

  const routines = useLiveQuery(() => db.routines.toArray());
  const allWorkoutLogs = useLiveQuery(
    () => db.workoutLogs.orderBy('startedAt').reverse().toArray()
  );

  const todayStart = getDayStart();
  const todayDow = new Date().getDay();

  // Filter staged lifts
  const allLifts = weekWorkouts?.filter((w) => w.type === 'lift') ?? [];
  const todayLifts = allLifts
    .filter((w) => w.dayOfWeek === todayDow)
    .sort((a, b) => a.orderInDay - b.orderInDay);
  const upcomingLifts = allLifts
    .filter((w) => {
      const wDay = new Date(w.date);
      wDay.setHours(0, 0, 0, 0);
      return wDay.getTime() > todayStart && w.status === 'pending';
    })
    .sort((a, b) => a.date - b.date);

  const startLift = (staged: StagedWorkout) => {
    if (staged.routineId) {
      db.routines.get(staged.routineId).then((routine) => {
        useWorkoutStore.getState().startWorkout(routine ?? undefined);
        navigate('/workout/active');
      });
    } else {
      useWorkoutStore.getState().startWorkout();
      navigate('/workout/active');
    }
    db.stagedWorkouts.update(staged.id, { status: 'active', updatedAt: Date.now() });
  };

  const startQuickWorkout = () => {
    useWorkoutStore.getState().startWorkout();
    navigate('/workout/active');
  };

  const startFromRoutine = (routine: NonNullable<typeof routines>[number]) => {
    useWorkoutStore.getState().startWorkout(routine);
    navigate('/workout/active');
  };

  const deleteLog = (log: WorkoutLog) => {
    db.workoutLogs.delete(log.id);
    // Also clear the staged workout link if any
    db.stagedWorkouts
      .where('completedWorkoutLogId')
      .equals(log.id)
      .modify({ completedWorkoutLogId: undefined, status: 'pending' });
  };

  const deleteStagedWorkout = (staged: StagedWorkout) => {
    db.stagedWorkouts.delete(staged.id);
  };

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <PageHeader
        title="Lift"
        rightAction={
          <button
            onClick={() => navigate('/routines')}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
          >
            <ListChecks size={20} />
          </button>
        }
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-5">
        {/* Resume active workout */}
        {activeWorkout && (
          <button
            onClick={() => navigate('/workout/active')}
            className="w-full flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Clock size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">Resume Workout</p>
              <p className="text-xs text-text-secondary">{activeWorkout.name} in progress</p>
            </div>
          </button>
        )}

        {/* ─── Today ─── */}
        {todayLifts.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Today</h2>
            <div className="space-y-2">
              {todayLifts.map((staged) => {
                const isDone = staged.status === 'completed';
                const isSkipped = staged.status === 'skipped';
                return (
                  <SwipeToDelete key={staged.id} onDelete={() => deleteStagedWorkout(staged)}>
                    <div
                      className={cn(
                        'flex items-center gap-3 p-3.5 bg-surface-secondary rounded-xl',
                        (isDone || isSkipped) && 'opacity-50',
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        isDone ? 'bg-success/10' : 'bg-primary/10'
                      )}>
                        {isDone ? <Trophy size={18} className="text-success" /> : <Dumbbell size={18} className="text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', (isDone || isSkipped) && 'line-through')}>
                          {staged.title}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {staged.description ?? (isDone ? 'Completed' : isSkipped ? 'Skipped' : '')}
                        </p>
                      </div>
                      {staged.status === 'pending' && (
                        <button
                          onClick={() => startLift(staged)}
                          className="p-2 rounded-xl bg-primary text-white active:scale-95 transition-transform shrink-0"
                        >
                          <Play size={16} />
                        </button>
                      )}
                      {staged.status === 'active' && (
                        <button
                          onClick={() => startLift(staged)}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium shrink-0"
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  </SwipeToDelete>
                );
              })}
            </div>
          </section>
        )}

        {/* Start button when no planned lift today */}
        {!activeWorkout && todayLifts.length === 0 && (
          <button
            onClick={startQuickWorkout}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            <Plus size={18} />
            Start Empty Workout
          </button>
        )}

        {/* ─── Upcoming ─── */}
        {upcomingLifts.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              <Calendar size={12} className="inline mr-1" />Upcoming
            </h2>
            <div className="space-y-1.5">
              {upcomingLifts.map((staged) => (
                <SwipeToDelete key={staged.id} onDelete={() => deleteStagedWorkout(staged)}>
                  <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Dumbbell size={14} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{staged.title}</p>
                      <p className="text-xs text-text-muted truncate">{staged.description ?? ''}</p>
                    </div>
                    <span className="text-xs text-text-muted shrink-0">{DAY_LABELS[staged.dayOfWeek]}</span>
                  </div>
                </SwipeToDelete>
              ))}
            </div>
          </section>
        )}

        {/* ─── Routines ─── */}
        {routines && routines.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Routines</h2>
              <button onClick={() => navigate('/routines')} className="text-xs text-primary font-medium">
                See All
              </button>
            </div>
            <div className="space-y-1.5">
              {routines.slice(0, 3).map((routine) => (
                <button
                  key={routine.id}
                  onClick={() => startFromRoutine(routine)}
                  className="w-full flex items-center justify-between p-3 bg-surface-secondary rounded-xl text-left active:scale-[0.99] transition-transform"
                >
                  <div>
                    <p className="text-sm font-medium">{routine.name}</p>
                    <p className="text-xs text-text-muted">
                      {routine.exercises.length} exercises
                      {routine.lastPerformedAt && ` · Last: ${formatDate(routine.lastPerformedAt)}`}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-text-muted" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ─── History ─── */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">History</h2>
          {!allWorkoutLogs || allWorkoutLogs.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No history yet"
              description="Complete a workout and it will appear here."
            />
          ) : (
            <div className="space-y-1.5">
              {allWorkoutLogs.map((w) => (
                <SwipeToDelete key={w.id} onDelete={() => deleteLog(w)}>
                  <div className="p-3.5 bg-surface-secondary rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-sm font-semibold">{w.name}</h3>
                      <span className="text-xs text-text-muted">{formatDate(w.startedAt)}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-text-secondary mb-1.5">
                      <span className="flex items-center gap-1">
                        <Dumbbell size={10} />
                        {w.exercises.length} exercises
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatDuration(w.duration)}
                      </span>
                      <span>{formatVolume(w.totalVolume)} lbs</span>
                    </div>
                    <div className="space-y-0.5">
                      {w.exercises.slice(0, 4).map((entry) => {
                        const exercise = exerciseMap.get(entry.exerciseId);
                        const completed = entry.sets.filter((s) => s.completedAt);
                        const topSet = completed.reduce(
                          (best, s) => (s.weight && s.weight > (best?.weight ?? 0) ? s : best),
                          completed[0]
                        );
                        const hasPR = completed.some((s) => s.isPersonalRecord);
                        return (
                          <button
                            key={entry.id}
                            onClick={() => navigate(`/exercise/${entry.exerciseId}`)}
                            className="flex items-center gap-1.5 w-full text-left py-0.5 hover:text-primary transition-colors"
                          >
                            {hasPR && <Trophy size={10} className="text-warning shrink-0" />}
                            <span className="text-xs text-text-muted">
                              {completed.length} × {exercise?.name ?? 'Unknown'}
                              {topSet?.weight ? ` — ${topSet.weight}×${topSet.reps}` : ''}
                            </span>
                          </button>
                        );
                      })}
                      {w.exercises.length > 4 && (
                        <span className="text-xs text-text-muted">+{w.exercises.length - 4} more</span>
                      )}
                    </div>
                  </div>
                </SwipeToDelete>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
