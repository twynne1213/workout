import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Plus, ListChecks, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { db } from '@/data/db';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { formatDate } from '@/shared/utils/format';

export function RoutinesPage() {
  const navigate = useNavigate();
  const routines = useLiveQuery(() => db.routines.toArray());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const createRoutine = async () => {
    const now = Date.now();
    const id = nanoid();
    await db.routines.add({
      id,
      name: 'New Routine',
      exercises: [],
      createdAt: now,
      updatedAt: now,
    });
    navigate(`/routines/${id}`);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await db.routines.delete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Routines"
        showBack
        rightAction={
          <button
            onClick={createRoutine}
            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus size={20} />
          </button>
        }
      />

      <div className="px-4 py-4 max-w-lg mx-auto">
        {routines?.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No routines yet"
            description="Build reusable workout templates with your preferred exercises, sets, and rep ranges."
            action={
              <button
                onClick={createRoutine}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"
              >
                Create First Routine
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {routines?.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl"
              >
                <button
                  onClick={() => navigate(`/routines/${r.id}`)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-text-muted">
                    {r.exercises.length} exercises
                    {r.lastPerformedAt && ` · Last: ${formatDate(r.lastPerformedAt)}`}
                  </p>
                </button>
                <button
                  onClick={() => setDeleteId(r.id)}
                  className="p-1.5 text-text-muted hover:text-danger transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Routine?"
        description="This routine will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
