import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { WorkoutPage } from '@/features/weightlifting/pages/WorkoutPage';
import { ActiveWorkoutPage } from '@/features/weightlifting/pages/ActiveWorkoutPage';
import { RoutinesPage } from '@/features/weightlifting/pages/RoutinesPage';
import { RoutineDetailPage } from '@/features/weightlifting/pages/RoutineDetailPage';
import { HistoryPage } from '@/features/weightlifting/pages/HistoryPage';
import { CardioPage } from '@/features/cardio/pages/CardioPage';
import { CardioLogPage } from '@/features/cardio/pages/CardioLogPage';
import { CardioHistoryPage } from '@/features/cardio/pages/CardioHistoryPage';
import { MobilityPage } from '@/features/mobility/pages/MobilityPage';
import { SequencePlayerPage } from '@/features/mobility/pages/SequencePlayerPage';
import { MobilityHistoryPage } from '@/features/mobility/pages/MobilityHistoryPage';
import { CoachPage } from '@/features/coach/pages/CoachPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { GoalsPage } from '@/features/settings/pages/GoalsPage';

// Lazy-load the exercise detail page (pulls in Recharts ~350KB)
const ExerciseDetailPage = lazy(
  () => import('@/features/weightlifting/pages/ExerciseDetailPage').then((m) => ({ default: m.ExerciseDetailPage }))
);

function LazyFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/workout', element: <WorkoutPage /> },
      { path: '/workout/active', element: <ActiveWorkoutPage /> },
      { path: '/routines', element: <RoutinesPage /> },
      { path: '/routines/:id', element: <RoutineDetailPage /> },
      { path: '/history', element: <HistoryPage /> },
      {
        path: '/exercise/:id',
        element: (
          <Suspense fallback={<LazyFallback />}>
            <ExerciseDetailPage />
          </Suspense>
        ),
      },
      { path: '/cardio', element: <CardioPage /> },
      { path: '/cardio/log', element: <CardioLogPage /> },
      { path: '/cardio/history', element: <CardioHistoryPage /> },
      { path: '/mobility', element: <MobilityPage /> },
      { path: '/mobility/play/:id', element: <SequencePlayerPage /> },
      { path: '/mobility/history', element: <MobilityHistoryPage /> },
      { path: '/coach', element: <CoachPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/goals', element: <GoalsPage /> },
    ],
  },
]);
