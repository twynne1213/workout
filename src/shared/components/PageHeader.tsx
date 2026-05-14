import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  showSettings?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, showBack, showSettings, rightAction, className }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border',
        className
      )}
      style={{ paddingTop: 'var(--sai-top, 0px)' }}
    >
      <div className="flex items-center justify-between h-12 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-1">
          {rightAction}
          {showSettings && (
            <button
              onClick={() => navigate('/settings')}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            >
              <Settings size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
