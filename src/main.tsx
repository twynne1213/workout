import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/routes';
import { seedDatabase } from '@/data/seed';
import { useUIStore } from '@/stores/uiStore';
import './index.css';

// Apply dark mode on load
const darkMode = useUIStore.getState().darkMode;
document.documentElement.classList.toggle('dark', darkMode);

// Seed the database with default exercises and stretches
seedDatabase();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
