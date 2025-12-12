import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();

  return (
    <div 
      key={location.pathname}
      className="page-enter-active animate-fade-in"
      style={{ animationDuration: '300ms' }}
    >
      {children}
    </div>
  );
};

export default PageTransition;

