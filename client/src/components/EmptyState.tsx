import { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = '' 
}: EmptyStateProps) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 animate-fade-in ${className}`}>
      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 animate-scale-in">
        <Icon size={40} className="text-neutral-400 dark:text-neutral-500" />
      </div>
      <h3 className="heading-3 text-center mb-2">{title}</h3>
      {description && (
        <p className="body-regular text-center mb-6 max-w-md">{description}</p>
      )}
      {onAction && actionLabel && (
        <button 
          onClick={onAction}
          className="btn btn-primary flex items-center gap-2 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <Plus size={18} />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

