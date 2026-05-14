import { X } from 'lucide-react';
import { Timer } from '@/shared/components/Timer';
import { useWorkoutStore } from '@/stores/workoutStore';

export function RestTimer() {
  const restTimer = useWorkoutStore((s) => s.restTimer);
  const tickRest = useWorkoutStore((s) => s.tickRest);
  const clearRest = useWorkoutStore((s) => s.clearRest);

  if (!restTimer) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-elevated rounded-2xl p-8 text-center shadow-xl min-w-[240px]">
        <p className="text-sm font-medium text-text-secondary mb-4">Rest Timer</p>
        <Timer
          seconds={restTimer.remaining}
          totalSeconds={restTimer.total}
          onTick={tickRest}
          isCountdown
        />
        <button
          onClick={clearRest}
          className="mt-6 flex items-center gap-1.5 mx-auto text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <X size={16} /> Skip Rest
        </button>
      </div>
    </div>
  );
}
