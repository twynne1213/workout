import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from '@/shared/components/BottomNav';
import { SyncIndicator } from '@/shared/components/SyncIndicator';
import { useWorkoutStore } from '@/stores/workoutStore';

export function AppLayout() {
  const location = useLocation();
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);

  // Hide bottom nav during active workout for distraction-free mode
  const hideNav = location.pathname === '/workout/active' && activeWorkout;

  return (
    <div className="flex flex-col min-h-svh bg-surface">
      <SyncIndicator />
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
