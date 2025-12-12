import { Link } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb = ({ items, className = '' }: BreadcrumbProps) => {
  return (
    <nav className={`flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-4 animate-slide-down ${className}`} aria-label="Breadcrumb">
      <Link 
        to="/dashboard" 
        className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        aria-label="داشبورد"
      >
        <Home size={16} />
        <span className="hidden sm:inline">داشبورد</span>
      </Link>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronLeft size={16} className="text-neutral-400" />
          {item.path && index < items.length - 1 ? (
            <Link 
              to={item.path} 
              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-neutral-900 dark:text-neutral-100 font-medium">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumb;

