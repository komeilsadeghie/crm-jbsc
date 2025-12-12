import { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

const Tooltip = ({ 
  content, 
  children, 
  position = 'top',
  delay = 300,
  className = '' 
}: TooltipProps) => {
  const [show, setShow] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setShow(true);
    }, delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setShow(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-t-neutral-900 dark:border-t-neutral-700',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-neutral-900 dark:border-b-neutral-700',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-l-neutral-900 dark:border-l-neutral-700',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-r-neutral-900 dark:border-r-neutral-700',
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {show && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 px-2 py-1 text-xs font-medium text-white bg-neutral-900 dark:bg-neutral-700 rounded-lg shadow-lg whitespace-nowrap animate-fade-in ${positionClasses[position]}`}
          role="tooltip"
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;

