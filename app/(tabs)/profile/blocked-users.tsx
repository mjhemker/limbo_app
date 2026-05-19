import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Ban } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { blocksService } from '../../../services/supabase/blocks';
import { toast } from '../../../utils/toast';
import * as haptics from '../../../utils/haptics';

// V2 Avatar colors
const AVATAR_COLORS = ['#F26E5E', '#6AAA64', '#8E73C9', '#4F8FE0', '#C28F2C'];

function getAvatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  blocked: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  };
}

export default function BlockedUsersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const loadBlockedUsers = async () => {
    if (!user) return;

    try {
      const data = await blocksService.getBlockedByMe(user.id);
      setBlockedUsers(data);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedUsers();
  }, [user]);

  const handleUnblock = (blocked: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${blocked.blocked?.display_name}? They will be able to see your profile and send you messages again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            if (!user) return;

            setUnblocking(blocked.blocked_id);
            try {
              haptics.mediumImpact();
              await blocksService.unblockUser(user.id, blocked.blocked_id);
              setBlockedUsers((prev) =>
                prev.filter((b) => b.blocked_id !== blocked.blocked_id)
              );
              toast.success(`${blocked.blocked?.display_name} has been unblocked`);
            } catch (error: any) {
              haptics.error();
              Alert.alert('Error', error.message || 'Failed to unblock user');
            } finally {
              setUnblocking(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* V2 Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-rule">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ChevronLeft size={24} color="#111111" strokeWidth={2} />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-extrabold text-ink ml-2" style={{ letterSpacing: -0.5 }}>
          Blocked Users
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F7DA21" />
        </View>
      ) : blockedUsers.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 bg-sand rounded-full items-center justify-center mb-4">
            <Ban size={28} color="#6B6760" />
          </View>
          <Text className="text-lg font-extrabold text-ink text-center mb-1" style={{ letterSpacing: -0.5 }}>
            No Blocked Users
          </Text>
          <Text className="text-ink-soft font-medium text-center text-[14px]">
            Users you block will appear here.{'\n'}You can unblock them at any time.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="bg-sand border border-rule rounded-[18px] overflow-hidden">
            {blockedUsers.map((blocked, index) => {
              const avatarColor = getAvatarColor(blocked.blocked?.display_name);
              const isLastItem = index === blockedUsers.length - 1;

              return (
                <View
                  key={blocked.id}
                  className={`flex-row items-center p-4 ${!isLastItem ? 'border-b border-rule' : ''}`}
                >
                  <TouchableOpacity
                    onPress={() => router.push(`/(tabs)/profile/${blocked.blocked_id}`)}
                    className="flex-row items-center flex-1"
                    activeOpacity={0.6}
                  >
                    {blocked.blocked?.avatar_url ? (
                      <Image
                        source={{ uri: blocked.blocked.avatar_url }}
                        className="w-11 h-11 rounded-full"
                      />
                    ) : (
                      <View
                        className="w-11 h-11 rounded-full items-center justify-center"
                        style={{ backgroundColor: avatarColor }}
                      >
                        <Text className="text-white font-bold text-[14px]">
                          {blocked.blocked?.display_name?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="ml-3 flex-1">
                      <Text className="font-bold text-ink text-[14px]" style={{ letterSpacing: -0.2 }}>
                        {blocked.blocked?.display_name}
                      </Text>
                      <Text className="text-ink-soft font-medium text-[12px]">
                        @{blocked.blocked?.username}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleUnblock(blocked)}
                    disabled={unblocking === blocked.blocked_id}
                    className="bg-background border border-rule rounded-full px-4 py-2 ml-2"
                    activeOpacity={0.7}
                  >
                    {unblocking === blocked.blocked_id ? (
                      <ActivityIndicator size="small" color="#F7DA21" />
                    ) : (
                      <Text className="font-bold text-ink text-[12px]">Unblock</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <Text className="text-[12px] text-ink-soft font-medium text-center mt-4 px-4">
            Blocked users cannot see your profile, responses, or send you messages.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
