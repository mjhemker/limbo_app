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
  background: '#ffffff',
  foreground: '#000000',
  card: '#f3f4f6',
  cardBorder: '#e5e7eb',
  primary: '#FFBF00',
  primaryForeground: '#ffffff',
  secondary: '#6b7280',
  secondaryForeground: '#ffffff',
  muted: '#f3f4f6',
  mutedForeground: '#6b7280',
  accent: '#dbeafe',
  accentForeground: '#1e40af',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  border: '#e5e7eb',
  input: '#e5e7eb',
  ring: '#FFBF00',
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
  },
};

const darkColors = {
  background: '#0f172a',
  foreground: '#f1f5f9',
  card: '#1e293b',
  cardBorder: '#334155',
  primary: '#FFBF00',
  primaryForeground: '#ffffff',
  secondary: '#94a3b8',
  secondaryForeground: '#0f172a',
  muted: '#1e293b',
  mutedForeground: '#94a3b8',
  accent: '#1e3a5f',
  accentForeground: '#60a5fa',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  border: '#334155',
  input: '#334155',
  ring: '#FFBF00',
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
