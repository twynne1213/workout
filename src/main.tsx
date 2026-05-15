import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/routes';
import { seedDatabase } from '@/data/seed';
import { useUIStore } from '@/stores/uiStore';
import { fullSync, startSyncListener } from '@/services/sync';
import './index.css';

// Apply dark mode on load
const darkMode = useUIStore.getState().darkMode;
document.documentElement.classList.toggle('dark', darkMode);

// Seed the database with default exercises and stretches
seedDatabase();

// Start cross-device sync: pull remote changes, then listen for local writes
fullSync().then((result) => {
  if (result.pulled > 0 || result.pushed > 0) {
    console.log(`[sync] initial sync: ${result.pulled} pulled, ${result.pushed} pushed`);
  }
  startSyncListener();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
