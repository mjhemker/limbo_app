import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Settings, Plus, Swords, ArrowUp } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useCircle, useCircleMessages, useSendCircleMessage, useCirclePrompts } from '../../../hooks/useCircles';
import { DebateCreationModal } from '../../../components/circles/DebateCreationModal';
import { CirclePromptModal } from '../../../components/circles/CirclePromptModal';

export default function CircleDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'prompts' | 'chat'>('prompts');
  const [messageText, setMessageText] = useState('');
  const [showDebateModal, setShowDebateModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);

  const { data: circle, isLoading: circleLoading } = useCircle(id);
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useCircleMessages(id);
  const { data: prompts, isLoading: promptsLoading } = useCirclePrompts(id);
  const sendMessage = useSendCircleMessage();

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !id) return;

    try {
      await sendMessage.mutateAsync({
        circleId: id,
        senderId: user.id,
        content: messageText.trim(),
      });
      setMessageText('');
      refetchMessages();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    }
  };

  const handleCreatePrompt = () => {
    setShowPromptModal(true);
  };

  if (circleLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FFBF00" />
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
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <View className="border-b border-gray-200">
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1 ml-3">
            <Text className="text-lg font-semibold text-gray-900">
              {circle.name}
            </Text>
            <Text className="text-xs text-gray-500">
              {circle.member_count || 0} members
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/circles/' + id + '/settings')}>
            <Settings size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <View className="flex-row border-t border-gray-200">
          <TouchableOpacity
            onPress={() => setActiveTab('prompts')}
            className={`flex-1 py-3 border-b-2 ${activeTab === 'prompts' ? 'border-black' : 'border-transparent'}`}
          >
            <Text
              className={`text-center font-semibold ${activeTab === 'prompts' ? 'text-black' : 'text-gray-500'}`}
            >
              Prompts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('chat')}
            className={`flex-1 py-3 border-b-2 ${activeTab === 'chat' ? 'border-black' : 'border-transparent'}`}
          >
            <Text
              className={`text-center font-semibold ${activeTab === 'chat' ? 'text-black' : 'text-gray-500'}`}
            >
              Chat
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'prompts' ? (
        <ScrollView className="flex-1">
          <View className="p-4">
            {/* Action Buttons */}
            <View className="flex-row gap-2 mb-4">
              <TouchableOpacity
                onPress={handleCreatePrompt}
                className="flex-1 bg-black rounded-xl p-3 flex-row items-center justify-center"
              >
                <Plus size={20} color="white" />
                <Text className="text-white font-semibold ml-2">Prompt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowDebateModal(true)}
                className="flex-1 bg-purple-600 rounded-xl p-3 flex-row items-center justify-center"
              >
                <Swords size={20} color="white" />
                <Text className="text-white font-semibold ml-2">Debate</Text>
              </TouchableOpacity>
            </View>

            {/* Prompts List */}
            {promptsLoading ? (
              <View className="bg-gray-50 rounded-lg p-8 items-center">
                <ActivityIndicator size="large" color="#FFBF00" />
              </View>
            ) : prompts && prompts.length > 0 ? (
              <View className="gap-3">
                {prompts.map((prompt: any, index: number) => {
                  // Alternate colors for prompts
                  const promptColors = ['#FFBF00', '#FF7900', '#000000', '#6366f1', '#ec4899'];
                  const bgColor = prompt.is_debate ? '#7c3aed' : promptColors[index % promptColors.length];

                  return (
                    <TouchableOpacity
                      key={prompt.id}
                      onPress={() => {
                        if (prompt.is_debate) {
                          router.push(`/(tabs)/circles/${id}/debate/${prompt.id}`);
                        } else {
                          router.push(`/(tabs)/circles/${id}/prompt/${prompt.id}`);
                        }
                      }}
                      className="rounded-2xl p-5 overflow-hidden"
                      style={{ backgroundColor: bgColor }}
                    >
                      {prompt.is_debate && (
                        <View className="flex-row items-center mb-2">
                          <Swords size={16} color="white" />
                          <Text className="text-white font-bold text-xs uppercase tracking-wide ml-2">
                            Debate
                          </Text>
                        </View>
                      )}

                      <Text className="font-bold text-white text-lg leading-tight">
                        {prompt.is_debate
                          ? `${prompt.debate_side_a} vs ${prompt.debate_side_b}`
                          : prompt.text}
                      </Text>

                      <Text className="text-white/70 text-xs mt-3 font-medium">
                        {new Date(prompt.created_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View className="bg-gray-50 rounded-lg p-8 items-center">
                <Text className="text-gray-600 text-center">No prompts yet</Text>
                <Text className="text-gray-500 text-center text-sm mt-2">
                  Create a prompt or debate for your circle
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 bg-gray-50">
          <ScrollView className="flex-1 px-3 py-4">
            {messagesLoading ? (
              <View className="flex-1 items-center justify-center py-12">
                <ActivityIndicator size="large" color="#FFBF00" />
              </View>
            ) : messages && messages.length > 0 ? (
              <View className="gap-2">
                {messages.map((message: any) => {
                  const isOwnMessage = message.sender_id === user?.id;

                  return (
                    <View
                      key={message.id}
                      className={`flex-row ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOwnMessage && (
                        message.sender?.avatar_url ? (
                          <Image
                            source={{ uri: message.sender.avatar_url }}
                            className="w-7 h-7 rounded-full bg-gray-300 mr-2 mt-1"
                          />
                        ) : (
                          <View className="w-7 h-7 rounded-full bg-gray-300 items-center justify-center mr-2 mt-1">
                            <Text className="text-gray-600 text-xs font-semibold">
                              {message.sender?.display_name?.[0]?.toUpperCase()}
                            </Text>
                          </View>
                        )
                      )}
                      <View className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        {!isOwnMessage && (
                          <Text className="text-xs text-gray-500 mb-1 ml-1">
                            {message.sender?.display_name}
                          </Text>
                        )}
                        <View
                          className={`px-4 py-2.5 ${
                            isOwnMessage
                              ? 'bg-primary-500 rounded-2xl rounded-br-md'
                              : 'bg-white rounded-2xl rounded-bl-md'
                          }`}
                          style={!isOwnMessage ? { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } } : undefined}
                        >
                          <Text className={isOwnMessage ? 'text-black' : 'text-gray-900'}>
                            {message.content}
                          </Text>
                        </View>
                        <Text className="text-xs text-gray-400 mt-1 mx-1">
                          {new Date(message.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="flex-1 items-center justify-center py-12">
                <Text className="text-gray-500">No messages yet</Text>
                <Text className="text-gray-400 text-sm mt-1">
                  Start the conversation!
                </Text>
              </View>
            )}
          </ScrollView>

          <View className="flex-row items-end px-3 py-2 bg-white border-t border-gray-200">
            <TextInput
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-base mr-2 max-h-24"
              placeholder="iMessage"
              placeholderTextColor="#9ca3af"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
              className={`w-9 h-9 rounded-full items-center justify-center ${messageText.trim() ? 'bg-primary-500' : 'bg-gray-200'}`}
            >
              <ArrowUp
                size={18}
                color={messageText.trim() ? '#000' : '#9ca3af'}
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Debate Creation Modal */}
      <DebateCreationModal
        visible={showDebateModal}
        onClose={() => setShowDebateModal(false)}
        circleId={id || ''}
      />

      {/* Circle Prompt Modal */}
      <CirclePromptModal
        visible={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        circleId={id || ''}
      />
    </SafeAreaView>
  );
}
