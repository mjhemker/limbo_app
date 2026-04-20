import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts as useBricolage,
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Lato_400Regular,
  Lato_700Bold,
  Lato_900Black,
} from '@expo-google-fonts/lato';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import '../global.css';

// Apply Lato as the default font for every <Text> in the app.
const TextAny = Text as any;
TextAny.defaultProps = TextAny.defaultProps || {};
const existingStyle = TextAny.defaultProps.style;
TextAny.defaultProps.style = [{ fontFamily: 'Lato_400Regular' }, existingStyle];

// Lazy load optional components
let Toast: any = null;
let OfflineIndicator: any = null;

try {
  Toast = require('react-native-toast-message').default;
} catch (e) {
  console.warn('Toast not available:', e);
}

try {
  OfflineIndicator = require('../components/OfflineIndicator').OfflineIndicator;
} catch (e) {
  console.warn('OfflineIndicator not available:', e);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="compose"
        options={{
          presentation: 'card',
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen
        name="invite"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded] = useBricolage({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    Lato_400Regular,
    Lato_700Bold,
    Lato_900Black,
  });

  useEffect(() => {
    // Small delay to ensure all native modules are ready
    const timer = setTimeout(() => {
      try {
        setIsReady(true);
      } catch (e: any) {
        setError(e?.message || 'Failed to initialize app');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <Text style={{ color: '#ef4444', fontSize: 16 }}>Error: {error}</Text>
      </View>
    );
  }

  if (!isReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#FFBF00" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
          {Toast && <Toast />}
          {OfflineIndicator && <OfflineIndicator />}
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
