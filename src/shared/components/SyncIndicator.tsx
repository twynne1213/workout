import { useState, useEffect, useCallback } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { fullSync } from '@/services/sync';
import { supabase } from '@/services/supabase';
import { cn } from '@/shared/utils/cn';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>(supabase ? 'idle' : 'offline');
  const [visible, setVisible] = useState(false);

  const runSync = useCallback(async () => {
    if (!supabase) return;
    setStatus('syncing');
    setVisible(true);

    try {
      const result = await fullSync();
      setStatus(result.errors.length > 0 ? 'error' : 'success');
    } catch {
      setStatus('error');
    }

    // Hide after 2 seconds
    setTimeout(() => setVisible(false), 2000);
  }, []);

  // Show briefly on mount once the initial sync finishes
  useEffect(() => {
    if (!supabase) return;
    // Small delay to let initial sync in main.tsx settle
    const timer = setTimeout(() => {
      setStatus('success');
      setVisible(true);
      setTimeout(() => setVisible(false), 1500);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!supabase) return null;

  const Icon = status === 'syncing' ? RefreshCw
    : status === 'error' || status === 'offline' ? CloudOff
    : Cloud;

  return (
    <button
      onClick={runSync}
      className={cn(
        'fixed top-2 right-2 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none',
        status === 'syncing' && 'bg-primary/10 text-primary',
        status === 'success' && 'bg-success/10 text-success',
        status === 'error' && 'bg-danger/10 text-danger',
      )}
    >
      <Icon size={12} className={cn(status === 'syncing' && 'animate-spin')} />
      {status === 'syncing' ? 'Syncing...'
        : status === 'success' ? 'Synced'
        : status === 'error' ? 'Sync error'
        : 'Offline'}
    </button>
  );
}
