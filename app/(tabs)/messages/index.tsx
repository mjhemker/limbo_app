import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function MessagesPage() {
  const router = useRouter();

  // Redirect to circles page (which has the DMs tab)
  useEffect(() => {
    router.replace('/(tabs)/circles');
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#F7DA21" />
    </View>
  );
}
