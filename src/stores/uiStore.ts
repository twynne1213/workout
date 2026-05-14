import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      darkMode: true,
      toggleDarkMode: () =>
        set((state) => {
          const next = !state.darkMode;
          document.documentElement.classList.toggle('dark', next);
          return { darkMode: next };
        }),
      setDarkMode: (dark) =>
        set(() => {
          document.documentElement.classList.toggle('dark', dark);
          return { darkMode: dark };
        }),
    }),
    { name: 'ui-store' }
  )
);
