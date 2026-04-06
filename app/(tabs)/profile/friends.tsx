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
import { ArrowLeft, Search, UserPlus, Check, X, Clock, SortAsc, Users2 } from 'lucide-react-native';
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

type FriendSortOption = 'all' | 'recent' | 'alphabetical';

export default function FriendsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'find'>('friends');
  const [friendSortOption, setFriendSortOption] = useState<FriendSortOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: friends, isLoading: friendsLoading } = useFriends(user?.id);
  const { data: friendRequests, isLoading: requestsLoading } = useFriendRequests(user?.id);
  const { data: searchResults, isLoading: searchLoading } = useSearchUsers(
    searchQuery,
    activeTab === 'find'
  );

  const sendFriendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();

  // Sort friends based on selected option
  const sortedFriends = useMemo(() => {
    if (!friends) return [];

    const friendsList = [...friends];

    switch (friendSortOption) {
      case 'recent':
        // Sort by friendship created date (most recent first)
        return friendsList.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
      case 'alphabetical':
        // Sort by display name A-Z
        return friendsList.sort((a, b) => {
          const nameA = (a.friend?.display_name || '').toLowerCase();
          const nameB = (b.friend?.display_name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      case 'all':
      default:
        // Keep original order
        return friendsList;
    }
  }, [friends, friendSortOption]);

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

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!user) return;
    Alert.alert('Remove Friend', 'Are you sure you want to remove this friend?', [
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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center mb-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-semibold text-gray-900 ml-3">
            Friends
          </Text>
        </View>

        {/* Search (for find tab) */}
        {activeTab === 'find' && (
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 text-base"
              placeholder="Search by username or email"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>
        )}
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-200">
        <TouchableOpacity
          onPress={() => setActiveTab('friends')}
          className={`flex-1 py-3 border-b-2 ${
            activeTab === 'friends' ? 'border-black' : 'border-transparent'
          }`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'friends' ? 'text-black' : 'text-gray-500'
            }`}
          >
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('requests')}
          className={`flex-1 py-3 border-b-2 ${
            activeTab === 'requests' ? 'border-black' : 'border-transparent'
          }`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'requests' ? 'text-black' : 'text-gray-500'
            }`}
          >
            Requests
            {friendRequests && friendRequests.length > 0 && (
              <Text className="text-black"> ({friendRequests.length})</Text>
            )}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('find')}
          className={`flex-1 py-3 border-b-2 ${
            activeTab === 'find' ? 'border-black' : 'border-transparent'
          }`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'find' ? 'text-black' : 'text-gray-500'
            }`}
          >
            Find
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView className="flex-1">
        {activeTab === 'friends' && (
          <View className="p-4">
            {/* Sort Filter Chips */}
            {friends && friends.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4 -mx-4 px-4"
              >
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setFriendSortOption('all')}
                    className={`flex-row items-center px-4 py-2 rounded-full ${
                      friendSortOption === 'all'
                        ? 'bg-black'
                        : 'bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <Users2
                      size={16}
                      color={friendSortOption === 'all' ? 'white' : '#6b7280'}
                    />
                    <Text
                      className={`ml-1.5 font-medium ${
                        friendSortOption === 'all' ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setFriendSortOption('recent')}
                    className={`flex-row items-center px-4 py-2 rounded-full ${
                      friendSortOption === 'recent'
                        ? 'bg-black'
                        : 'bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <Clock
                      size={16}
                      color={friendSortOption === 'recent' ? 'white' : '#6b7280'}
                    />
                    <Text
                      className={`ml-1.5 font-medium ${
                        friendSortOption === 'recent' ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      Recent
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setFriendSortOption('alphabetical')}
                    className={`flex-row items-center px-4 py-2 rounded-full ${
                      friendSortOption === 'alphabetical'
                        ? 'bg-black'
                        : 'bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <SortAsc
                      size={16}
                      color={friendSortOption === 'alphabetical' ? 'white' : '#6b7280'}
                    />
                    <Text
                      className={`ml-1.5 font-medium ${
                        friendSortOption === 'alphabetical' ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      A-Z
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {friendsLoading ? (
              <ActivityIndicator size="large" color="#FFBF00" />
            ) : sortedFriends && sortedFriends.length > 0 ? (
              <View className="gap-2">
                {sortedFriends.map((friend: any) => (
                  <View
                    key={friend.friendshipId}
                    className="flex-row items-center justify-between py-3 border-b border-gray-100"
                  >
                    <TouchableOpacity
                      onPress={() => router.push(`/(tabs)/profile/${friend.friend.id}`)}
                      className="flex-row items-center flex-1"
                    >
                      {friend.friend?.avatar_url ? (
                        <Image
                          source={{ uri: friend.friend.avatar_url }}
                          className="w-12 h-12 rounded-full bg-gray-300"
                        />
                      ) : (
                        <View className="w-12 h-12 rounded-full bg-gray-300 items-center justify-center">
                          <Text className="text-gray-600 font-semibold">
                            {friend.friend?.display_name?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="ml-3 flex-1">
                        <Text className="font-semibold text-gray-900">
                          {friend.friend?.display_name}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          @{friend.friend?.username}
                        </Text>
                        {friendSortOption === 'recent' && friend.createdAt && (
                          <Text className="text-xs text-gray-400">
                            Added {new Date(friend.createdAt).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveFriend(friend.friendshipId)}
                      className="ml-3"
                    >
                      <X size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-gray-50 rounded-lg p-8 items-center">
                <Text className="text-gray-600 text-center">No friends yet</Text>
                <Text className="text-gray-500 text-center text-sm mt-2">
                  Find friends using the Find tab
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'requests' && (
          <View className="p-4">
            {requestsLoading ? (
              <ActivityIndicator size="large" color="#FFBF00" />
            ) : friendRequests && friendRequests.length > 0 ? (
              <View className="gap-2">
                {friendRequests.map((request: any) => (
                  <View
                    key={request.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 mb-2"
                  >
                    <View className="flex-row items-center mb-3">
                      {request.requester?.avatar_url ? (
                        <Image
                          source={{ uri: request.requester.avatar_url }}
                          className="w-12 h-12 rounded-full bg-gray-300"
                        />
                      ) : (
                        <View className="w-12 h-12 rounded-full bg-gray-300 items-center justify-center">
                          <Text className="text-gray-600 font-semibold">
                            {request.requester?.display_name?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="ml-3 flex-1">
                        <Text className="font-semibold text-gray-900">
                          {request.requester?.display_name}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          @{request.requester?.username}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => handleAcceptRequest(request.id)}
                        className="flex-1 bg-black rounded-lg py-2 flex-row items-center justify-center"
                      >
                        <Check size={18} color="white" />
                        <Text className="text-white font-semibold ml-1">Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeclineRequest(request.id)}
                        className="flex-1 bg-gray-200 rounded-lg py-2 flex-row items-center justify-center"
                      >
                        <X size={18} color="#111827" />
                        <Text className="text-gray-900 font-semibold ml-1">Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-gray-50 rounded-lg p-8 items-center">
                <Text className="text-gray-600 text-center">No pending requests</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'find' && (
          <View className="p-4">
            {searchLoading ? (
              <ActivityIndicator size="large" color="#FFBF00" />
            ) : searchResults && searchResults.length > 0 ? (
              <View className="gap-2">
                {searchResults.map((result: any) => (
                  <View
                    key={result.id}
                    className="flex-row items-center justify-between py-3 border-b border-gray-100"
                  >
                    <TouchableOpacity
                      onPress={() => router.push(`/(tabs)/profile/${result.id}`)}
                      className="flex-row items-center flex-1"
                    >
                      {result.avatar_url ? (
                        <Image
                          source={{ uri: result.avatar_url }}
                          className="w-12 h-12 rounded-full bg-gray-300"
                        />
                      ) : (
                        <View className="w-12 h-12 rounded-full bg-gray-300 items-center justify-center">
                          <Text className="text-gray-600 font-semibold">
                            {result.display_name?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="ml-3 flex-1">
                        <Text className="font-semibold text-gray-900">
                          {result.display_name}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          @{result.username}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleSendRequest(result.id)}
                      className="bg-primary-100 rounded-lg px-3 py-2"
                    >
                      <UserPlus size={18} color="#FFBF00" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : searchQuery.length > 0 ? (
              <View className="bg-gray-50 rounded-lg p-8 items-center">
                <Text className="text-gray-600 text-center">No users found</Text>
                <Text className="text-gray-500 text-center text-sm mt-2">
                  Try searching by username or email
                </Text>
              </View>
            ) : (
              <View className="bg-gray-50 rounded-lg p-8 items-center">
                <Search size={48} color="#9ca3af" />
                <Text className="text-gray-600 text-center mt-4">
                  Search for friends
                </Text>
                <Text className="text-gray-500 text-center text-sm mt-2">
                  Enter a username or email to find people
                </Text>
              </View>
            )}

            {/* Invite Friends Button */}
            <View className="mt-6 pt-6 border-t border-gray-200">
              <Text className="text-center text-gray-600 mb-3">
                Don't see who you're looking for?
              </Text>
              <TouchableOpacity
                onPress={() => setShowInviteModal(true)}
                className="bg-primary-500 rounded-full py-3.5 flex-row items-center justify-center"
              >
                <UserPlus size={20} color="#000" />
                <Text className="text-black font-bold ml-2">Invite Friends via SMS</Text>
              </TouchableOpacity>
            </View>
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
