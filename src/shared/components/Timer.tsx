import { useEffect, useRef } from 'react';
import { formatDuration } from '@/shared/utils/format';
import { cn } from '@/shared/utils/cn';

interface TimerProps {
  seconds: number;
  totalSeconds?: number;
  onTick: () => void;
  isCountdown?: boolean;
  className?: string;
}

export function Timer({ seconds, totalSeconds, onTick, isCountdown, className }: TimerProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    intervalRef.current = setInterval(onTick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onTick]);

  const progress = totalSeconds ? (isCountdown ? seconds / totalSeconds : 1) : undefined;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <span className="text-3xl font-mono font-bold tabular-nums">
        {formatDuration(seconds)}
      </span>
      {progress !== undefined && (
        <div className="w-32 h-1 bg-surface-secondary rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
