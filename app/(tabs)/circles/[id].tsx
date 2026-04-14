import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { useChat as useCircle, useChatMessages as useCircleMessages, useSendChatMessage as useSendCircleMessage } from '../../../hooks/useChats';
import { ChatView } from '../../../components/chat/ChatView';

export default function CircleDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: circle, isLoading: circleLoading } = useCircle(id);
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useCircleMessages(id);
  const sendMessage = useSendCircleMessage();

  if (circleLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  if (!circle) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-xl font-semibold text-gray-900 text-center mb-2">
          Circle not found
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <ChatView
      title={circle.name}
      subtitle={`${circle.member_count || 0} members`}
      avatarUrl={circle.avatar_url}
      avatarFallback={circle.name?.[0]?.toUpperCase()}
      avatarColor={circle.theme_color || '#4DB6AC'}
      onBack={() => router.replace('/(tabs)/circles')}
      onSettingsPress={() => router.push('/(tabs)/circles/' + id + '/settings')}
      chatId={id}
      messages={messages}
      messagesLoading={messagesLoading}
      isGroup
      onSendMessage={async (content) => {
        if (!user || !id) return;
        await sendMessage.mutateAsync({
          chatId: id,
          senderId: user.id,
          content,
        });
        refetchMessages();
      }}
      placeholder="Message the circle..."
    />
  );
}
