import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { MessageCircle, UserPlus, Plus, Users, ChevronDown, Check } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useChats, useSuggestedConversations } from '../../../hooks/useMessages';
import { useFriends } from '../../../hooks/useFriends';
import { useMyGroupChats } from '../../../hooks/useChats';
import { CircleCreationModal } from '../../../components/circles/CircleCreationModal';

type Filter = 'all' | 'dms' | 'circles';

const FILTER_OPTIONS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All Messages' },
  { key: 'dms', label: 'DMs' },
  { key: 'circles', label: 'Circles' },
];

function FilterDropdown({ activeFilter, onFilterChange, visible, onClose }: {
  activeFilter: Filter;
  onFilterChange: (f: Filter) => void;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1" onPress={onClose}>
        <View className="absolute left-5 bg-white rounded-2xl py-2 shadow-lg border border-gray-100" style={{ top: 108, minWidth: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 }}>
          {FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              className="flex-row items-center justify-between px-5 py-3.5"
              onPress={() => { onFilterChange(option.key); onClose(); }}
              activeOpacity={0.6}
            >
              <Text className={`text-base ${activeFilter === option.key ? 'font-bold text-black' : 'font-medium text-gray-700'}`}>
                {option.label}
              </Text>
              {activeFilter === option.key && (
                <Check size={18} color="#000" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

function SuggestedRow({ suggestedFriends, router }: { suggestedFriends: any[]; router: any }) {
  if (suggestedFriends.length === 0) return null;
  return (
    <View className="mb-2">
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 mb-2">
        Suggested
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
        <View className="flex-row gap-4">
          {suggestedFriends.map((item: any) => (
            <TouchableOpacity
              key={item.friend.id}
              onPress={() => router.push(`/(tabs)/messages/${item.friend.id}`)}
              className="items-center"
              style={{ width: 68 }}
            >
              {item.friend.avatar_url ? (
                <Image
                  source={{ uri: item.friend.avatar_url }}
                  className="w-14 h-14 rounded-full bg-gray-200 mb-1.5"
                />
              ) : (
                <View className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center mb-1.5">
                  <Text className="text-gray-500 font-bold text-lg">
                    {item.friend.display_name?.[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <Text className="text-xs text-gray-700 font-medium text-center" numberOfLines={1}>
                {item.friend.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ConversationRow({ conversation, userId, router, showBorder }: { conversation: any; userId?: string; router: any; showBorder: boolean }) {
  return (
    <TouchableOpacity
      className="flex-row items-center px-5 py-3"
      onPress={() => router.push(`/(tabs)/messages/${conversation.partner.id}`)}
      activeOpacity={0.6}
    >
      {conversation.partner.avatar_url ? (
        <Image
          source={{ uri: conversation.partner.avatar_url }}
          className="w-12 h-12 rounded-full bg-gray-200"
        />
      ) : (
        <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center">
          <Text className="text-gray-500 font-bold text-lg">
            {conversation.partner.display_name?.[0]?.toUpperCase()}
          </Text>
        </View>
      )}

      <View className={`flex-1 ml-3 ${showBorder ? 'border-b border-gray-100' : ''} pb-3`} style={{ marginTop: -2 }}>
        <View className="flex-row items-center justify-between">
          <Text className={`text-base ${conversation.unreadCount > 0 ? 'font-bold' : 'font-semibold'} text-black`}>
            {conversation.partner.display_name}
          </Text>
          {conversation.lastMessage?.created_at && (
            <Text className="text-xs text-gray-400">
              {formatTimeAgo(conversation.lastMessage.created_at)}
            </Text>
          )}
        </View>
        <View className="flex-row items-center mt-0.5">
          <Text className={`text-sm flex-1 ${conversation.unreadCount > 0 ? 'text-black font-medium' : 'text-gray-500'}`} numberOfLines={1}>
            {conversation.lastMessage?.sender_id === userId ? 'You: ' : ''}
            {conversation.lastMessage?.content || 'Start a conversation'}
          </Text>
          {conversation.unreadCount > 0 && (
            <View className="bg-blue-500 rounded-full w-5 h-5 items-center justify-center ml-2">
              <Text className="text-white text-xs font-bold">
                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CircleRow({ circle, router, showBorder }: { circle: any; router: any; showBorder: boolean }) {
  const lastMessage = circle.last_message;
  return (
    <TouchableOpacity
      className="flex-row items-center px-5 py-3"
      onPress={() => router.push(`/(tabs)/circles/${circle.id}`)}
      activeOpacity={0.6}
    >
      {circle.avatar_url ? (
        <Image
          source={{ uri: circle.avatar_url }}
          className="w-12 h-12 rounded-full bg-gray-200"
        />
      ) : (
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: circle.theme_color || '#4DB6AC' }}
        >
          <Text className="text-white font-bold text-xl">
            {circle.name?.[0]?.toUpperCase()}
          </Text>
        </View>
      )}

      <View className={`flex-1 ml-3 ${showBorder ? 'border-b border-gray-100' : ''} pb-3`} style={{ marginTop: -2 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-black">
            {circle.name}
          </Text>
          {lastMessage?.created_at && (
            <Text className="text-xs text-gray-400">
              {formatTimeAgo(lastMessage.created_at)}
            </Text>
          )}
        </View>
        <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
          {lastMessage
            ? `${lastMessage.sender_name || ''}: ${lastMessage.content || ''}`
            : `${circle.member_count || 0} members`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: allChats, isLoading: messagesLoading, refetch: refetchConversations } = useChats(user?.id);
  const { data: suggestedConversations, refetch: refetchSuggested } = useSuggestedConversations(user?.id);
  const { data: friends } = useFriends(user?.id);
  const { data: realCircles, isLoading: circlesLoading, refetch: refetchCircles } = useMyGroupChats(user?.id);

  // Split chats into DMs and derive conversations format
  const realConversations = allChats?.filter((c: any) => c.chat.type === 'dm').map((c: any) => ({
    partner: c.partner,
    lastMessage: c.lastMessage,
    unreadCount: c.unreadCount,
  })) || [];

  const conversations = realConversations || [];
  const circles = realCircles || [];

  const conversationPartnerIds = new Set(
    conversations.map((c: any) => c.partner?.id).filter(Boolean)
  );
  const suggestedFriends = friends?.filter(
    (f: any) => !conversationPartnerIds.has(f.friend.id)
  ).slice(0, 8) || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchConversations(), refetchSuggested(), refetchCircles()]);
    setRefreshing(false);
  };

  const activeLabel = FILTER_OPTIONS.find(f => f.key === activeFilter)!.label;
  const showDMs = activeFilter === 'all' || activeFilter === 'dms';
  const showCirclesList = activeFilter === 'all' || activeFilter === 'circles';
  const showSuggested = activeFilter === 'all' || activeFilter === 'dms';
  const isLoading = (showDMs && messagesLoading) || (showCirclesList && circlesLoading);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header row */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => setShowDropdown(true)}
          activeOpacity={0.6}
        >
          <Text className="text-2xl font-black text-black">{activeLabel}</Text>
          <ChevronDown size={22} color="#000" strokeWidth={2.5} style={{ marginLeft: 4, marginTop: 2 }} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (activeFilter === 'circles') {
              setShowCreateModal(true);
            } else {
              router.push('/(tabs)/profile/friends');
            }
          }}
          className="bg-black rounded-full px-4 py-2 flex-row items-center"
          activeOpacity={0.7}
        >
          <Plus size={16} color="white" strokeWidth={2.5} />
          <Text className="text-white font-semibold text-sm ml-1">New</Text>
        </TouchableOpacity>
      </View>

      <FilterDropdown
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        visible={showDropdown}
        onClose={() => setShowDropdown(false)}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Suggested convos horizontal row */}
          {showSuggested && (
            <SuggestedRow suggestedFriends={suggestedFriends} router={router} />
          )}

          {/* DM conversations */}
          {showDMs && conversations && conversations.length > 0 && (
            <View>
              {activeFilter === 'all' && (circles?.length ?? 0) > 0 && (
                <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 mt-2 mb-1">
                  Messages
                </Text>
              )}
              {conversations.map((conversation: any, index: number) => (
                <ConversationRow
                  key={conversation.partner.id}
                  conversation={conversation}
                  userId={user?.id}
                  router={router}
                  showBorder={index < conversations.length - 1 || (showCirclesList && (circles?.length ?? 0) > 0)}
                />
              ))}
            </View>
          )}

          {/* Circles */}
          {showCirclesList && circles && circles.length > 0 && (
            <View>
              {activeFilter === 'all' && (conversations?.length ?? 0) > 0 && (
                <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 mt-2 mb-1">
                  Circles
                </Text>
              )}
              {circles.map((circle: any, index: number) => (
                <CircleRow
                  key={circle.id}
                  circle={circle}
                  router={router}
                  showBorder={index < circles.length - 1}
                />
              ))}
            </View>
          )}

          {/* Empty states */}
          {showDMs && (!conversations || conversations.length === 0) && suggestedFriends.length === 0 && activeFilter !== 'all' && (
            <View className="px-5 mt-8 items-center">
              <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
                <MessageCircle size={28} color="#9ca3af" />
              </View>
              <Text className="text-lg font-bold text-black text-center mb-1">
                No conversations yet
              </Text>
              <Text className="text-gray-500 text-center mb-5">
                Start chatting with your friends
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile/friends')}
                className="bg-black rounded-full px-6 py-3"
              >
                <Text className="text-white font-semibold">Find Friends</Text>
              </TouchableOpacity>
            </View>
          )}

          {showCirclesList && (!circles || circles.length === 0) && activeFilter !== 'all' && (
            <View className="px-5 mt-8 items-center">
              <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Users size={28} color="#9ca3af" />
              </View>
              <Text className="text-lg font-bold text-black text-center mb-1">
                No circles yet
              </Text>
              <Text className="text-gray-500 text-center mb-5">
                Create or join a circle to get started
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                className="bg-black rounded-full px-6 py-3"
              >
                <Text className="text-white font-semibold">Create Circle</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <CircleCreationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </SafeAreaView>
  );
}
