import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface DayData {
  date: string; // YYYY-MM-DD
  count: number;
}

interface ActivityHeatmapProps {
  /** Map of YYYY-MM-DD → activity count */
  activityData: DayData[];
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function getIntensity(count: number): string {
  if (count === 0) return 'bg-surface-secondary';
  if (count === 1) return 'bg-primary/25';
  if (count === 2) return 'bg-primary/50';
  if (count === 3) return 'bg-primary/75';
  return 'bg-primary';
}

export function ActivityHeatmap({ activityData }: ActivityHeatmapProps) {
  const { weeks, monthLabels, streak, totalActive } = useMemo(() => {
    // Build a map for quick lookup
    const dataMap = new Map<string, number>();
    for (const d of activityData) {
      dataMap.set(d.date, d.count);
    }

    // Generate 13 weeks of dates ending today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the Saturday of this week (end of week row)
    const endDay = new Date(today);
    const todayDow = today.getDay(); // 0=Sun
    // We want weeks Mon-Sun, so the last column ends on the current week's Sunday
    const daysUntilSun = todayDow === 0 ? 0 : 7 - todayDow;
    endDay.setDate(endDay.getDate() + daysUntilSun);

    // Start 13 weeks (91 days) before the end
    const startDay = new Date(endDay);
    startDay.setDate(startDay.getDate() - 90); // 91 days = 13 weeks

    // Build weeks (columns) of 7 days each (rows: Mon=0..Sun=6)
    const weeksArr: { date: string; count: number; isFuture: boolean }[][] = [];
    const months: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(startDay);
    // Align cursor to Monday
    const cursorDow = cursor.getDay();
    const mondayOffset = cursorDow === 0 ? -6 : 1 - cursorDow;
    cursor.setDate(cursor.getDate() + mondayOffset);

    for (let w = 0; w < 13; w++) {
      const week: { date: string; count: number; isFuture: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const isFuture = cursor.getTime() > today.getTime();
        week.push({
          date: dateStr,
          count: dataMap.get(dateStr) ?? 0,
          isFuture,
        });

        // Track month labels
        const month = cursor.getMonth();
        if (month !== lastMonth && d === 0) {
          months.push({
            label: cursor.toLocaleDateString('en-US', { month: 'short' }),
            weekIndex: w,
          });
          lastMonth = month;
        }

        cursor.setDate(cursor.getDate() + 1);
      }
      weeksArr.push(week);
    }

    // Calculate streak (consecutive days with activity ending today or yesterday)
    let currentStreak = 0;
    const streakCursor = new Date(today);
    // If today has no activity yet, start from yesterday
    const todayStr = today.toISOString().slice(0, 10);
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

    // Total active days in range
    const totalActiveDays = activityData.filter((d) => d.count > 0).length;

    return {
      weeks: weeksArr,
      monthLabels: months,
      streak: currentStreak,
      totalActive: totalActiveDays,
    };
  }, [activityData]);

  return (
    <div className="bg-surface-secondary rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-warning" />
          <span className="text-sm font-semibold">Activity</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {streak > 0 && (
            <span className="flex items-center gap-1">
              <Flame size={12} className="text-warning" />
              {streak} day streak
            </span>
          )}
          <span>{totalActive} active days</span>
        </div>
      </div>

      {/* Month labels */}
      <div className="flex ml-7 mb-1">
        {monthLabels.map((m, i) => (
          <span
            key={i}
            className="text-[10px] text-text-muted"
            style={{
              position: 'relative',
              left: `${m.weekIndex * (100 / 13)}%`,
              marginRight: 'auto',
            }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="flex gap-[3px]">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-1">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-[13px] flex items-center">
              <span className="text-[9px] text-text-muted leading-none w-5">{label}</span>
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px] flex-1">
            {week.map((day, di) => (
              <div
                key={di}
                className={cn(
                  'aspect-square rounded-[3px] min-h-[13px]',
                  day.isFuture ? 'bg-transparent' : getIntensity(day.count),
                )}
                title={`${day.date}: ${day.count} activities`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-[9px] text-text-muted mr-1">Less</span>
        <div className="w-[10px] h-[10px] rounded-[2px] bg-surface-secondary border border-border" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/25" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/50" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/75" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-primary" />
        <span className="text-[9px] text-text-muted ml-1">More</span>
      </div>
    </div>
  );
}
