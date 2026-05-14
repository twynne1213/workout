import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Target, Check, X, ChevronRight } from 'lucide-react';
import { nanoid } from 'nanoid';
import { db } from '@/data/db';
import { PageHeader } from '@/shared/components/PageHeader';
import { cn } from '@/shared/utils/cn';
import type { Goal, GoalType, GoalStatus } from '@/types';

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'race', label: 'Race / Endurance' },
  { value: 'body_composition', label: 'Body Comp' },
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'mobility', label: 'Mobility' },
];

const STATUS_COLORS: Record<GoalStatus, string> = {
  active: 'text-primary bg-primary/10',
  completed: 'text-success bg-success/10',
  paused: 'text-text-muted bg-surface-secondary',
};

export function GoalsPage() {
  const goals = useLiveQuery(() => db.goals.toArray());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('strength');
  const [targetDate, setTargetDate] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGoalType('strength');
    setTargetDate('');
    setShowForm(false);
    setEditingId(null);
  };

  const openEdit = (goal: Goal) => {
    setTitle(goal.title);
    setDescription(goal.description ?? '');
    setGoalType(goal.type);
    setTargetDate(goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '');
    setEditingId(goal.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    const now = Date.now();

    if (editingId) {
      await db.goals.update(editingId, {
        title: title.trim(),
        description: description.trim() || undefined,
        type: goalType,
        targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
        updatedAt: now,
      });
    } else {
      const goal: Goal = {
        id: nanoid(),
        type: goalType,
        title: title.trim(),
        description: description.trim() || undefined,
        targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      await db.goals.add(goal);
    }
    resetForm();
  };

  const toggleStatus = async (goal: Goal) => {
    const nextStatus: GoalStatus = goal.status === 'active' ? 'completed'
      : goal.status === 'completed' ? 'paused'
      : 'active';
    await db.goals.update(goal.id, { status: nextStatus, updatedAt: Date.now() });
  };

  const deleteGoal = async (id: string) => {
    await db.goals.delete(id);
  };

  const activeGoals = goals?.filter((g) => g.status === 'active') ?? [];
  const otherGoals = goals?.filter((g) => g.status !== 'active') ?? [];

  return (
    <div>
      <PageHeader title="Goals" showBack />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-5">
        {/* Add button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            <Plus size={18} />
            Add Goal
          </button>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-surface-secondary rounded-2xl p-4 space-y-3 border border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{editingId ? 'Edit Goal' : 'New Goal'}</h3>
              <button onClick={resetForm} className="p-1 text-text-muted">
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
              placeholder="e.g., Deadlift 315 lbs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 text-sm bg-surface rounded-xl border border-transparent focus:border-primary focus:outline-none"
              autoFocus
            />

            <textarea
              rows={2}
              placeholder="More context (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-sm bg-surface rounded-xl border border-transparent focus:border-primary focus:outline-none resize-none"
            />

            <div>
              <label className="text-xs text-text-muted block mb-1.5">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {GOAL_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setGoalType(value)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                      goalType === value ? 'bg-primary text-white' : 'bg-surface text-text-secondary'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-text-muted block mb-1.5">Target Date (optional)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full p-2.5 text-sm bg-surface rounded-xl border border-transparent focus:border-primary focus:outline-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className={cn(
                'w-full py-3 rounded-xl font-semibold text-sm transition-all',
                title.trim()
                  ? 'bg-primary text-white active:scale-[0.98]'
                  : 'bg-surface text-text-muted cursor-not-allowed'
              )}
            >
              {editingId ? 'Save Changes' : 'Add Goal'}
            </button>
          </div>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-secondary mb-2">Active</h2>
            <div className="space-y-2">
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => openEdit(goal)}
                  onToggle={() => toggleStatus(goal)}
                  onDelete={() => deleteGoal(goal.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {goals?.length === 0 && !showForm && (
          <div className="text-center py-12">
            <Target size={40} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">No goals yet</p>
            <p className="text-xs text-text-muted">Set a goal to give your weekly plans direction.</p>
          </div>
        )}

        {/* Completed / Paused */}
        {otherGoals.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-secondary mb-2">Completed & Paused</h2>
            <div className="space-y-2">
              {otherGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => openEdit(goal)}
                  onToggle={() => toggleStatus(goal)}
                  onDelete={() => deleteGoal(goal.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onToggle,
  onDelete,
}: {
  goal: Goal;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="bg-surface-secondary rounded-xl overflow-hidden">
      <button
        onClick={() => setShowActions(!showActions)}
        className="w-full flex items-center gap-3 p-3 text-left active:scale-[0.99] transition-transform"
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', STATUS_COLORS[goal.status])}
        >
          {goal.status === 'completed' ? <Check size={14} /> : <Target size={14} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', goal.status === 'completed' && 'line-through opacity-60')}>
            {goal.title}
          </p>
          <p className="text-xs text-text-muted">
            {GOAL_TYPES.find((t) => t.value === goal.type)?.label}
            {goal.targetDate && ` · by ${new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
          </p>
        </div>
        <ChevronRight size={14} className={cn('text-text-muted transition-transform', showActions && 'rotate-90')} />
      </button>

      {showActions && (
        <div className="flex border-t border-border divide-x divide-border">
          <button onClick={onEdit} className="flex-1 py-2.5 text-xs font-medium text-primary">
            Edit
          </button>
          <button onClick={onToggle} className="flex-1 py-2.5 text-xs font-medium text-text-secondary">
            {goal.status === 'active' ? 'Complete' : goal.status === 'completed' ? 'Pause' : 'Reactivate'}
          </button>
          <button onClick={onDelete} className="flex-1 py-2.5 text-xs font-medium text-danger">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
