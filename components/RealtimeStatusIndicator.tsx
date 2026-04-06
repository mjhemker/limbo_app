import { View, Text } from 'react-native';
import { useRealtimeStatus } from '../hooks/useRealtimeSubscription';

/**
 * Component that shows the Realtime connection status
 * Useful for debugging and showing users when they're offline
 */
export function RealtimeStatusIndicator() {
  const status = useRealtimeStatus();

  // Only show indicator when not connected
  if (status === 'SUBSCRIBED') {
    return null;
  }

  const getMessage = () => {
    switch (status) {
      case 'CLOSED':
        return 'Connecting...';
      case 'CHANNEL_ERROR':
        return 'Connection error';
      default:
        return 'Offline';
    }
  };

  const getColor = () => {
    switch (status) {
      case 'CLOSED':
        return 'bg-yellow-100 border-yellow-300';
      case 'CHANNEL_ERROR':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <View className={`px-4 py-2 border-b ${getColor()}`}>
      <Text className="text-center text-sm font-medium text-gray-700">
        {getMessage()}
      </Text>
    </View>
  );
}
