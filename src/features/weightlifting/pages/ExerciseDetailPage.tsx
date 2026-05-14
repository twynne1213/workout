import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { TrendingUp, Trophy, Clock } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { db } from '@/data/db';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { useExerciseProgressData } from '@/features/weightlifting/hooks/useExerciseHistory';
import { MUSCLE_GROUP_LABELS } from '@/shared/utils/constants';
import { formatDate, formatVolume } from '@/shared/utils/format';

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const exercise = useLiveQuery(() => (id ? db.exercises.get(id) : undefined), [id]);
  const progressData = useExerciseProgressData(id);

  if (!exercise) return null;

  const hasData = progressData && progressData.length > 0;

  // Calculate stats
  const currentPR = hasData
    ? Math.max(...progressData.map((d) => d.topWeight))
    : 0;
  const current1RM = hasData
    ? Math.max(...progressData.map((d) => d.estimated1RM))
    : 0;
  const totalSessions = progressData?.length ?? 0;

  // Format chart data
  const chartData = progressData?.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: d.topWeight,
    e1rm: d.estimated1RM,
    volume: d.totalVolume,
  }));

  return (
    <div>
      <PageHeader title={exercise.name} showBack />
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Exercise info */}
        <div className="bg-surface-secondary rounded-xl p-4">
          <p className="text-xs text-text-muted mb-1.5">Muscle Groups</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {exercise.muscleGroups.map((g) => (
              <span key={g} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {MUSCLE_GROUP_LABELS[g]}
              </span>
            ))}
          </div>
          <p className="text-xs text-text-muted mb-0.5">Category</p>
          <p className="text-sm capitalize">{exercise.category}</p>
        </div>

        {hasData ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="PR" value={`${currentPR} lbs`} />
              <StatCard label="Est. 1RM" value={`${current1RM} lbs`} />
              <StatCard label="Sessions" value={totalSessions.toString()} />
            </div>

            {/* Weight / E1RM chart */}
            <div className="bg-surface-secondary rounded-xl p-4">
              <h3 className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 mb-3">
                <TrendingUp size={12} /> Strength Progress
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                      width={35}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#6366f1' }}
                      name="Top Weight"
                    />
                    <Line
                      type="monotone"
                      dataKey="e1rm"
                      stroke="#818cf8"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={{ r: 2, fill: '#818cf8' }}
                      name="Est. 1RM"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Volume chart */}
            <div className="bg-surface-secondary rounded-xl p-4">
              <h3 className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 mb-3">
                <Trophy size={12} /> Volume Per Session
              </h3>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#22c55e' }}
                      name="Volume (lbs)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent history */}
            <div>
              <h3 className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 mb-2">
                <Clock size={12} /> Recent Sessions
              </h3>
              <div className="space-y-1.5">
                {progressData
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 bg-surface-secondary rounded-xl"
                    >
                      <div>
                        <p className="text-xs font-medium">{formatDate(d.date)}</p>
                        <p className="text-[10px] text-text-muted">
                          {d.sets} sets · Top: {d.topWeight} lbs
                        </p>
                      </div>
                      <span className="text-xs font-medium text-text-secondary">
                        {formatVolume(d.totalVolume)} lbs vol
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-surface-secondary rounded-xl p-4 flex items-center justify-center py-12">
            <div className="text-center">
              <TrendingUp size={32} className="text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-secondary">
                Complete a workout with this exercise to see progress charts.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
