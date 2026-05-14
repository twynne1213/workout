import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import {
  Plus, StretchHorizontal, Play, Calendar, Clock, Check,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { db } from '@/data/db';
import { buildSequenceFromDescription } from '@/shared/utils/buildSequenceFromDescription';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { SwipeToDelete } from '@/shared/components/SwipeToDelete';
import { useCurrentWeekCommit, useWeekStagedWorkouts, getDayStart } from '@/shared/hooks/useWeekPlan';
import { MOBILITY_TIMING_LABELS } from '@/shared/utils/constants';
import { formatDate, formatDuration } from '@/shared/utils/format';
import { cn } from '@/shared/utils/cn';
import type { StagedWorkout, MobilityLog, MobilityTiming } from '@/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MobilityPage() {
  const navigate = useNavigate();

  const weekCommit = useCurrentWeekCommit();
  const weekWorkouts = useWeekStagedWorkouts(weekCommit?.id);
  const sequences = useLiveQuery(() => db.mobilitySequences.toArray());
  const allLogs = useLiveQuery(
    () => db.mobilityLogs.orderBy('completedAt').reverse().toArray()
  );
  const seqMap = new Map(sequences?.map((s) => [s.id, s]) ?? []);

  const todayStart = getDayStart();
  const todayDow = new Date().getDay();

  // Filter staged mobility
  const allMobility = weekWorkouts?.filter((w) => w.type === 'mobility') ?? [];
  const todayMobility = allMobility
    .filter((w) => w.dayOfWeek === todayDow)
    .sort((a, b) => a.orderInDay - b.orderInDay);
  const upcomingMobility = allMobility
    .filter((w) => {
      const wDay = new Date(w.date);
      wDay.setHours(0, 0, 0, 0);
      return wDay.getTime() > todayStart && w.status === 'pending';
    })
    .sort((a, b) => a.date - b.date);

  const handleStartMobility = async (staged: StagedWorkout) => {
    db.stagedWorkouts.update(staged.id, { status: 'active', updatedAt: Date.now() });

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
  };

  const createSequence = async () => {
    const now = Date.now();
    const id = nanoid();
    await db.mobilitySequences.add({
      id,
      name: 'New Sequence',
      timing: 'any' as MobilityTiming,
      stretches: [],
      totalDuration: 0,
      createdAt: now,
      updatedAt: now,
    });
    navigate(`/mobility/play/${id}`);
  };

  const deleteLog = (log: MobilityLog) => {
    db.mobilityLogs.delete(log.id);
    db.stagedWorkouts
      .where('completedMobilityLogId')
      .equals(log.id)
      .modify({ completedMobilityLogId: undefined, status: 'pending' });
  };

  const deleteStagedWorkout = (staged: StagedWorkout) => {
    db.stagedWorkouts.delete(staged.id);
  };

  // Group sequences by timing
  const grouped = sequences?.reduce((acc, seq) => {
    if (!acc[seq.timing]) acc[seq.timing] = [];
    acc[seq.timing].push(seq);
    return acc;
  }, {} as Record<string, typeof sequences>);

  return (
    <div>
      <PageHeader title="Mobility" />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-5">
        {/* ─── Today ─── */}
        {todayMobility.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Today</h2>
            <div className="space-y-2">
              {todayMobility.map((staged) => {
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
                        isDone ? 'bg-success/10' : 'bg-warning/10'
                      )}>
                        {isDone ? (
                          <Check size={18} className="text-success" />
                        ) : (
                          <StretchHorizontal size={18} className="text-warning" />
                        )}
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
                          onClick={() => handleStartMobility(staged)}
                          className="p-2 rounded-xl bg-warning text-white active:scale-95 transition-transform shrink-0"
                        >
                          <Play size={16} />
                        </button>
                      )}
                      {staged.status === 'active' && (
                        <button
                          onClick={() => handleStartMobility(staged)}
                          className="px-3 py-1.5 bg-warning text-white rounded-lg text-xs font-medium shrink-0"
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

        {/* Create button */}
        <button
          onClick={createSequence}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-warning text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
        >
          <Plus size={18} />
          New Stretch Sequence
        </button>

        {/* ─── Upcoming ─── */}
        {upcomingMobility.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              <Calendar size={12} className="inline mr-1" />Upcoming
            </h2>
            <div className="space-y-1.5">
              {upcomingMobility.map((staged) => (
                <SwipeToDelete key={staged.id} onDelete={() => deleteStagedWorkout(staged)}>
                  <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                      <StretchHorizontal size={14} className="text-warning" />
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

        {/* ─── Sequences ─── */}
        {sequences && sequences.length > 0 && (
          <>
            {Object.entries(grouped ?? {}).map(([timing, seqs]) => (
              <section key={timing}>
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  {MOBILITY_TIMING_LABELS[timing] ?? timing}
                </h2>
                <div className="space-y-1.5">
                  {seqs?.map((seq) => (
                    <SwipeToDelete
                      key={seq.id}
                      onDelete={() => db.mobilitySequences.delete(seq.id)}
                    >
                      <button
                        onClick={() => navigate(`/mobility/play/${seq.id}`)}
                        className="w-full flex items-center gap-3 p-3 bg-surface-secondary rounded-xl text-left active:scale-[0.99] transition-transform"
                      >
                        <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                          <Play size={16} className="text-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{seq.name}</p>
                          <p className="text-xs text-text-muted">
                            {seq.stretches.length} stretches · {formatDuration(seq.totalDuration)}
                          </p>
                        </div>
                      </button>
                    </SwipeToDelete>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {/* ─── History ─── */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">History</h2>
          {!allLogs || allLogs.length === 0 ? (
            <EmptyState
              icon={StretchHorizontal}
              title="No history yet"
              description="Complete a mobility session and it will appear here."
            />
          ) : (
            <div className="space-y-1.5">
              {allLogs.map((log) => {
                const seq = seqMap.get(log.sequenceId);
                return (
                  <SwipeToDelete key={log.id} onDelete={() => deleteLog(log)}>
                    <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl">
                      <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                        <StretchHorizontal size={18} className="text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{seq?.name ?? 'Sequence'}</p>
                        <p className="text-xs text-text-muted">
                          {MOBILITY_TIMING_LABELS[log.timing]} · {formatDate(log.completedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{log.completedStretches.length} stretches</p>
                        <p className="text-xs text-text-muted">{formatDuration(log.duration)}</p>
                      </div>
                    </div>
                  </SwipeToDelete>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
