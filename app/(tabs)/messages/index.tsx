import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { MessageCircle, UserPlus } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useConversations, useSuggestedConversations } from '../../../hooks/useMessages';
import { useFriends } from '../../../hooks/useFriends';

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { data: conversations, isLoading, refetch } = useConversations(user?.id);
  const { data: suggestedConversations, refetch: refetchSuggested } = useSuggestedConversations(user?.id);
  const { data: friends } = useFriends(user?.id);

  // Get friends who user hasn't messaged yet
  const conversationPartnerIds = new Set(conversations?.map((c: any) => c.partner.id) || []);
  const suggestedFriends = friends?.filter(
    (f: any) => !conversationPartnerIds.has(f.friend.id)
  ).slice(0, 5) || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchSuggested()]);
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <View className="px-5 pt-4">
        <Text className="text-3xl font-black text-black mb-6">Messages</Text>

        {conversations && conversations.length > 0 ? (
          <View className="bg-white rounded-3xl border border-gray-200 overflow-hidden mb-6">
            {conversations.map((conversation: any, index: number) => (
              <TouchableOpacity
                key={conversation.partner.id}
                className={`flex-row items-center p-4 ${
                  index < conversations.length - 1 ? 'border-b border-gray-100' : ''
                }`}
                onPress={() =>
                  router.push(`/(tabs)/messages/${conversation.partner.id}`)
                }
                activeOpacity={0.7}
              >
                {/* Avatar */}
                {conversation.partner.avatar_url ? (
                  <Image
                    source={{ uri: conversation.partner.avatar_url }}
                    className="w-14 h-14 rounded-full bg-gray-200"
                  />
                ) : (
                  <View className="w-14 h-14 rounded-full bg-primary-500 items-center justify-center">
                    <Text className="text-black font-bold text-lg">
                      {conversation.partner.display_name?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}

                {/* Content */}
                <View className="flex-1 ml-4">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="font-bold text-black text-base">
                      {conversation.partner.display_name}
                    </Text>
                    {conversation.lastMessage?.created_at && (
                      <Text className="text-xs text-gray-500">
                        {formatDate(conversation.lastMessage.created_at)}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>
                      {conversation.lastMessage?.sender_id === user?.id ? 'You: ' : ''}
                      {conversation.lastMessage?.content || 'Start a conversation'}
                    </Text>
                    {conversation.unreadCount > 0 && (
                      <View className="bg-black rounded-full w-6 h-6 items-center justify-center ml-2">
                        <Text className="text-white text-xs font-bold">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="bg-gray-50 rounded-3xl p-12 items-center border border-gray-200">
            <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-4">
              <MessageCircle size={28} color="#9ca3af" />
            </View>
            <Text className="text-lg font-bold text-black text-center mb-2">
              No conversations yet
            </Text>
            <Text className="text-gray-600 text-center">
              Start chatting with your friends!
            </Text>
          </View>
        )}

        {/* Suggested Convos Section */}
        {suggestedFriends.length > 0 && (
          <View className="mt-6">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Start a Conversation
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
              <View className="flex-row gap-3">
                {suggestedFriends.map((item: any) => (
                  <TouchableOpacity
                    key={item.friend.id}
                    onPress={() => router.push(`/(tabs)/messages/${item.friend.id}`)}
                    className="items-center"
                    style={{ width: 80 }}
                  >
                    {item.friend.avatar_url ? (
                      <Image
                        source={{ uri: item.friend.avatar_url }}
                        className="w-16 h-16 rounded-full bg-gray-200 mb-2"
                      />
                    ) : (
                      <View className="w-16 h-16 rounded-full bg-primary-100 items-center justify-center mb-2">
                        <Text className="text-primary-700 font-bold text-xl">
                          {item.friend.display_name?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text className="text-xs text-gray-900 font-medium text-center" numberOfLines={1}>
                      {item.friend.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Empty state for no friends */}
        {!conversations?.length && !suggestedFriends.length && (
          <View className="mt-6">
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile/friends')}
              className="bg-primary-50 border border-primary-200 rounded-2xl p-4 flex-row items-center"
            >
              <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center mr-3">
                <UserPlus size={24} color="#FFBF00" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-black">Find Friends</Text>
                <Text className="text-gray-600 text-sm">Add friends to start messaging</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
