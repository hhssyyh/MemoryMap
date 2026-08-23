import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { themes, type ThemeColors, type ThemeName } from '../constants/theme';

type ThemeContextValue = {
  colors: ThemeColors;
  themeName: ThemeName;
  setThemeName: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('parisDusk');

  const value = useMemo(
    () => ({ colors: themes[themeName], setThemeName, themeName }),
    [themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useAppTheme must be used inside ThemeProvider');
  }

  return value;
}
