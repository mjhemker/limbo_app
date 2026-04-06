import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  SlideInDown,
  SlideOutUp,
} from 'react-native-reanimated';
import { WifiOff } from 'lucide-react-native';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected || !state.isInternetReachable);
    });

    // Get initial state
    NetInfo.fetch().then((state) => {
      setIsOffline(!state.isConnected || !state.isInternetReachable);
    });

    return unsubscribe;
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
      <WifiOff size={18} color="white" />
      <Text className="text-white font-semibold ml-2">
        No internet connection
      </Text>
    </Animated.View>
  );
}
