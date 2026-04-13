import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { X, UserPlus, Search } from 'lucide-react-native';
import { useFriends } from '../../hooks/useFriends';
import { useAuth } from '../../contexts/AuthContext';
import { useChatMembers as useCircleMembers } from '../../hooks/useChats';

interface AddMembersModalProps {
  visible: boolean;
  onClose: () => void;
  circleId: string;
}

export function AddMembersModal({ visible, onClose, circleId }: AddMembersModalProps) {
  const { user } = useAuth();
  const { data: friends } = useFriends(user?.id);
  const { data: currentMembers } = useCircleMembers(circleId);

  const [searchQuery, setSearchQuery] = useState('');

  // Filter out friends who are already members
  const currentMemberIds = new Set(currentMembers?.map((m: any) => m.user_id) || []);
  const availableFriends = friends?.filter(
    (f: any) => !currentMemberIds.has(f.friend.id)
  ) || [];

  // Filter by search query
  const filteredFriends = availableFriends.filter((f: any) =>
    (f.friend?.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.friend?.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = async (friendId: string, friendName: string) => {
    // TODO: Implement add member API call
    Alert.alert('Info', `Add member API for ${friendName} needs to be implemented in backend`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 mt-20 bg-white rounded-t-3xl">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
            <Text className="text-xl font-bold text-gray-900">
              Add Members
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 items-center justify-center"
            >
              <X size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="px-6 py-4">
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
              <Search size={20} color="#6b7280" />
              <TextInput
                className="flex-1 ml-2 text-base"
                placeholder="Search friends..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Friends List */}
          <ScrollView className="flex-1 px-6">
            {filteredFriends.length > 0 ? (
              filteredFriends.map((friend: any) => (
                <View
                  key={friend.friendshipId}
                  className="flex-row items-center justify-between py-3 border-b border-gray-100"
                >
                  <View className="flex-row items-center flex-1">
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
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleAddMember(friend.friend.id, friend.friend.display_name)}
                    className="bg-primary-100 rounded-lg px-4 py-2"
                  >
                    <UserPlus size={18} color="#FFBF00" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View className="bg-gray-50 rounded-lg p-8 items-center mt-4">
                <Text className="text-gray-600 text-center">
                  {searchQuery
                    ? 'No friends found'
                    : availableFriends.length === 0
                    ? 'All your friends are already members'
                    : 'No friends to add'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
