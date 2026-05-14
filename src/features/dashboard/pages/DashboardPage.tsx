import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell, Activity, StretchHorizontal, BotMessageSquare,
  Check, Play, SkipForward, ChevronRight, Flame, Target,
} from 'lucide-react';
import { db } from '@/data/db';
import { buildSequenceFromDescription } from '@/shared/utils/buildSequenceFromDescription';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import {
  useCurrentWeekCommit,
  useWeekStagedWorkouts,
  useActiveGoals,
  getDayStart,
} from '@/shared/hooks/useWeekPlan';
import { useWorkoutStore } from '@/stores/workoutStore';
import { formatVolume } from '@/shared/utils/format';
import { cn } from '@/shared/utils/cn';
import type { StagedWorkout } from '@/types';

const TYPE_CONFIG = {
  lift: { icon: Dumbbell, color: 'text-primary', bg: 'bg-primary/10', accent: 'border-primary/30' },
  cardio: { icon: Activity, color: 'text-success', bg: 'bg-success/10', accent: 'border-success/30' },
  mobility: { icon: StretchHorizontal, color: 'text-warning', bg: 'bg-warning/10', accent: 'border-warning/30' },
} as const;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getStatusLabel(status: StagedWorkout['status']) {
  switch (status) {
    case 'completed': return 'Done';
    case 'skipped': return 'Skipped';
    case 'active': return 'In Progress';
    default: return '';
  }
}

export function DashboardPage() {
  const navigate = useNavigate();
  const todayDow = new Date().getDay();
  const [selectedDow, setSelectedDow] = useState(todayDow);

  // Coach-driven planning data
  const weekCommit = useCurrentWeekCommit();
  const weekWorkouts = useWeekStagedWorkouts(weekCommit?.id);
  const goals = useActiveGoals();

  // Legacy stats
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentLiftLogs = useLiveQuery(
    () => db.workoutLogs.where('startedAt').above(weekStart).toArray(),
    [weekStart]
  );
  const recentCardioLogs = useLiveQuery(
    () => db.cardioSessions.where('startedAt').above(weekStart).toArray(),
    [weekStart]
  );

  const totalVolume = recentLiftLogs?.reduce((s, w) => s + w.totalVolume, 0) ?? 0;
  const totalSessions = (recentLiftLogs?.length ?? 0) + (recentCardioLogs?.length ?? 0);

  const hasWeekPlan = weekCommit && weekCommit.status !== 'draft';
  const todayStart = getDayStart();

  // Filter workouts for selected day
  const selectedDayWorkouts = weekWorkouts
    ?.filter((w) => w.dayOfWeek === selectedDow)
    .sort((a, b) => a.orderInDay - b.orderInDay) ?? [];

  const isViewingToday = selectedDow === todayDow;

  // Compute the actual date for the selected day
  const getSelectedDate = () => {
    const today = new Date();
    const diff = selectedDow - todayDow;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d;
  };
  const selectedDate = getSelectedDate();

  // Start a staged workout
  const handleStartStaged = async (staged: StagedWorkout) => {
    // Mark as active first
    await db.stagedWorkouts.update(staged.id, { status: 'active', updatedAt: Date.now() });

    if (staged.type === 'lift') {
      if (staged.routineId) {
        const routine = await db.routines.get(staged.routineId);
        useWorkoutStore.getState().startWorkout(routine ?? undefined);
      } else {
        useWorkoutStore.getState().startWorkout();
      }
      navigate('/workout/active');
    } else if (staged.type === 'cardio') {
      navigate('/cardio/log');
    } else if (staged.type === 'mobility') {
      // Check if there's already a populated sequence
      if (staged.mobilitySequenceId) {
        const existing = await db.mobilitySequences.get(staged.mobilitySequenceId);
        if (existing && existing.stretches.length > 0) {
          navigate(`/mobility/play/${staged.mobilitySequenceId}`);
          return;
        }
        // Sequence exists but is empty — delete it and rebuild
        if (existing) await db.mobilitySequences.delete(existing.id);
      }
      // Auto-create a populated sequence from the coach's description
      const seq = await buildSequenceFromDescription(staged.title, staged.description);
      await db.stagedWorkouts.update(staged.id, { mobilitySequenceId: seq.id });
      navigate(`/mobility/play/${seq.id}`);
    }
  };

  const handleSkipStaged = (staged: StagedWorkout) => {
    db.stagedWorkouts.update(staged.id, { status: 'skipped', updatedAt: Date.now() });
  };

  // Build week strip data
  const weekStripDays = Array.from({ length: 7 }, (_, i) => {
    const dow = (i + 1) % 7; // Mon=1 → Sun=0
    const dayWorkouts = weekWorkouts?.filter((w) => w.dayOfWeek === dow) ?? [];
    const isToday = dow === todayDow;
    const isPast = (() => {
      if (!dayWorkouts[0]) return false;
      return dayWorkouts[0].date < todayStart;
    })();
    return { dow, label: DAY_LABELS[dow], workouts: dayWorkouts, isToday, isPast };
  });

  return (
    <div>
      <PageHeader title="Today" showSettings />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-5">
        {/* ─── No Week Plan: Onboard to Coach ─── */}
        {!hasWeekPlan && (
          <>
            <button
              onClick={() => navigate('/coach')}
              className="w-full flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl text-left active:scale-[0.99] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <BotMessageSquare size={24} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Plan your week</p>
                <p className="text-xs text-text-secondary">
                  Chat with your coach to set up this week's workouts, runs, and stretches.
                </p>
              </div>
              <ChevronRight size={18} className="text-text-muted shrink-0" />
            </button>

            {/* Quick start fallback */}
            <section>
              <h2 className="text-sm font-semibold text-text-secondary mb-2">Quick Start</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Dumbbell, label: 'Lift', path: '/workout', color: 'bg-primary/10 text-primary' },
                  { icon: Activity, label: 'Cardio', path: '/cardio', color: 'bg-success/10 text-success' },
                  { icon: StretchHorizontal, label: 'Stretch', path: '/mobility', color: 'bg-warning/10 text-warning' },
                ].map(({ icon: Icon, label, path, color }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all active:scale-95',
                      color
                    )}
                  >
                    <Icon size={24} />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ─── Day Checklist ─── */}
        {hasWeekPlan && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-secondary">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                {!isViewingToday && (
                  <button
                    onClick={() => setSelectedDow(todayDow)}
                    className="ml-2 text-xs text-primary font-medium"
                  >
                    Back to today
                  </button>
                )}
              </h2>
              <span className="text-xs text-text-muted">
                {selectedDayWorkouts.filter((w) => w.status === 'completed').length}/{selectedDayWorkouts.length} done
              </span>
            </div>

            {selectedDayWorkouts.length === 0 ? (
              <div className="p-6 bg-surface-secondary rounded-2xl text-center">
                <p className="text-sm text-text-secondary">Rest day. Recovery is part of the plan.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayWorkouts.map((staged) => {
                  const config = TYPE_CONFIG[staged.type];
                  const Icon = config.icon;
                  const isDone = staged.status === 'completed';
                  const isSkipped = staged.status === 'skipped';
                  const isActive = staged.status === 'active';
                  const isPending = staged.status === 'pending';

                  return (
                    <div
                      key={staged.id}
                      className={cn(
                        'relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all',
                        isDone && 'bg-surface-secondary/50 border-border opacity-60',
                        isSkipped && 'bg-surface-secondary/30 border-border opacity-40',
                        isActive && `bg-surface-secondary ${config.accent} border`,
                        isPending && `bg-surface-secondary border-transparent hover:${config.accent}`,
                      )}
                    >
                      {/* Status indicator */}
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        isDone ? 'bg-success/10' : config.bg,
                      )}>
                        {isDone ? (
                          <Check size={20} className="text-success" />
                        ) : (
                          <Icon size={20} className={config.color} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          (isDone || isSkipped) && 'line-through'
                        )}>
                          {staged.title}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {staged.description ?? ''}
                          {staged.estimatedMinutes && !staged.description
                            ? `~${staged.estimatedMinutes} min`
                            : ''}
                          {(isDone || isSkipped) && ` · ${getStatusLabel(staged.status)}`}
                        </p>
                        {staged.linkedGoalId && (
                          <p className="text-[10px] text-primary/70 mt-0.5 flex items-center gap-0.5">
                            <Target size={8} /> Working toward goal
                          </p>
                        )}
                      </div>

                      {/* Actions — only show for today */}
                      {isPending && isViewingToday && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleSkipStaged(staged)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary transition-colors"
                            title="Skip"
                          >
                            <SkipForward size={14} />
                          </button>
                          <button
                            onClick={() => handleStartStaged(staged)}
                            className={cn(
                              'p-2 rounded-xl text-white transition-all active:scale-95',
                              staged.type === 'lift' && 'bg-primary',
                              staged.type === 'cardio' && 'bg-success',
                              staged.type === 'mobility' && 'bg-warning',
                            )}
                          >
                            <Play size={16} />
                          </button>
                        </div>
                      )}
                      {isActive && isViewingToday && (
                        <button
                          onClick={() => handleStartStaged(staged)}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium shrink-0"
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Chat with coach about changes */}
            <button
              onClick={() => navigate('/coach')}
              className="w-full flex items-center justify-center gap-1.5 mt-2 py-2 text-xs font-medium text-text-muted hover:text-primary transition-colors"
            >
              <BotMessageSquare size={12} /> Need to change something? Talk to your coach
            </button>
          </section>
        )}

        {/* ─── Week Strip ─── */}
        {hasWeekPlan && (
          <section>
            <h2 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
              <Flame size={14} /> This Week
            </h2>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              {weekStripDays.map(({ dow, label, workouts, isToday, isPast }) => {
                const isSelected = dow === selectedDow;
                return (
                <button
                  key={dow}
                  onClick={() => setSelectedDow(dow)}
                  className={cn(
                    'flex flex-col items-center gap-1 min-w-[52px] py-2 px-1.5 rounded-xl transition-colors',
                    isSelected ? 'bg-primary/10 ring-2 ring-primary/40' :
                    isToday ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-surface-secondary',
                    isPast && !isToday && !isSelected && 'opacity-50',
                  )}
                >
                  <span className={cn(
                    'text-[10px] font-semibold',
                    isSelected ? 'text-primary' : isToday ? 'text-primary/70' : 'text-text-muted'
                  )}>
                    {label}
                  </span>
                  <div className="flex gap-0.5">
                    {workouts.length === 0 ? (
                      <span className="text-[9px] text-text-muted">Rest</span>
                    ) : (
                      workouts.map((w) => {
                        const config = TYPE_CONFIG[w.type];
                        const Icon = config.icon;
                        return (
                          <div
                            key={w.id}
                            className={cn(
                              'w-4 h-4 rounded flex items-center justify-center',
                              w.status === 'completed' ? 'bg-success/20' : config.bg,
                            )}
                          >
                            {w.status === 'completed' ? (
                              <Check size={8} className="text-success" />
                            ) : (
                              <Icon size={8} className={config.color} />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Goals ─── */}
        {goals && goals.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-1.5">
                <Target size={14} /> Goals
              </h2>
              <button onClick={() => navigate('/goals')} className="text-xs text-primary font-medium">
                Manage
              </button>
            </div>
            <div className="space-y-1.5">
              {goals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl">
                  <Target size={16} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{goal.title}</p>
                    {goal.targetDate && (
                      <p className="text-xs text-text-muted">
                        Target: {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Week Stats ─── */}
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-2">Week Stats</h2>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Sessions" value={totalSessions.toString()} />
            <StatCard label="Volume" value={formatVolume(totalVolume)} sublabel="lbs" />
            <StatCard
              label="Completion"
              value={
                hasWeekPlan && weekWorkouts
                  ? `${Math.round(
                      (weekWorkouts.filter((w) => w.status === 'completed').length /
                        Math.max(weekWorkouts.filter((w) => w.status !== 'skipped').length, 1)) *
                        100
                    )}%`
                  : '—'
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}
