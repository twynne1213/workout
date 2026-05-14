import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, Activity, StretchHorizontal, BotMessageSquare } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/workout', icon: Dumbbell, label: 'Lift' },
  { to: '/cardio', icon: Activity, label: 'Cardio' },
  { to: '/mobility', icon: StretchHorizontal, label: 'Mobility' },
  { to: '/coach', icon: BotMessageSquare, label: 'Coach' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: 'var(--sai-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              )
            }
          >
            <Icon size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
