import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command, Search, Plus, X } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
  ctrl?: boolean;
  shift?: boolean;
}

export const useKeyboardShortcuts = (shortcuts: Shortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcut = shortcuts.find((s) => {
        const keyMatch = s.key.toLowerCase() === e.key.toLowerCase();
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
        return keyMatch && ctrlMatch && shiftMatch;
      });

      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

export const KeyboardShortcutsHelp = () => {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  const shortcuts = [
    { key: 'K', ctrl: true, description: 'جستجو', icon: Search },
    { key: 'N', ctrl: true, description: 'ایجاد جدید', icon: Plus },
    { key: '/', description: 'نمایش کمک', icon: Command },
    { key: 'Escape', description: 'بستن', icon: X },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      }
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp]);

  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 max-w-2xl w-full animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
          <h3 className="heading-3 text-neutral-900 dark:text-neutral-100">میانبرهای صفحه‌کلید</h3>
          <button
            onClick={() => setShowHelp(false)}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcuts.map((shortcut, index) => {
              const Icon = shortcut.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <Icon size={20} className="text-neutral-400" />
                  </div>
                  <div className="flex-1">
                    <p className="body-regular text-neutral-700 dark:text-neutral-300">
                      {shortcut.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {shortcut.ctrl && (
                      <kbd className="px-2 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded">
                        Ctrl
                      </kbd>
                    )}
                    <kbd className="px-2 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded">
                      {shortcut.key}
                    </kbd>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

