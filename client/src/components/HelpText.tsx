import { HelpCircle } from 'lucide-react';
import Tooltip from './Tooltip';

interface HelpTextProps {
  text: string;
  className?: string;
}

const HelpText = ({ text, className = '' }: HelpTextProps) => {
  return (
    <Tooltip content={text} position="right">
      <HelpCircle 
        size={16} 
        className={`text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-help transition-colors ${className}`}
      />
    </Tooltip>
  );
};

export default HelpText;

