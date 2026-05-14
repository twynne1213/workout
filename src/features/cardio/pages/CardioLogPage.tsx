import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { db } from '@/data/db';
import { completeStagedWorkout } from '@/shared/utils/completeStagedWorkout';
import { PageHeader } from '@/shared/components/PageHeader';
import { CARDIO_TYPE_LABELS } from '@/shared/utils/constants';
import { cn } from '@/shared/utils/cn';
import type { CardioType } from '@/types';

const cardioTypes: CardioType[] = ['run', 'cycle', 'walk', 'swim', 'row', 'elliptical'];

export function CardioLogPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<CardioType>('run');
  const [distanceMi, setDistanceMi] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [avgHR, setAvgHR] = useState('');
  const [notes, setNotes] = useState('');

  const canSave = durationMin !== '';

  const handleSave = async () => {
    const now = Date.now();
    const durationSeconds = Math.round(Number(durationMin) * 60);
    const distanceMeters = distanceMi ? Number(distanceMi) * 1609.34 : null;
    const avgPaceSecondsPerKm = distanceMeters && distanceMeters > 0
      ? (durationSeconds / (distanceMeters / 1000))
      : null;

    const sessionId = nanoid();
    await db.cardioSessions.add({
      id: sessionId,
      type,
      distanceMeters,
      durationSeconds,
      avgPaceSecondsPerKm,
      avgHeartRate: avgHR ? Number(avgHR) : null,
      notes: notes || undefined,
      startedAt: now - durationSeconds * 1000,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Close the loop: mark the matching staged workout as completed
    await completeStagedWorkout('cardio', sessionId);

    navigate('/', { replace: true });
  };

  return (
    <div>
      <PageHeader title="Log Cardio" showBack />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-5">
        {/* Type selector */}
        <div>
          <label className="text-xs font-medium text-text-muted block mb-2">Activity Type</label>
          <div className="flex flex-wrap gap-1.5">
            {cardioTypes.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  type === t ? 'bg-success text-white' : 'bg-surface-secondary text-text-secondary'
                )}
              >
                {CARDIO_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Duration (min)</label>
            <input
              type="number"
              placeholder="30"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              className="w-full p-2.5 text-sm bg-surface-secondary rounded-xl border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Distance (mi)</label>
            <input
              type="number"
              step="0.01"
              placeholder="3.1"
              value={distanceMi}
              onChange={(e) => setDistanceMi(e.target.value)}
              className="w-full p-2.5 text-sm bg-surface-secondary rounded-xl border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Avg HR (bpm)</label>
            <input
              type="number"
              placeholder="145"
              value={avgHR}
              onChange={(e) => setAvgHR(e.target.value)}
              className="w-full p-2.5 text-sm bg-surface-secondary rounded-xl border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-text-muted block mb-1">Notes</label>
          <textarea
            rows={3}
            placeholder="How did it feel?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2.5 text-sm bg-surface-secondary rounded-xl border border-transparent focus:border-primary focus:outline-none resize-none"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={cn(
            'w-full py-3.5 rounded-xl font-semibold text-sm transition-all',
            canSave
              ? 'bg-success text-white active:scale-[0.98]'
              : 'bg-surface-secondary text-text-muted cursor-not-allowed'
          )}
        >
          Save Session
        </button>
      </div>
    </div>
  );
}
