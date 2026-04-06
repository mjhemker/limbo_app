import { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPlus } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useSendFriendRequest } from '../hooks/useFriends';

const PENDING_INVITE_KEY = 'pending_invite';

export default function InvitePage() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from: string }>();
  const { user } = useAuth();
  const { data: inviterProfile, isLoading } = useProfile(from);
  const sendFriendRequest = useSendFriendRequest();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const handleInvite = async () => {
      if (!from) {
        router.replace('/(tabs)/feed');
        return;
      }

      // If user is logged in, automatically send friend request
      if (user?.id) {
        if (user.id === from) {
          // Can't send friend request to yourself
          router.replace('/(tabs)/feed');
          return;
        }

        setProcessing(true);
        try {
          await sendFriendRequest.mutateAsync({
            senderId: user.id,
            receiverId: from,
          });
          // Navigate to feed after sending request
          router.replace('/(tabs)/feed');
        } catch (error) {
          console.error('Failed to send friend request:', error);
          router.replace('/(tabs)/feed');
        } finally {
          setProcessing(false);
        }
      } else {
        // Store pending invite for after login/signup
        await AsyncStorage.setItem(PENDING_INVITE_KEY, from);
      }
    };

    handleInvite();
  }, [from, user?.id]);

  if (isLoading || processing) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FFBF00" />
        <Text className="text-gray-600 mt-4">
          {user ? 'Sending friend request...' : 'Loading...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (!inviterProfile) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-xl font-semibold text-gray-900 text-center mb-2">
          Invite not found
        </Text>
        <Text className="text-gray-600 text-center mb-6">
          This invite link may be invalid or expired
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/feed')}
          className="bg-black rounded-lg px-6 py-3"
        >
          <Text className="text-white font-semibold">Go to Feed</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // If not logged in, show invite preview
  if (!user) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-white px-6">
        <View className="items-center mb-8">
          {inviterProfile.avatar_url ? (
            <Image
              source={{ uri: inviterProfile.avatar_url }}
              className="w-24 h-24 rounded-full bg-gray-300 mb-4"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-gray-300 items-center justify-center mb-4">
              <Text className="text-gray-600 text-3xl font-semibold">
                {inviterProfile.display_name?.[0]?.toUpperCase()}
              </Text>
            </View>
          )}
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            {inviterProfile.display_name}
          </Text>
          <Text className="text-gray-600 text-center mb-4">
            @{inviterProfile.username}
          </Text>
          <View className="flex-row items-center bg-primary-50 rounded-lg px-4 py-2">
            <UserPlus size={20} color="#FFBF00" />
            <Text className="text-primary-500 font-medium ml-2">
              invited you to Limbo
            </Text>
          </View>
        </View>

        <Text className="text-gray-700 text-center mb-8">
          Join Limbo to connect with {inviterProfile.display_name} and share daily
          prompts with your friends
        </Text>

        <View className="w-full gap-3">
          <TouchableOpacity
            onPress={() => router.push('/auth/signup')}
            className="bg-black rounded-lg py-4"
          >
            <Text className="text-white text-center font-semibold text-base">
              Sign Up
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/auth/login')}
            className="bg-gray-100 rounded-lg py-4"
          >
            <Text className="text-gray-900 text-center font-semibold text-base">
              Log In
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback (shouldn't reach here due to useEffect)
  return null;
}

// Helper function to check and process pending invites after login/signup
export async function processPendingInvite(userId: string) {
  try {
    const pendingInvite = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    if (pendingInvite && pendingInvite !== userId) {
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
      return pendingInvite;
    }
  } catch (error) {
    console.error('Failed to process pending invite:', error);
  }
  return null;
}
