import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Play, Pause, SkipForward, Check, Plus, Trash2, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { db } from '@/data/db';
import { completeStagedWorkout } from '@/shared/utils/completeStagedWorkout';
import { PageHeader } from '@/shared/components/PageHeader';
import { Timer } from '@/shared/components/Timer';
import { MOBILITY_TIMING_LABELS } from '@/shared/utils/constants';
import { cn } from '@/shared/utils/cn';
import type { MobilityTiming, SequenceStretch } from '@/types';

export function SequencePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const sequence = useLiveQuery(() => (id ? db.mobilitySequences.get(id) : undefined), [id]);
  const stretches = useLiveQuery(() => db.stretches.toArray());
  const stretchMap = new Map(stretches?.map((s) => [s.id, s]) ?? []);

  const [mode, setMode] = useState<'edit' | 'play'>('edit');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [showStretchPicker, setShowStretchPicker] = useState(false);

  const currentStretch = sequence?.stretches[currentIndex];
  const currentStretchData = currentStretch ? stretchMap.get(currentStretch.stretchId) : null;

  useEffect(() => {
    if (currentStretch) setSecondsLeft(currentStretch.durationSeconds);
  }, [currentIndex, currentStretch]);

  const tickTimer = useCallback(() => {
    if (isPaused) return;
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        // Auto advance
        if (currentStretch) {
          setCompletedIds((c) => [...c, currentStretch.stretchId]);
        }
        if (sequence && currentIndex < sequence.stretches.length - 1) {
          setCurrentIndex((i) => i + 1);
          return sequence.stretches[currentIndex + 1]?.durationSeconds ?? 0;
        }
        setIsPaused(true);
        return 0;
      }
      return prev - 1;
    });
  }, [isPaused, currentStretch, sequence, currentIndex]);

  if (!sequence) return null;

  const updateSequence = (updates: Partial<typeof sequence>) => {
    db.mobilitySequences.update(sequence.id, { ...updates, updatedAt: Date.now() });
  };

  const addStretch = (stretchId: string) => {
    const stretch = stretchMap.get(stretchId);
    if (!stretch) return;
    const entry: SequenceStretch = {
      stretchId,
      order: sequence.stretches.length,
      durationSeconds: stretch.defaultDurationSeconds,
    };
    const updated = [...sequence.stretches, entry];
    updateSequence({
      stretches: updated,
      totalDuration: updated.reduce((s, e) => s + e.durationSeconds, 0),
    });
  };

  const removeStretch = (index: number) => {
    const updated = sequence.stretches.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }));
    updateSequence({
      stretches: updated,
      totalDuration: updated.reduce((s, e) => s + e.durationSeconds, 0),
    });
  };

  const startPlaying = () => {
    if (sequence.stretches.length === 0) return;
    setMode('play');
    setCurrentIndex(0);
    setSecondsLeft(sequence.stretches[0].durationSeconds);
    setIsPaused(false);
    setCompletedIds([]);
  };

  const finishSession = async () => {
    const now = Date.now();
    const logId = nanoid();
    await db.mobilityLogs.add({
      id: logId,
      sequenceId: sequence.id,
      timing: sequence.timing,
      completedStretches: completedIds,
      duration: sequence.totalDuration,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    // Close the loop: mark the matching staged workout as completed
    await completeStagedWorkout('mobility', logId);
    navigate('/', { replace: true });
  };

  const skipStretch = () => {
    if (sequence && currentIndex < sequence.stretches.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setIsPaused(true);
    }
  };

  // Play mode
  if (mode === 'play') {
    const progress = sequence.stretches.length > 0
      ? ((currentIndex + 1) / sequence.stretches.length) * 100
      : 0;
    const allDone = currentIndex >= sequence.stretches.length - 1 && secondsLeft <= 0;

    return (
      <div className="min-h-svh bg-surface flex flex-col">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => setMode('edit')} className="text-sm text-text-secondary">
            <X size={20} />
          </button>
          <p className="text-xs text-text-muted">
            {currentIndex + 1} / {sequence.stretches.length}
          </p>
          <button onClick={skipStretch} className="text-sm text-primary">
            <SkipForward size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-surface-secondary mx-4 rounded-full overflow-hidden">
          <div className="h-full bg-warning transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-2xl font-bold mb-2 text-center">{currentStretchData?.name ?? 'Stretch'}</p>
          {currentStretch?.sides === 'left_right' && (
            <p className="text-sm text-warning font-medium mb-4">Each side</p>
          )}
          <Timer
            seconds={secondsLeft}
            totalSeconds={currentStretch?.durationSeconds}
            onTick={tickTimer}
            isCountdown
          />
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="mt-8 w-14 h-14 rounded-full bg-warning flex items-center justify-center text-white"
          >
            {isPaused ? <Play size={24} /> : <Pause size={24} />}
          </button>
        </div>

        {allDone && (
          <div className="p-4">
            <button
              onClick={finishSession}
              className="w-full py-3.5 bg-success text-white rounded-xl font-semibold text-sm"
            >
              <Check size={16} className="inline mr-1" /> Complete Session
            </button>
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div>
      <PageHeader
        title="Sequence"
        showBack
        rightAction={
          sequence.stretches.length > 0 ? (
            <button
              onClick={startPlaying}
              className="flex items-center gap-1 px-3 py-1.5 bg-warning text-white rounded-lg text-sm font-medium"
            >
              <Play size={14} /> Start
            </button>
          ) : undefined
        }
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Name */}
        {editingName ? (
          <input
            type="text"
            value={sequence.name}
            onChange={(e) => updateSequence({ name: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
            className="text-xl font-bold bg-transparent border-b-2 border-warning focus:outline-none w-full"
            autoFocus
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="text-xl font-bold text-left w-full">
            {sequence.name}
          </button>
        )}

        {/* Timing selector */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(MOBILITY_TIMING_LABELS) as [MobilityTiming, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => updateSequence({ timing: key })}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                sequence.timing === key ? 'bg-warning text-white' : 'bg-surface-secondary text-text-secondary'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Stretch list */}
        <div className="space-y-2">
          {sequence.stretches.map((entry, index) => {
            const s = stretchMap.get(entry.stretchId);
            return (
              <div key={`${entry.stretchId}-${index}`} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-xl">
                <span className="text-xs text-text-muted w-5 text-center">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-text-muted">{entry.durationSeconds}s</p>
                </div>
                <button
                  onClick={() => removeStretch(index)}
                  className="p-1 text-text-muted hover:text-danger transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add stretch */}
        <button
          onClick={() => setShowStretchPicker(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-xl text-sm font-medium text-text-secondary hover:border-warning hover:text-warning transition-colors"
        >
          <Plus size={16} /> Add Stretch
        </button>
      </div>

      {/* Simple stretch picker modal */}
      {showStretchPicker && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-surface">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Add Stretch</h2>
            <button onClick={() => setShowStretchPicker(false)} className="p-1.5 text-text-secondary">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {stretches?.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  addStretch(s.id);
                  setShowStretchPicker(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-secondary transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-text-muted capitalize">{s.category} · {s.defaultDurationSeconds}s</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
