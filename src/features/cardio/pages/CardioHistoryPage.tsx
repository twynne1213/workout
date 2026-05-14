import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, Clock } from 'lucide-react';
import { db } from '@/data/db';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate, formatDuration, formatDistance } from '@/shared/utils/format';
import { CARDIO_TYPE_LABELS } from '@/shared/utils/constants';

export function CardioHistoryPage() {
  const sessions = useLiveQuery(
    () => db.cardioSessions.orderBy('startedAt').reverse().toArray()
  );

  return (
    <div>
      <PageHeader title="Cardio History" showBack />
      <div className="px-4 py-4 max-w-lg mx-auto">
        {sessions?.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No history yet"
            description="Log a cardio session and it will appear here."
          />
        ) : (
          <div className="space-y-2">
            {sessions?.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
