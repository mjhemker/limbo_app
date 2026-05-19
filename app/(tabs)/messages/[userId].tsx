import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { useChatMessages, useSendMessage, useMarkChatAsRead, useGetOrCreateDMChat } from '../../../hooks/useMessages';
import { useProfile } from '../../../hooks/useProfile';
import { ChatView } from '../../../components/chat/ChatView';

export default function MessageThreadPage() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const [chatId, setChatId] = useState<string | null>(null);

  const getOrCreateDMChat = useGetOrCreateDMChat();

  // Resolve chatId from userId
  useEffect(() => {
    if (user?.id && userId) {
      getOrCreateDMChat.mutateAsync({ userA: user.id, userB: userId }).then(setChatId);
    }
  }, [user?.id, userId]);

  const { data: messages, isLoading } = useChatMessages(chatId || undefined);
  const { data: otherUserProfile, isLoading: profileLoading } = useProfile(userId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkChatAsRead();

  // Mark messages as read when viewing thread
  useEffect(() => {
    if (user?.id && chatId && messages) {
      markAsRead.mutate({ chatId, userId: user.id });
    }
  }, [user?.id, chatId, messages]);

  // Get display name with fallbacks
  const displayName = otherUserProfile?.display_name || otherUserProfile?.username || (profileLoading ? 'Loading...' : 'Chat');
  const avatarInitial = (otherUserProfile?.display_name?.[0] || otherUserProfile?.username?.[0] || '?').toUpperCase();

  if (!chatId) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#F7DA21" />
      </View>
    );
  }

  return (
    <ChatView
      title={displayName}
      avatarUrl={otherUserProfile?.avatar_url}
      avatarFallback={avatarInitial}
      avatarColor="#d1d5db"
      chatId={chatId}
      messages={messages}
      messagesLoading={isLoading}
      onBack={() => router.replace('/(tabs)/circles')}
      onProfilePress={() => {
        if (userId) {
          router.push(`/(tabs)/profile/${userId}?from=messages`);
        }
      }}
      onSendMessage={async (content) => {
        if (!user || !chatId) return;
        await sendMessage.mutateAsync({
          chatId,
          senderId: user.id,
          content,
        });
      }}
      placeholder="Message..."
    />
  );
}
