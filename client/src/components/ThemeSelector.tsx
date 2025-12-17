import { useState, useRef, useEffect } from 'react';
import { Palette, Moon, Sun, Check } from 'lucide-react';
import { useTheme, colorThemes } from '../contexts/ThemeContext';

// Helper to get primary color from theme
const getPrimaryColor = (theme: keyof typeof colorThemes) => {
  return colorThemes[theme].shades[600];
};

const ThemeSelector = () => {
  const { theme, colorTheme, setTheme, setColorTheme, toggleTheme } = useTheme();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle - Hidden */}
        <button
          onClick={toggleTheme}
          className="hidden p-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label={theme === 'light' ? 'فعال‌سازی حالت تاریک' : 'فعال‌سازی حالت روشن'}
          title={theme === 'light' ? 'حالت تاریک' : 'حالت روشن'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Color Theme Selector */}
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors relative"
          aria-label="انتخاب رنگ تم"
          title="انتخاب رنگ"
        >
          <Palette size={20} />
          <span 
            className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white dark:border-neutral-800"
            style={{ backgroundColor: getPrimaryColor(colorTheme) }}
          />
        </button>
      </div>

      {/* Color Picker Dropdown */}
      {showColorPicker && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-neutral-800 rounded-xl shadow-large border border-neutral-200 dark:border-neutral-700 p-4 z-50 animate-scale-in">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            انتخاب رنگ تم
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Object.entries(colorThemes).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  setColorTheme(key as any);
                  setShowColorPicker(false);
                }}
                className={`relative w-12 h-12 rounded-lg transition-all duration-200 hover:scale-110 ${
                  colorTheme === key ? 'ring-2 ring-offset-2 ring-primary-600 dark:ring-primary-400' : ''
                }`}
                style={{ backgroundColor: value.shades[600] }}
                aria-label={value.name}
                title={value.name}
              >
                {colorTheme === key && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check size={20} className="text-white drop-shadow-lg" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
              رنگ فعلی: <span className="font-medium" style={{ color: getPrimaryColor(colorTheme) }}>{colorThemes[colorTheme].name}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;

