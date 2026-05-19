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
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#F7DA21" />
      </SafeAreaView>
    );
  }

  if (!circle) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-xl font-extrabold text-ink text-center mb-2" style={{ letterSpacing: -0.5 }}>
          Circle not found
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <ChatView
      title={circle.name}
      subtitle={`${circle.member_count || 0} members · ${Math.min(circle.member_count || 0, 3)} online`}
      avatarUrl={circle.avatar_url}
      avatarFallback={circle.name?.[0]?.toUpperCase()}
      avatarColor={circle.theme_color || '#8E73C9'}
      onBack={() => router.back()}
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
