import type { WeightUnit, DistanceUnit } from '@/types';

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPace(secondsPerKm: number, unit: DistanceUnit): string {
  const adjusted = unit === 'mi' ? secondsPerKm * 1.60934 : secondsPerKm;
  const m = Math.floor(adjusted / 60);
  const s = Math.round(adjusted % 60);
  return `${m}:${String(s).padStart(2, '0')} /${unit}`;
}

export function formatWeight(value: number, unit: WeightUnit): string {
  return `${value} ${unit}`;
}

export function formatDistance(meters: number, unit: DistanceUnit): string {
  const divisor = unit === 'km' ? 1000 : 1609.34;
  return `${(meters / divisor).toFixed(2)} ${unit}`;
}

export function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatVolume(volume: number): string {
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k`;
  return volume.toString();
}
