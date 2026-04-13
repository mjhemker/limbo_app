import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { useChatMessages, useSendMessage, useMarkChatAsRead, useGetOrCreateDMChat } from '../../../hooks/useMessages';
import { useProfile } from '../../../hooks/useProfile';
import { ChatView } from '../../../components/chat/ChatView';

export default function MessageThreadPage() {
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
  const { data: otherUserProfile } = useProfile(userId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkChatAsRead();

  // Mark messages as read when viewing thread
  useEffect(() => {
    if (user?.id && chatId && messages) {
      markAsRead.mutate({ chatId, userId: user.id });
    }
  }, [user?.id, chatId, messages]);

  if (isLoading || !chatId) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <ChatView
      title={otherUserProfile?.display_name || 'Loading...'}
      avatarUrl={otherUserProfile?.avatar_url}
      avatarFallback={otherUserProfile?.display_name?.[0]?.toUpperCase()}
      avatarColor="#d1d5db"
      messages={messages}
      messagesLoading={isLoading}
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
