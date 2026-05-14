import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Moon, Sun, Scale, Ruler, User, Trash2, Database, Bug } from 'lucide-react';
import { db } from '@/data/db';
import { seedSampleWeek } from '@/data/seed-week';
import { PageHeader } from '@/shared/components/PageHeader';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/shared/utils/cn';
import type { WeightUnit, DistanceUnit } from '@/types';

export function SettingsPage() {
  const { darkMode, toggleDarkMode } = useUIStore();
  const profile = useLiveQuery(() => db.userProfile.get('default'));
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  const handleSeedWeek = async () => {
    const created = await seedSampleWeek();
    setSeedStatus(created ? 'Sample week seeded! Check Today tab.' : 'Week already exists — skipped.');
    setTimeout(() => setSeedStatus(null), 3000);
  };

  const handleClearWeek = async () => {
    const commits = await db.weekCommits.toArray();
    for (const c of commits) {
      await db.stagedWorkouts.where('weekCommitId').equals(c.id).delete();
    }
    await db.weekCommits.clear();
    setSeedStatus('Week data cleared.');
    setTimeout(() => setSeedStatus(null), 3000);
  };

  if (!profile) return null;

  const updateProfile = (updates: Partial<typeof profile>) => {
    db.userProfile.update('default', { ...updates, updatedAt: Date.now() });
  };

  return (
    <div>
      <PageHeader title="Settings" showBack />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {/* Appearance */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Appearance</h2>
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between p-3 bg-surface-secondary rounded-xl"
          >
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={18} /> : <Sun size={18} />}
              <span className="text-sm font-medium">Dark Mode</span>
            </div>
            <div className={cn(
              'w-10 h-6 rounded-full transition-colors relative',
              darkMode ? 'bg-primary' : 'bg-border'
            )}>
              <div className={cn(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
                darkMode ? 'translate-x-4.5' : 'translate-x-0.5'
              )} />
            </div>
          </button>
        </section>

        {/* Units */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Units</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-xl">
              <div className="flex items-center gap-3">
                <Scale size={18} />
                <span className="text-sm font-medium">Weight</span>
              </div>
              <div className="flex bg-surface rounded-lg p-0.5">
                {(['lbs', 'kg'] as WeightUnit[]).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => updateProfile({ weightUnit: unit })}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                      profile.weightUnit === unit ? 'bg-primary text-white' : 'text-text-secondary'
                    )}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-xl">
              <div className="flex items-center gap-3">
                <Ruler size={18} />
                <span className="text-sm font-medium">Distance</span>
              </div>
              <div className="flex bg-surface rounded-lg p-0.5">
                {(['mi', 'km'] as DistanceUnit[]).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => updateProfile({ distanceUnit: unit })}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                      profile.distanceUnit === unit ? 'bg-primary text-white' : 'text-text-secondary'
                    )}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Profile */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Profile</h2>
          <div className="space-y-2">
            <div className="p-3 bg-surface-secondary rounded-xl">
              <label className="text-xs text-text-muted block mb-1">Fitness Level</label>
              <div className="flex bg-surface rounded-lg p-0.5">
                {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => updateProfile({ fitnessLevel: level })}
                    className={cn(
                      'flex-1 px-2 py-1.5 text-xs font-medium rounded-md capitalize transition-colors',
                      profile.fitnessLevel === level ? 'bg-primary text-white' : 'text-text-secondary'
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 bg-surface-secondary rounded-xl">
              <label className="text-xs text-text-muted block mb-1">Body Weight ({profile.weightUnit})</label>
              <input
                type="number"
                placeholder="Enter weight"
                value={profile.bodyweightKg ?? ''}
                onChange={(e) => updateProfile({ bodyweightKg: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full text-sm bg-surface rounded-lg p-2 border border-border focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Dev Tools */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Bug size={12} /> Dev Tools
          </h2>
          <div className="space-y-2">
            <button
              onClick={handleSeedWeek}
              className="w-full flex items-center gap-3 p-3 bg-surface-secondary rounded-xl text-left active:scale-[0.99] transition-transform"
            >
              <Database size={18} className="text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Seed Sample Week</p>
                <p className="text-xs text-text-muted">Create a test week plan for the Today checklist</p>
              </div>
            </button>
            <button
              onClick={handleClearWeek}
              className="w-full flex items-center gap-3 p-3 bg-surface-secondary rounded-xl text-left active:scale-[0.99] transition-transform"
            >
              <Trash2 size={18} className="text-warning shrink-0" />
              <div>
                <p className="text-sm font-medium">Clear Week Data</p>
                <p className="text-xs text-text-muted">Remove all week commits and staged workouts</p>
              </div>
            </button>
          </div>
          {seedStatus && (
            <p className="mt-2 text-xs text-primary font-medium text-center">{seedStatus}</p>
          )}
        </section>

        {/* Danger zone */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Data</h2>
          <button
            onClick={async () => {
              if (confirm('This will delete ALL workout data. Are you sure?')) {
                await db.delete();
                window.location.reload();
              }
            }}
            className="w-full flex items-center gap-3 p-3 bg-surface-secondary rounded-xl text-danger"
          >
            <Trash2 size={18} />
            <span className="text-sm font-medium">Clear All Data</span>
          </button>
        </section>
      </div>
    </div>
  );
}
