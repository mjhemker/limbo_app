import { View, Text, Dimensions } from 'react-native';
import { WarningCircle } from 'phosphor-react-native';

interface VideoPlayerProps {
  uri: string;
  width?: number;
  height?: number;
  contentFit?: 'contain' | 'cover' | 'fill';
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Video playback is temporarily disabled due to compatibility issues
// expo-video causes crashes on iPad devices
export default function VideoPlayer({
  width = SCREEN_WIDTH,
  height = 300,
  className = '',
}: VideoPlayerProps) {
  return (
    <View
      className={`relative ${className} bg-gray-100 items-center justify-center`}
      style={{ width, height }}
    >
      <WarningCircle weight="bold" size={32} color="#9ca3af" />
      <Text className="text-gray-500 mt-2">Video playback unavailable</Text>
    </View>
  );
}
