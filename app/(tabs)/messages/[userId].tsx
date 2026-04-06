import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Image as ImageIcon, Reply, X, MoreVertical, BellOff, Bell } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../contexts/AuthContext';
import { useMessages, useSendMessage, useMarkAsRead } from '../../../hooks/useMessages';
import { useProfile } from '../../../hooks/useProfile';
import { useMessageReactions, useAddMessageReaction, useRemoveMessageReaction } from '../../../hooks/useMessageReactions';
import { ReactionPicker } from '../../../components/messages/ReactionPicker';
import { TypingIndicator } from '../../../components/messages/TypingIndicator';
import { useBroadcastTyping, useListenTyping } from '../../../hooks/useTypingIndicator';
import * as haptics from '../../../utils/haptics';

export default function MessageThreadPage() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messageText, setMessageText] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { data: messages, isLoading, refetch } = useMessages(user?.id, userId);
  const { data: otherUserProfile } = useProfile(userId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Get all message IDs for reactions query
  const messageIds = messages?.map((m: any) => m.id) || [];
  const { data: reactionsData } = useMessageReactions(messageIds);
  const addReaction = useAddMessageReaction();
  const removeReaction = useRemoveMessageReaction();

  // Typing indicators
  const { startTyping, stopTyping } = useBroadcastTyping(user?.id, userId);
  const isOtherUserTyping = useListenTyping(user?.id, userId);

  // Mark messages as read when viewing thread
  useEffect(() => {
    if (user?.id && userId && messages) {
      markAsRead.mutate({ userId: user.id, otherUserId: userId });
    }
  }, [user?.id, userId, messages]);

  // Stop typing when component unmounts
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, []);

  // Removed manual polling - now using Realtime subscriptions

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setMediaType(asset.type === 'video' ? 'video' : 'image');
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() && !mediaUri) return;
    if (!user || !userId) return;

    const mediaFile = mediaUri
      ? {
          uri: mediaUri,
          type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
          name: mediaType === 'video' ? 'video.mp4' : 'image.jpg',
        }
      : undefined;

    try {
      await sendMessage.mutateAsync({
        senderId: user.id,
        recipientId: userId,
        content: messageText.trim(),
        mediaFile,
        replyToId: replyingTo?.id,
      });

      setMessageText('');
      setMediaUri(null);
      setMediaType(null);
      setReplyingTo(null);

      // Stop typing indicator
      stopTyping();

      // Scroll to bottom after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      haptics.lightImpact();
    } catch (error: any) {
      haptics.error();
      Alert.alert('Error', error.message || 'Failed to send message');
    }
  };

  const handleLongPressMessage = (message: any) => {
    haptics.mediumImpact();
    setSelectedMessageId(message.id);
    setShowReactionPicker(true);
  };

  const handleReply = (message: any) => {
    haptics.lightImpact();
    setReplyingTo(message);
    setShowReactionPicker(false);
    setSelectedMessageId(null);
  };

  // Find the replied-to message
  const getRepliedToMessage = (replyToId: string | undefined) => {
    if (!replyToId || !messages) return null;
    return messages.find((m: any) => m.id === replyToId);
  };

  const handleSelectEmoji = async (emoji: string) => {
    if (!user || !selectedMessageId) return;

    // Check if user already reacted with this emoji
    const existingReaction = reactionsData?.find(
      (r: any) =>
        r.message_id === selectedMessageId &&
        r.user_id === user.id &&
        r.emoji === emoji
    );

    try {
      haptics.lightImpact();

      if (existingReaction) {
        // Remove reaction
        await removeReaction.mutateAsync({
          messageId: selectedMessageId,
          userId: user.id,
          emoji,
        });
      } else {
        // Add reaction
        await addReaction.mutateAsync({
          messageId: selectedMessageId,
          userId: user.id,
          emoji,
        });
      }
    } catch (error: any) {
      haptics.error();
      Alert.alert('Error', error.message || 'Failed to update reaction');
    }
  };

  // Group reactions by message and emoji
  const getMessageReactions = (messageId: string) => {
    const messageReactions = reactionsData?.filter(
      (r: any) => r.message_id === messageId
    ) || [];

    // Group by emoji
    const grouped: { [emoji: string]: { count: number; users: string[] } } = {};
    messageReactions.forEach((reaction: any) => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = { count: 0, users: [] };
      }
      grouped[reaction.emoji].count++;
      grouped[reaction.emoji].users.push(reaction.user_id);
    });

    return grouped;
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FFBF00" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          {otherUserProfile?.avatar_url ? (
            <Image
              source={{ uri: otherUserProfile.avatar_url }}
              className="w-8 h-8 rounded-full bg-gray-300 ml-3"
            />
          ) : (
            <View className="w-8 h-8 rounded-full bg-gray-300 ml-3 items-center justify-center">
              <Text className="text-gray-600 text-xs font-semibold">
                {otherUserProfile?.display_name?.[0]?.toUpperCase()}
              </Text>
            </View>
          )}
          <View className="flex-1 ml-3">
            <Text className="text-lg font-semibold text-gray-900">
              {otherUserProfile?.display_name || 'Loading...'}
            </Text>
            {isMuted && (
              <Text className="text-xs text-gray-500">Notifications muted</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setShowMenu(!showMenu)}
            className="p-2"
          >
            <MoreVertical size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Dropdown Menu */}
        {showMenu && (
          <View className="absolute right-4 top-16 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[180px]">
            <TouchableOpacity
              onPress={() => {
                haptics.lightImpact();
                setIsMuted(!isMuted);
                setShowMenu(false);
              }}
              className="flex-row items-center px-4 py-3"
            >
              {isMuted ? (
                <>
                  <Bell size={18} color="#111827" />
                  <Text className="text-gray-900 ml-3">Unmute</Text>
                </>
              ) : (
                <>
                  <BellOff size={18} color="#111827" />
                  <Text className="text-gray-900 ml-3">Mute</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ flexGrow: 1 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages && messages.length > 0 ? (
            <View className="gap-3">
              {messages.map((message: any) => {
                const isMyMessage = message.sender_id === user?.id;
                const reactions = getMessageReactions(message.id);
                const hasReactions = Object.keys(reactions).length > 0;
                const repliedTo = getRepliedToMessage(message.reply_to_id);

                return (
                  <View
                    key={message.id}
                    className={`flex-row ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <View className="max-w-[75%]">
                      {/* Replied-to message preview */}
                      {repliedTo && (
                        <View className={`mb-1 px-3 py-2 rounded-lg ${
                          isMyMessage ? 'bg-primary-400/30' : 'bg-gray-300/50'
                        }`}>
                          <View className="flex-row items-center mb-1">
                            <Reply size={12} color={isMyMessage ? '#fff' : '#666'} />
                            <Text className={`text-xs ml-1 ${
                              isMyMessage ? 'text-white/80' : 'text-gray-600'
                            }`}>
                              {repliedTo.sender_id === user?.id ? 'You' : otherUserProfile?.display_name}
                            </Text>
                          </View>
                          <Text className={`text-xs ${
                            isMyMessage ? 'text-white/70' : 'text-gray-500'
                          }`} numberOfLines={1}>
                            {repliedTo.content || (repliedTo.media_url ? 'Photo' : '')}
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onLongPress={() => handleLongPressMessage(message)}
                        onPress={() => handleReply(message)}
                        className={`rounded-2xl px-4 py-2 ${
                          isMyMessage
                            ? 'bg-primary-500'
                            : 'bg-gray-200'
                        }`}
                      >
                        {/* Shared Response Card */}
                        {message.response && (
                          <TouchableOpacity
                            onPress={() => router.push(`/(tabs)/profile/${message.response.user_id}`)}
                            className="bg-white/20 rounded-xl p-3 mb-2 border border-white/30"
                          >
                            <View className="flex-row items-center mb-2">
                              <View className="w-6 h-6 rounded-full bg-white/30 items-center justify-center mr-2">
                                <Text className="text-xs">📝</Text>
                              </View>
                              <Text className={`text-xs font-medium ${
                                isMyMessage ? 'text-white/80' : 'text-gray-600'
                              }`}>
                                Shared Response
                              </Text>
                            </View>
                            {message.response.prompt?.text && (
                              <Text className={`text-xs mb-1 ${
                                isMyMessage ? 'text-white/70' : 'text-gray-500'
                              }`} numberOfLines={1}>
                                "{message.response.prompt.text}"
                              </Text>
                            )}
                            {message.response.media_url && message.response.media_type === 'image' && (
                              <Image
                                source={{ uri: message.response.media_url }}
                                className="w-full h-32 rounded-lg mb-2"
                                resizeMode="cover"
                              />
                            )}
                            {message.response.text_content && (
                              <Text className={`text-sm ${
                                isMyMessage ? 'text-white' : 'text-gray-800'
                              }`} numberOfLines={3}>
                                {message.response.text_content}
                              </Text>
                            )}
                          </TouchableOpacity>
                        )}

                        {message.media_url && message.media_type === 'image' && (
                          <Image
                            source={{ uri: message.media_url }}
                            className="w-48 h-48 rounded-lg mb-2"
                            resizeMode="cover"
                          />
                        )}
                        {message.content && !message.content.startsWith('REACTION:') && (
                          <Text
                            className={`text-base ${
                              isMyMessage ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            {message.content}
                          </Text>
                        )}
                        <Text
                          className={`text-xs mt-1 ${
                            isMyMessage ? 'text-primary-100' : 'text-gray-500'
                          }`}
                        >
                          {new Date(message.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Text>
                      </TouchableOpacity>

                      {/* Reactions */}
                      {hasReactions && (
                        <View className="flex-row flex-wrap gap-1 mt-1">
                          {Object.entries(reactions).map(([emoji, data]) => {
                            const userReacted = data.users.includes(user?.id || '');
                            return (
                              <TouchableOpacity
                                key={emoji}
                                onPress={() => handleSelectEmoji(emoji)}
                                className={`flex-row items-center px-2 py-1 rounded-full ${
                                  userReacted ? 'bg-primary-100 border border-primary-500' : 'bg-gray-100'
                                }`}
                                activeOpacity={0.7}
                              >
                                <Text className="text-sm">{emoji}</Text>
                                {data.count > 1 && (
                                  <Text className={`text-xs ml-1 ${
                                    userReacted ? 'text-primary-600 font-semibold' : 'text-gray-600'
                                  }`}>
                                    {data.count}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">No messages yet</Text>
              <Text className="text-gray-400 text-sm mt-1">
                Start the conversation!
              </Text>
            </View>
          )}

          {/* Typing Indicator */}
          {isOtherUserTyping && (
            <TypingIndicator displayName={otherUserProfile?.display_name} />
          )}
        </ScrollView>

        {/* Reply Preview */}
        {replyingTo && (
          <View className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-row items-center">
            <View className="w-1 h-full bg-primary-500 rounded-full mr-3" />
            <View className="flex-1">
              <Text className="text-xs text-primary-600 font-semibold">
                Replying to {replyingTo.sender_id === user?.id ? 'yourself' : otherUserProfile?.display_name}
              </Text>
              <Text className="text-sm text-gray-600" numberOfLines={1}>
                {replyingTo.content || (replyingTo.media_url ? 'Photo' : '')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setReplyingTo(null)}
              className="p-2"
            >
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Media Preview */}
        {mediaUri && (
          <View className="px-4 py-2 border-t border-gray-200">
            <View className="relative">
              {mediaType === 'image' ? (
                <Image
                  source={{ uri: mediaUri }}
                  className="w-20 h-20 rounded-lg bg-gray-100"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-20 h-20 rounded-lg bg-gray-900 items-center justify-center">
                  <Text className="text-white text-xs">Video</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => {
                  setMediaUri(null);
                  setMediaType(null);
                }}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
              >
                <Text className="text-white text-xs font-bold">×</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Input */}
        <View className="flex-row items-center px-4 py-3 border-t border-gray-200">
          <TouchableOpacity
            onPress={pickImage}
            className="mr-3"
          >
            <ImageIcon size={24} color="#FFBF00" />
          </TouchableOpacity>
          <TextInput
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-base"
            placeholder="Type a message..."
            value={messageText}
            onChangeText={(text) => {
              setMessageText(text);
              if (text.trim()) {
                startTyping();
              } else {
                stopTyping();
              }
            }}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!messageText.trim() && !mediaUri}
            className="ml-3"
          >
            <Send
              size={24}
              color={messageText.trim() || mediaUri ? '#FFBF00' : '#9ca3af'}
            />
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>

      {/* Reaction Picker */}
      <ReactionPicker
        visible={showReactionPicker}
        onClose={() => {
          setShowReactionPicker(false);
          setSelectedMessageId(null);
        }}
        onSelectEmoji={handleSelectEmoji}
      />
    </SafeAreaView>
  );
}
