import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface DayData {
  date: string; // YYYY-MM-DD
  count: number;
}

interface ActivityHeatmapProps {
  activityData: DayData[];
}

function getIntensity(count: number): string {
  if (count === 0) return 'bg-border/50';
  if (count === 1) return 'bg-primary/30';
  if (count === 2) return 'bg-primary/55';
  if (count === 3) return 'bg-primary/80';
  return 'bg-primary';
}

export function ActivityHeatmap({ activityData }: ActivityHeatmapProps) {
  const { weeks, streak, totalActive } = useMemo(() => {
    const dataMap = new Map<string, number>();
    for (const d of activityData) {
      dataMap.set(d.date, d.count);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build 13 weeks ending on today's week (Mon-Sun columns)
    const todayDow = today.getDay();
    const daysUntilSun = todayDow === 0 ? 0 : 7 - todayDow;
    const endDay = new Date(today);
    endDay.setDate(endDay.getDate() + daysUntilSun);

    const cursor = new Date(endDay);
    cursor.setDate(cursor.getDate() - 90);
    const cursorDow = cursor.getDay();
    cursor.setDate(cursor.getDate() + (cursorDow === 0 ? -6 : 1 - cursorDow));

    const weeksArr: { count: number; isFuture: boolean; isToday: boolean }[][] = [];
    const todayStr = today.toISOString().slice(0, 10);

    for (let w = 0; w < 13; w++) {
      const week: { count: number; isFuture: boolean; isToday: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = cursor.toISOString().slice(0, 10);
        week.push({
          count: dataMap.get(dateStr) ?? 0,
          isFuture: cursor.getTime() > today.getTime(),
          isToday: dateStr === todayStr,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeksArr.push(week);
    }

    // Streak
    let currentStreak = 0;
    const streakCursor = new Date(today);
    if (!dataMap.get(todayStr)) {
      streakCursor.setDate(streakCursor.getDate() - 1);
    }
    while (true) {
      const ds = streakCursor.toISOString().slice(0, 10);
      if ((dataMap.get(ds) ?? 0) > 0) {
        currentStreak++;
        streakCursor.setDate(streakCursor.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      weeks: weeksArr,
      streak: currentStreak,
      totalActive: activityData.filter((d) => d.count > 0).length,
    };
  }, [activityData]);

  return (
    <div className="flex items-center gap-3">
      {/* Compact grid */}
      <div className="flex gap-[2px] flex-1 min-w-0">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[2px] flex-1">
            {week.map((day, di) => (
              <div
                key={di}
                className={cn(
                  'aspect-square rounded-[2px]',
                  day.isFuture ? 'bg-transparent' : getIntensity(day.count),
                  day.isToday && 'ring-1 ring-primary',
                )}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {streak > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-warning whitespace-nowrap">
            <Flame size={11} /> {streak}d
          </span>
        )}
        <span className="text-[10px] text-text-muted whitespace-nowrap">
          {totalActive} days
        </span>
      </div>
    </div>
  );
}
