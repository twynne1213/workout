import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Clock, Dumbbell, Trophy } from 'lucide-react';
import { db } from '@/data/db';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate, formatDuration, formatVolume } from '@/shared/utils/format';

export function HistoryPage() {
  const navigate = useNavigate();

  const workouts = useLiveQuery(
    () => db.workoutLogs.orderBy('startedAt').reverse().toArray()
  );

  const exercises = useLiveQuery(() => db.exercises.toArray());
  const exerciseMap = new Map(exercises?.map((e) => [e.id, e]) ?? []);

  return (
    <div>
      <PageHeader title="Workout History" showBack />
      <div className="px-4 py-4 max-w-lg mx-auto">
        {workouts?.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No history yet"
            description="Complete a workout and it will appear here."
          />
        ) : (
          <div className="space-y-2">
            {workouts?.map((w) => (
              <div key={w.id} className="p-4 bg-surface-secondary rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">{w.name}</h3>
                  <span className="text-xs text-text-muted">{formatDate(w.startedAt)}</span>
                </div>
                <div className="flex gap-4 text-xs text-text-secondary mb-2">
                  <span className="flex items-center gap-1">
                    <Dumbbell size={12} />
                    {w.exercises.length} exercises
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatDuration(w.duration)}
                  </span>
                  <span>{formatVolume(w.totalVolume)} lbs</span>
                </div>
                <div className="space-y-0.5">
                  {w.exercises.map((entry) => {
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
