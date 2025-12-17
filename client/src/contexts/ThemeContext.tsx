import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ColorTheme = 'indigo' | 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'teal' | 'pink' | 'ocean-blue' | 'fresh-green' | 'fiery-ocean';

interface ThemeContextType {
  theme: Theme;
  colorTheme: ColorTheme;
  setTheme: (theme: Theme) => void;
  setColorTheme: (colorTheme: ColorTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// رنگ‌های کامل برای هر تم (تمام shades)
const colorThemes: Record<ColorTheme, { 
  name: string;
  shades: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}> = {
  indigo: {
    name: 'اقیانوس آرام', // Ocean Blue Serenity
    shades: {
      50: '#f0f9ff', // سفید-آبی بسیار روشن
      100: '#e0f2fe', // آبی بسیار روشن
      200: '#bae6fd', // آبی روشن
      300: '#7dd3fc', // آبی متوسط-روشن
      400: '#38bdf8', // آبی متوسط
      500: '#0ea5e9', // آبی اصلی (از پالت)
      600: '#0284c7', // آبی تیره
      700: '#0369a1', // آبی تیره‌تر
      800: '#075985', // آبی خیلی تیره
      900: '#0c4a6e', // آبی خیلی خیلی تیره
    },
  },
  blue: {
    name: 'غروب اقیانوس', // Ocean Sunset
    shades: {
      50: '#fff7ed', // کرم روشن
      100: '#ffedd5', // بژ روشن
      200: '#fed7aa', // بژ
      300: '#fdba74', // نارنجی روشن
      400: '#fb923c', // نارنجی
      500: '#f97316', // نارنجی اصلی (از پالت)
      600: '#ea580c', // نارنجی تیره
      700: '#c2410c', // قرمز-نارنجی تیره
      800: '#9a3412', // قرمز تیره
      900: '#7c2d12', // قرمز خیلی تیره
    },
  },
  green: {
    name: 'سبز تازه', // Fresh Greens
    shades: {
      50: '#f0fdf4', // سبز بسیار روشن
      100: '#dcfce7', // سبز روشن
      200: '#bbf7d0', // سبز متوسط-روشن
      300: '#86efac', // سبز متوسط
      400: '#4ade80', // سبز
      500: '#22c55e', // سبز اصلی (از پالت)
      600: '#16a34a', // سبز تیره
      700: '#15803d', // سبز تیره‌تر
      800: '#166534', // سبز خیلی تیره
      900: '#14532d', // سبز خیلی خیلی تیره
    },
  },
  purple: {
    name: 'بنفش',
    shades: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    },
  },
  red: {
    name: 'قرمز',
    shades: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
  },
  orange: {
    name: 'نارنجی',
    shades: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
  },
  teal: {
    name: 'فیروزه‌ای',
    shades: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
  },
  pink: {
    name: 'صورتی',
    shades: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d',
      800: '#9f1239',
      900: '#831843',
    },
  },
  'ocean-blue': {
    name: 'آبی آرام اقیانوس', // Ocean Blue Serenity
    shades: {
      50: '#e8f4fd',
      100: '#d1e9fb',
      200: '#a3d3f7',
      300: '#75bdf3',
      400: '#47a7ef',
      500: '#1e90eb', // آبی اصلی
      600: '#1873bc',
      700: '#12568d',
      800: '#0c395e',
      900: '#061c2f',
    },
  },
  'fresh-green': {
    name: 'سبز تازه طبیعت', // Fresh Greens
    shades: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // سبز اصلی
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
  },
  'fiery-ocean': {
    name: 'اقیانوس آتشین', // Fiery Ocean - ترکیب قرمز و آبی
    shades: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // قرمز اصلی
      600: '#dc2626', // قرمز تیره
      700: '#b91c1c', // قرمز خیلی تیره
      800: '#991b1b',
      900: '#7f1d1d',
    },
  },
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('colorTheme');
    return (saved as ColorTheme) || 'indigo';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme - Tailwind uses 'dark' class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Apply color theme - set all primary color shades as CSS variables
    const themeColors = colorThemes[colorTheme];
    Object.entries(themeColors.shades).forEach(([shade, color]) => {
      root.style.setProperty(`--color-primary-${shade}`, color);
    });
    
    // Also set a general primary color variable
    root.style.setProperty('--color-primary', themeColors.shades[600]);
    
    // Update meta theme-color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#111827' : '#ffffff');
  }, [theme, colorTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setColorTheme = (newColorTheme: ColorTheme) => {
    setColorThemeState(newColorTheme);
    localStorage.setItem('colorTheme', newColorTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, colorTheme, setTheme, setColorTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { colorThemes };
