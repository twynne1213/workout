import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Plus, Activity, Clock, Calendar, Play } from 'lucide-react';
import { db } from '@/data/db';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { StatCard } from '@/shared/components/StatCard';
import { SwipeToDelete } from '@/shared/components/SwipeToDelete';
import { useCurrentWeekCommit, useWeekStagedWorkouts, getDayStart } from '@/shared/hooks/useWeekPlan';
import { formatDate, formatDuration, formatDistance } from '@/shared/utils/format';
import { CARDIO_TYPE_LABELS } from '@/shared/utils/constants';
import { cn } from '@/shared/utils/cn';
import type { StagedWorkout, CardioSession } from '@/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CardioPage() {
  const navigate = useNavigate();

  const weekCommit = useCurrentWeekCommit();
  const weekWorkouts = useWeekStagedWorkouts(weekCommit?.id);

  const allSessions = useLiveQuery(
    () => db.cardioSessions.orderBy('startedAt').reverse().toArray()
  );

  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekSessions = useLiveQuery(
    () => db.cardioSessions.where('startedAt').above(weekStart).toArray(),
    [weekStart]
  );

  const todayStart = getDayStart();
  const todayDow = new Date().getDay();

  // Filter staged cardio
  const allCardio = weekWorkouts?.filter((w) => w.type === 'cardio') ?? [];
  const todayCardio = allCardio
    .filter((w) => w.dayOfWeek === todayDow)
    .sort((a, b) => a.orderInDay - b.orderInDay);
  const upcomingCardio = allCardio
    .filter((w) => {
      const wDay = new Date(w.date);
      wDay.setHours(0, 0, 0, 0);
      return wDay.getTime() > todayStart && w.status === 'pending';
    })
    .sort((a, b) => a.date - b.date);

  const totalWeekDistance = weekSessions?.reduce((sum, s) => sum + (s.distanceMeters ?? 0), 0) ?? 0;
  const totalWeekDuration = weekSessions?.reduce((sum, s) => sum + s.durationSeconds, 0) ?? 0;

  const handleStartCardio = (staged: StagedWorkout) => {
    db.stagedWorkouts.update(staged.id, { status: 'active', updatedAt: Date.now() });
    navigate('/cardio/log');
  };

  const deleteSession = (session: CardioSession) => {
    db.cardioSessions.delete(session.id);
    db.stagedWorkouts
      .where('completedCardioSessionId')
      .equals(session.id)
      .modify({ completedCardioSessionId: undefined, status: 'pending' });
  };

  const deleteStagedWorkout = (staged: StagedWorkout) => {
    db.stagedWorkouts.delete(staged.id);
  };

  return (
    <div>
      <PageHeader title="Cardio" />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-5">
        {/* ─── Today ─── */}
        {todayCardio.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Today</h2>
            <div className="space-y-2">
              {todayCardio.map((staged) => {
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
                        isDone ? 'bg-success/10' : 'bg-success/10'
                      )}>
                        <Activity size={18} className={isDone ? 'text-success' : 'text-success'} />
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
                          onClick={() => handleStartCardio(staged)}
                          className="p-2 rounded-xl bg-success text-white active:scale-95 transition-transform shrink-0"
                        >
                          <Play size={16} />
                        </button>
                      )}
                    </div>
                  </SwipeToDelete>
                );
              })}
            </div>
          </section>
        )}

        {/* Log button when no planned cardio today */}
        {todayCardio.length === 0 && (
          <button
            onClick={() => navigate('/cardio/log')}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-success text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            <Plus size={18} />
            Log Cardio Session
          </button>
        )}

        {/* Week stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Sessions" value={(weekSessions?.length ?? 0).toString()} />
          <StatCard label="Distance" value={formatDistance(totalWeekDistance, 'mi')} />
          <StatCard label="Time" value={formatDuration(totalWeekDuration)} />
        </div>

        {/* ─── Upcoming ─── */}
        {upcomingCardio.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              <Calendar size={12} className="inline mr-1" />Upcoming
            </h2>
            <div className="space-y-1.5">
              {upcomingCardio.map((staged) => (
                <SwipeToDelete key={staged.id} onDelete={() => deleteStagedWorkout(staged)}>
                  <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <Activity size={14} className="text-success" />
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

        {/* ─── History ─── */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">History</h2>
          {!allSessions || allSessions.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No cardio sessions"
              description="Log your first run, cycle, or other cardio activity."
            />
          ) : (
            <div className="space-y-1.5">
              {allSessions.map((s) => (
                <SwipeToDelete key={s.id} onDelete={() => deleteSession(s)}>
                  <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                      <Activity size={18} className="text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{CARDIO_TYPE_LABELS[s.type]}</p>
                      <p className="text-xs text-text-muted">{formatDate(s.startedAt)}</p>
                    </div>
                    <div className="text-right">
                      {s.distanceMeters && (
                        <p className="text-sm font-medium">{formatDistance(s.distanceMeters, 'mi')}</p>
                      )}
                      <p className="text-xs text-text-muted flex items-center gap-0.5 justify-end">
                        <Clock size={10} /> {formatDuration(s.durationSeconds)}
                      </p>
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
