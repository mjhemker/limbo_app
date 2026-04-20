import { View, Text } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

interface AudioRecorderProps {
  onRecordingComplete: (uri: string) => void;
  onRecordingCancelled?: () => void;
}

// Audio recording is temporarily disabled due to compatibility issues
// expo-audio causes crashes on iPad devices
export default function AudioRecorder(_props: AudioRecorderProps) {
  return (
    <View className="bg-gray-100 rounded-lg p-4">
      <View className="flex-row items-center justify-center py-3">
        <AlertCircle size={24} color="#9ca3af" />
        <Text className="ml-3 text-gray-500 font-medium text-center">
          Audio recording is not available
        </Text>
      </View>
    </View>
  );
}
