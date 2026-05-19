import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark' | 'system';
type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  setTheme: (theme: Theme) => void;
  colors: typeof lightColors;
}

const lightColors = {
  // V2 NYT-Games-inspired palette
  background: '#FBFAF7',    // Warm off-white
  foreground: '#111111',    // Ink
  card: '#FFFFFF',          // Pure white cards
  cardBorder: 'rgba(0,0,0,0.06)', // Rule
  primary: '#F7DA21',       // Yellow
  primaryForeground: '#111111',
  secondary: '#6B6760',     // Ink-soft
  secondaryForeground: '#ffffff',
  muted: '#F2EBDD',         // Sand
  mutedForeground: '#6B6760',
  accent: '#8E73C9',        // Purple
  accentForeground: '#ffffff',
  destructive: '#F26E5E',   // Coral
  destructiveForeground: '#ffffff',
  border: 'rgba(0,0,0,0.06)',
  input: '#EDECEA',
  ring: '#F7DA21',
  // Semantic colors
  success: '#6AAA64',       // Green
  successPale: '#E8F1E0',
  warning: '#F2A93B',       // Orange
  danger: '#F26E5E',        // Coral
  info: '#4F8FE0',          // Blue
  purple: '#8E73C9',
  coral: '#F26E5E',
  green: '#6AAA64',
  yellow: '#F7DA21',
  yellowPale: '#FBE893',
  sand: '#F2EBDD',
  teal: '#1A6B5E',
  gold: '#C28F2C',
  text: {
    primary: '#111111',     // Ink
    secondary: '#6B6760',   // Ink-soft
    tertiary: '#9ca3af',
  },
};

const darkColors = {
  // V2 dark mode palette
  background: '#0f172a',
  foreground: '#f1f5f9',
  card: '#1e293b',
  cardBorder: '#334155',
  primary: '#F7DA21',       // Yellow (same as light)
  primaryForeground: '#111111',
  secondary: '#94a3b8',
  secondaryForeground: '#0f172a',
  muted: '#1e293b',
  mutedForeground: '#94a3b8',
  accent: '#8E73C9',        // Purple
  accentForeground: '#ffffff',
  destructive: '#F26E5E',   // Coral
  destructiveForeground: '#ffffff',
  border: '#334155',
  input: '#334155',
  ring: '#F7DA21',
  // Semantic colors
  success: '#6AAA64',
  successPale: '#1a3d1a',
  warning: '#F2A93B',
  danger: '#F26E5E',
  info: '#4F8FE0',
  purple: '#8E73C9',
  coral: '#F26E5E',
  green: '#6AAA64',
  yellow: '#F7DA21',
  yellowPale: '#4a4520',
  sand: '#2a2820',
  teal: '#1A6B5E',
  gold: '#C28F2C',
  text: {
    primary: '#f1f5f9',
    secondary: '#cbd5e1',
    tertiary: '#94a3b8',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@limbo_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    systemColorScheme || 'light'
  );

  // Load saved theme preference
  useEffect(() => {
    loadTheme();
  }, []);

  // Update color scheme when theme or system preference changes
  useEffect(() => {
    if (theme === 'system') {
      setColorScheme(systemColorScheme || 'light');
    } else {
      setColorScheme(theme);
    }
  }, [theme, systemColorScheme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setThemeState(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = colorScheme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
