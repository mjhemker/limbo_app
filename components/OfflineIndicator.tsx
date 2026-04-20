import { useState, useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated, {
  SlideInDown,
  SlideOutUp,
} from 'react-native-reanimated';
import { WifiSlash } from 'phosphor-react-native';

// Lazy load NetInfo to prevent potential crashes
let NetInfo: any;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  console.warn('NetInfo not available:', e);
}

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!NetInfo) return;

    let unsubscribe: (() => void) | undefined;

    try {
      // Subscribe to network state changes
      unsubscribe = NetInfo.addEventListener((state: any) => {
        setIsOffline(!state.isConnected || !state.isInternetReachable);
      });

      // Get initial state
      NetInfo.fetch().then((state: any) => {
        setIsOffline(!state.isConnected || !state.isInternetReachable);
      }).catch(() => {
        // Ignore fetch errors
      });
    } catch (e) {
      console.warn('NetInfo initialization error:', e);
    }

    return () => {
      try {
        unsubscribe?.();
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(15)}
      exiting={SlideOutUp.duration(300)}
      className="absolute top-0 left-0 right-0 z-50 bg-red-500 px-4 py-3 flex-row items-center justify-center"
      style={{
        paddingTop: 48, // Account for status bar
      }}
    >
      <WifiSlash weight="bold" size={18} color="white" />
      <Text className="text-white font-semibold ml-2">
        No internet connection
      </Text>
    </Animated.View>
  );
}
