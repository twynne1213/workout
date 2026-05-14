import { useLiveQuery } from 'dexie-react-hooks';
import { StretchHorizontal } from 'lucide-react';
import { db } from '@/data/db';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate, formatDuration } from '@/shared/utils/format';
import { MOBILITY_TIMING_LABELS } from '@/shared/utils/constants';

export function MobilityHistoryPage() {
  const logs = useLiveQuery(
    () => db.mobilityLogs.orderBy('completedAt').reverse().toArray()
  );

  const sequences = useLiveQuery(() => db.mobilitySequences.toArray());
  const seqMap = new Map(sequences?.map((s) => [s.id, s]) ?? []);

  return (
    <div>
      <PageHeader title="Mobility History" showBack />
      <div className="px-4 py-4 max-w-lg mx-auto">
        {logs?.length === 0 ? (
          <EmptyState
            icon={StretchHorizontal}
            title="No history yet"
            description="Complete a mobility session and it will appear here."
          />
        ) : (
          <div className="space-y-2">
            {logs?.map((log) => {
              const seq = seqMap.get(log.sequenceId);
              return (
                <div key={log.id} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl">
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
