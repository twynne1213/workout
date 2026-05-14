import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, X } from 'lucide-react';
import { db } from '@/data/db';
import { MUSCLE_GROUP_LABELS } from '@/shared/utils/constants';
import { cn } from '@/shared/utils/cn';
import type { MuscleGroup } from '@/types';

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
}

export function ExercisePicker({ open, onClose, onSelect }: ExercisePickerProps) {
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState<MuscleGroup | null>(null);

  const exercises = useLiveQuery(() => db.exercises.toArray());

  if (!open) return null;

  const filtered = exercises?.filter((e) => {
    const matchesSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = !filterGroup || e.muscleGroups.includes(filterGroup);
    return matchesSearch && matchesGroup;
  });

  const muscleGroups = Object.entries(MUSCLE_GROUP_LABELS) as [MuscleGroup, string][];

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Add Exercise</h2>
        <button onClick={onClose} className="p-1.5 text-text-secondary hover:text-text-primary">
          <X size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface-secondary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
      </div>

      {/* Muscle group filter chips */}
      <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setFilterGroup(null)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
            !filterGroup ? 'bg-primary text-white' : 'bg-surface-secondary text-text-secondary'
          )}
        >
          All
        </button>
        {muscleGroups.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterGroup(filterGroup === key ? null : key)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
              filterGroup === key
                ? 'bg-primary text-white'
                : 'bg-surface-secondary text-text-secondary'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-1">
          {filtered?.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => {
                onSelect(exercise.id);
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-secondary transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium">{exercise.name}</p>
                <p className="text-xs text-text-muted">
                  {exercise.muscleGroups.map((g) => MUSCLE_GROUP_LABELS[g]).join(', ')}
                </p>
              </div>
              <span className="text-[10px] text-text-muted capitalize px-2 py-0.5 bg-surface-secondary rounded-full">
                {exercise.category}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
