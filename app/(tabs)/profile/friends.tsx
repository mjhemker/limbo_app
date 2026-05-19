import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Search, QrCode, MessageSquare, UserMinus, UserPlus, Check, Flame, Users2 } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import {
  useFriends,
  useFriendRequests,
  useSearchUsers,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
} from '../../../hooks/useFriends';
import { SMSInviteModal } from '../../../components/modals/SMSInviteModal';

// V2 Avatar colors
const AVATAR_COLORS = ['#F26E5E', '#6AAA64', '#8E73C9', '#4F8FE0', '#C28F2C'];

function getAvatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

type FilterOption = 'all' | 'circles' | 'streaks' | 'requests';

export default function FriendsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: friends, isLoading: friendsLoading } = useFriends(user?.id);
  const { data: friendRequests, isLoading: requestsLoading } = useFriendRequests(user?.id);
  const { data: searchResults, isLoading: searchLoading } = useSearchUsers(
    searchQuery,
    searchQuery.length > 0
  );

  const sendFriendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();

  // Filter friends based on selected filter and search
  const filteredFriends = useMemo(() => {
    if (!friends) return [];

    let result = [...friends];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f: any) =>
        f.friend?.display_name?.toLowerCase().includes(query) ||
        f.friend?.username?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    switch (activeFilter) {
      case 'circles':
        // Filter friends who share circles (would need circle membership data)
        return result.filter((f: any) => f.shared_circles > 0);
      case 'streaks':
        // Filter friends with active streaks
        return result.filter((f: any) => f.friend?.streak > 0);
      case 'all':
      default:
        return result;
    }
  }, [friends, searchQuery, activeFilter]);

  // Count for filter badges
  const friendsInCircles = friends?.filter((f: any) => f.shared_circles > 0)?.length || 0;
  const friendsWithStreaks = friends?.filter((f: any) => f.friend?.streak > 0)?.length || 0;
  const requestCount = friendRequests?.length || 0;

  const handleSendRequest = async (addresseeId: string) => {
    if (!user) return;
    try {
      await sendFriendRequest.mutateAsync({ requesterId: user.id, addresseeId });
      Alert.alert('Success', 'Friend request sent!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptRequest.mutateAsync(requestId);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await declineRequest.mutateAsync(requestId);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to decline request');
    }
  };

  const handleRemoveFriend = async (friendshipId: string, friendName: string) => {
    if (!user) return;
    Alert.alert('Remove Friend', `Remove ${friendName} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFriend.mutateAsync(friendshipId);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to remove friend');
          }
        },
      },
    ]);
  };

  const handleDM = (friendId: string) => {
    router.push(`/(tabs)/messages/${friendId}`);
  };

  const handleShowQR = () => {
    // Show QR code modal for adding friends
    router.push('/(tabs)/profile/qr');
  };

  const isLoading = friendsLoading || (activeFilter === 'requests' && requestsLoading);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* V2 Modal Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-rule">
        <TouchableOpacity
          onPress={handleShowQR}
          className="w-10 h-10 bg-sand rounded-full items-center justify-center"
        >
          <QrCode size={20} color="#111111" strokeWidth={2} />
        </TouchableOpacity>

        <Text className="text-[18px] font-extrabold text-ink" style={{ letterSpacing: -0.5 }}>
          Friends
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-sand rounded-full items-center justify-center"
        >
          <X size={20} color="#111111" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* V2 Search Bar */}
      <View className="px-5 py-3">
        <View className="flex-row items-center bg-sand rounded-full px-4 py-2.5">
          <Search size={18} color="#6B6760" strokeWidth={2} />
          <TextInput
            className="flex-1 ml-2.5 text-[15px] font-medium text-ink"
            placeholder="Search friends or @handle..."
            placeholderTextColor="#6B6760"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#6B6760" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* V2 Filter Pills */}
      <View className="px-5 pb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {/* All Filter */}
            <TouchableOpacity
              onPress={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-full ${
                activeFilter === 'all' ? 'bg-ink' : 'bg-sand'
              }`}
              activeOpacity={0.7}
            >
              <Text className={`text-[13px] font-bold ${
                activeFilter === 'all' ? 'text-white' : 'text-ink'
              }`}>
                All · {friends?.length || 0}
              </Text>
            </TouchableOpacity>

            {/* In Circles Filter */}
            <TouchableOpacity
              onPress={() => setActiveFilter('circles')}
              className={`flex-row items-center px-4 py-2 rounded-full ${
                activeFilter === 'circles' ? 'bg-ink' : 'bg-sand'
              }`}
              activeOpacity={0.7}
            >
              <Users2 size={14} color={activeFilter === 'circles' ? '#FFFFFF' : '#111111'} strokeWidth={2} />
              <Text className={`text-[13px] font-bold ml-1.5 ${
                activeFilter === 'circles' ? 'text-white' : 'text-ink'
              }`}>
                In circles · {friendsInCircles}
              </Text>
            </TouchableOpacity>

            {/* Streaks Filter */}
            <TouchableOpacity
              onPress={() => setActiveFilter('streaks')}
              className={`flex-row items-center px-4 py-2 rounded-full ${
                activeFilter === 'streaks' ? 'bg-ink' : 'bg-sand'
              }`}
              activeOpacity={0.7}
            >
              <Flame size={14} color={activeFilter === 'streaks' ? '#FFFFFF' : '#F26E5E'} strokeWidth={2} />
              <Text className={`text-[13px] font-bold ml-1.5 ${
                activeFilter === 'streaks' ? 'text-white' : 'text-ink'
              }`}>
                Streaks · {friendsWithStreaks}
              </Text>
            </TouchableOpacity>

            {/* Requests Filter */}
            <TouchableOpacity
              onPress={() => setActiveFilter('requests')}
              className={`flex-row items-center px-4 py-2 rounded-full ${
                activeFilter === 'requests' ? 'bg-ink' : 'bg-sand'
              }`}
              activeOpacity={0.7}
            >
              <Text className={`text-[13px] font-bold ${
                activeFilter === 'requests' ? 'text-white' : 'text-ink'
              }`}>
                Requests
              </Text>
              {requestCount > 0 && (
                <View className="bg-coral rounded-full min-w-[18px] h-[18px] px-1.5 ml-1.5 items-center justify-center">
                  <Text className="text-white text-[10px] font-bold">{requestCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#F7DA21" />
          </View>
        ) : activeFilter === 'requests' ? (
          /* Requests Tab */
          friendRequests && friendRequests.length > 0 ? (
            <View className="gap-3 pb-6">
              {friendRequests.map((request: any) => {
                const avatarColor = getAvatarColor(request.requester?.display_name);
                return (
                  <View key={request.id} className="bg-sand rounded-[18px] p-4">
                    <View className="flex-row items-center mb-3">
                      {request.requester?.avatar_url ? (
                        <Image
                          source={{ uri: request.requester.avatar_url }}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <View
                          className="w-12 h-12 rounded-full items-center justify-center"
                          style={{ backgroundColor: avatarColor }}
                        >
                          <Text className="text-white font-bold text-[16px]">
                            {request.requester?.display_name?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="ml-3 flex-1">
                        <Text className="font-bold text-ink text-[15px]" style={{ letterSpacing: -0.2 }}>
                          {request.requester?.display_name}
                        </Text>
                        <Text className="text-ink-soft font-medium text-[13px]">
                          @{request.requester?.username}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => handleAcceptRequest(request.id)}
                        className="flex-1 bg-ink rounded-full py-2.5 flex-row items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <Check size={16} color="white" strokeWidth={2.5} />
                        <Text className="text-white font-bold text-[13px] ml-1.5">Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeclineRequest(request.id)}
                        className="flex-1 bg-background border border-rule rounded-full py-2.5 flex-row items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <X size={16} color="#6B6760" strokeWidth={2.5} />
                        <Text className="text-ink-soft font-bold text-[13px] ml-1.5">Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="py-12 items-center">
              <View className="w-14 h-14 bg-sand rounded-full items-center justify-center mb-3">
                <UserPlus size={24} color="#6B6760" />
              </View>
              <Text className="text-ink font-bold text-[15px] mb-1">No pending requests</Text>
              <Text className="text-ink-soft font-medium text-[13px]">You're all caught up!</Text>
            </View>
          )
        ) : searchQuery.length > 0 && searchResults ? (
          /* Search Results */
          searchResults.length > 0 ? (
            <View className="gap-1 pb-6">
              {searchResults.map((result: any) => {
                const avatarColor = getAvatarColor(result.display_name);
                const isFriend = friends?.some((f: any) => f.friend?.id === result.id);

                return (
                  <TouchableOpacity
                    key={result.id}
                    onPress={() => router.push(`/(tabs)/profile/${result.id}`)}
                    className="flex-row items-center py-3 border-b border-rule"
                    activeOpacity={0.6}
                  >
                    {result.avatar_url ? (
                      <Image
                        source={{ uri: result.avatar_url }}
                        className="w-11 h-11 rounded-full"
                      />
                    ) : (
                      <View
                        className="w-11 h-11 rounded-full items-center justify-center"
                        style={{ backgroundColor: avatarColor }}
                      >
                        <Text className="text-white font-bold text-[14px]">
                          {result.display_name?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="ml-3 flex-1">
                      <Text className="font-bold text-ink text-[15px]" style={{ letterSpacing: -0.2 }}>
                        {result.display_name}
                      </Text>
                      <Text className="text-ink-soft font-medium text-[13px]">
                        @{result.username}
                      </Text>
                    </View>
                    {!isFriend && result.id !== user?.id && (
                      <TouchableOpacity
                        onPress={() => handleSendRequest(result.id)}
                        className="bg-ink rounded-full px-4 py-2"
                        activeOpacity={0.7}
                      >
                        <Text className="text-white font-bold text-[12px]">Add</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="py-12 items-center">
              <View className="w-14 h-14 bg-sand rounded-full items-center justify-center mb-3">
                <Search size={24} color="#6B6760" />
              </View>
              <Text className="text-ink font-bold text-[15px] mb-1">No users found</Text>
              <Text className="text-ink-soft font-medium text-[13px]">Try a different search</Text>
            </View>
          )
        ) : filteredFriends.length > 0 ? (
          /* Friends List */
          <View className="gap-1 pb-6">
            {filteredFriends.map((friend: any) => {
              const avatarColor = getAvatarColor(friend.friend?.display_name);
              const hasStreak = friend.friend?.streak > 0;

              return (
                <View
                  key={friend.friendshipId}
                  className="flex-row items-center py-3 border-b border-rule"
                >
                  <TouchableOpacity
                    onPress={() => router.push(`/(tabs)/profile/${friend.friend.id}`)}
                    className="flex-row items-center flex-1"
                    activeOpacity={0.6}
                  >
                    {friend.friend?.avatar_url ? (
                      <Image
                        source={{ uri: friend.friend.avatar_url }}
                        className="w-11 h-11 rounded-full"
                      />
                    ) : (
                      <View
                        className="w-11 h-11 rounded-full items-center justify-center"
                        style={{ backgroundColor: avatarColor }}
                      >
                        <Text className="text-white font-bold text-[14px]">
                          {friend.friend?.display_name?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center">
                        <Text className="font-bold text-ink text-[15px]" style={{ letterSpacing: -0.2 }}>
                          {friend.friend?.display_name}
                        </Text>
                        {hasStreak && (
                          <View className="flex-row items-center ml-2">
                            <Text className="text-[11px]">🔥</Text>
                            <Text className="text-ink-soft font-bold text-[11px] ml-0.5">
                              {friend.friend?.streak}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-ink-soft font-medium text-[13px]">
                        @{friend.friend?.username}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Action Buttons */}
                  <View className="flex-row gap-2 ml-2">
                    <TouchableOpacity
                      onPress={() => handleDM(friend.friend.id)}
                      className="bg-sand rounded-full px-3.5 py-2"
                      activeOpacity={0.7}
                    >
                      <Text className="text-ink font-bold text-[12px]">DM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveFriend(friend.friendshipId, friend.friend?.display_name)}
                      className="bg-sand rounded-full px-3.5 py-2"
                      activeOpacity={0.7}
                    >
                      <Text className="text-ink-soft font-bold text-[12px]">Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* Empty State */
          <View className="py-12 items-center">
            <View className="w-14 h-14 bg-sand rounded-full items-center justify-center mb-3">
              <Users2 size={24} color="#6B6760" />
            </View>
            <Text className="text-ink font-bold text-[15px] mb-1">No friends yet</Text>
            <Text className="text-ink-soft font-medium text-[13px] text-center mb-4">
              Search for friends or scan their QR code
            </Text>
            <TouchableOpacity
              onPress={() => setShowInviteModal(true)}
              className="bg-ink rounded-full px-5 py-2.5"
              activeOpacity={0.7}
            >
              <Text className="text-white font-bold text-[13px]">Invite Friends</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Invite Friends CTA - only show when not searching and has friends */}
        {!searchQuery && filteredFriends.length > 0 && activeFilter !== 'requests' && (
          <View className="py-6 items-center border-t border-rule mt-3">
            <Text className="text-ink-soft font-medium text-[13px] mb-3">
              Invite more friends to limbo
            </Text>
            <TouchableOpacity
              onPress={() => setShowInviteModal(true)}
              className="bg-ink rounded-full px-5 py-2.5 flex-row items-center"
              activeOpacity={0.7}
            >
              <UserPlus size={16} color="white" strokeWidth={2} />
              <Text className="text-white font-bold text-[13px] ml-2">Invite via SMS</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* SMS Invite Modal */}
      <SMSInviteModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        userId={user?.id || ''}
        displayName={user?.display_name || ''}
      />
    </SafeAreaView>
  );
}
