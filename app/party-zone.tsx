import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X } from 'phosphor-react-native';

export default function PartyZone() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <Text className="text-2xl font-extrabold text-white" style={{ letterSpacing: -1 }}>
          Party Zone
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
        >
          <X size={20} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-white/60 text-center font-medium">
          Party zone content goes here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
