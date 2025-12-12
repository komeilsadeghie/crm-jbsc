interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton = ({ 
  className = '', 
  variant = 'rectangular', 
  width, 
  height,
  lines 
}: SkeletonProps) => {
  const baseClasses = 'animate-shimmer bg-neutral-200 dark:bg-neutral-700 rounded';
  
  if (variant === 'text' && lines) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${className}`}
            style={{
              width: width || '100%',
              height: height || '1rem',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    );
  }

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{
        width: width || '100%',
        height: height || variant === 'circular' ? width || '40px' : '1rem',
      }}
    />
  );
};

// Table Skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => {
  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height="2.5rem" className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              variant="rectangular" 
              height="3rem" 
              className="flex-1"
              style={{ animationDelay: `${(rowIndex * columns + colIndex) * 0.05}s` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Card Skeleton
export const CardSkeleton = () => {
  return (
    <div className="card animate-fade-in">
      <Skeleton variant="rectangular" height="1.5rem" width="60%" className="mb-4" />
      <Skeleton variant="text" lines={3} />
      <div className="mt-4 flex gap-2">
        <Skeleton variant="rectangular" height="2rem" width="100px" />
        <Skeleton variant="rectangular" height="2rem" width="100px" />
      </div>
    </div>
  );
};

// List Skeleton
export const ListSkeleton = ({ items = 5 }: { items?: number }) => {
  return (
    <div className="space-y-3 animate-fade-in">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton variant="circular" width="48px" height="48px" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="rectangular" height="1rem" width="40%" />
            <Skeleton variant="rectangular" height="0.875rem" width="60%" />
          </div>
          <Skeleton variant="rectangular" height="2rem" width="80px" />
        </div>
      ))}
    </div>
  );
};

export default Skeleton;

