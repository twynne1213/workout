import { cn } from '@/shared/utils/cn';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface-elevated rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm mx-4 mb-0 sm:mb-0 shadow-xl">
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-text-secondary mb-6">{description}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-surface-secondary text-text-primary hover:opacity-80 transition-opacity"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-80',
              variant === 'danger' ? 'bg-danger' : 'bg-primary'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
