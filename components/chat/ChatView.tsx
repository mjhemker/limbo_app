import { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Settings, Plus, ArrowUp, HelpCircle, Image as LucideImage, Swords, Pencil, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useAuth } from '../../contexts/AuthContext';
import { useCreateChatPrompt, useRespondedPromptIds, useResponseCountsForPrompts } from '../../hooks/useChats';
import { toast } from '../../utils/toast';

// Prompt messages are encoded with this prefix
export const PROMPT_PREFIX = '::PROMPT::';

export interface PromptData {
  prompt_id: string;
  text: string;
  type: 'general' | 'debate' | 'draw';
  options?: string[];
  debate_side_a?: string;
  debate_side_b?: string;
}

export function encodePrompt(data: PromptData): string {
  return PROMPT_PREFIX + JSON.stringify(data);
}

export function decodePrompt(content: string): PromptData | null {
  if (!content.startsWith(PROMPT_PREFIX)) return null;
  try {
    return JSON.parse(content.slice(PROMPT_PREFIX.length));
  } catch {
    return null;
  }
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  media_url?: string;
  media_type?: string;
  reply_to_id?: string;
  sender?: {
    display_name?: string;
    avatar_url?: string;
  };
}

export interface ChatViewProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  avatarFallback?: string;
  avatarColor?: string;
  onSettingsPress?: () => void;

  chatId?: string;
  messages: ChatMessage[] | undefined;
  messagesLoading: boolean;

  onSendMessage: (content: string) => Promise<void>;
  placeholder?: string;

  isGroup?: boolean;
}

type PromptType = 'basic' | 'debate' | 'draw';

// ─── Plus Menu ───
function PlusMenu({ visible, onClose, onPrompt, onImage }: {
  visible: boolean;
  onClose: () => void;
  onPrompt: () => void;
  onImage: () => void;
}) {
  if (!visible) return null;
  return (
    <View className="absolute bottom-16 left-3" style={{ zIndex: 50 }}>
      <View
        className="bg-white rounded-2xl py-3 px-1 border border-gray-100"
        style={{ minWidth: 180, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12 }}
      >
        <TouchableOpacity className="flex-row items-center px-4 py-3" onPress={() => { onClose(); onPrompt(); }} activeOpacity={0.6}>
          <View className="w-10 h-10 bg-black rounded-xl items-center justify-center">
            <HelpCircle size={20} color="white" />
          </View>
          <Text className="text-base font-semibold text-gray-900 ml-3">Prompt</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center px-4 py-3" onPress={() => { onClose(); onImage(); }} activeOpacity={0.6}>
          <View className="w-10 h-10 bg-black rounded-xl items-center justify-center">
            <LucideImage size={20} color="white" />
          </View>
          <Text className="text-base font-semibold text-gray-900 ml-3">Image</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Prompt Card ───
function PromptCard({ promptData, hasResponded, responseCount, onRespond, onViewResponses }: {
  promptData: PromptData;
  hasResponded: boolean;
  responseCount: number;
  onRespond: () => void;
  onViewResponses: () => void;
}) {
  const typeConfig = {
    general: { label: 'BASIC', Icon: HelpCircle, color: '#000' },
    debate: { label: 'DEBATE', Icon: Swords, color: '#7c3aed' },
    draw: { label: 'DRAW', Icon: Pencil, color: '#f59e0b' },
  };

  const { label, Icon, color } = typeConfig[promptData.type] || typeConfig.general;
  const options = promptData.options || [promptData.debate_side_a, promptData.debate_side_b].filter(Boolean);

  return (
    <View className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden" style={{ width: 260 }}>
      <View className="flex-row items-center px-4 pt-3.5 pb-2">
        <Icon size={14} color={color} strokeWidth={2.5} />
        <Text className="text-xs font-bold uppercase tracking-wider ml-1.5" style={{ color }}>{label}</Text>
      </View>
      <View className="px-4 pb-3">
        <Text className="text-base font-semibold text-gray-900 mb-1">{promptData.text}</Text>
        {promptData.type === 'debate' && options.length > 0 && (
          <View className="mt-1">
            {options.map((opt, i) => (
              <Text key={i} className="text-sm text-gray-500">{String.fromCharCode(65 + i)}. {opt}</Text>
            ))}
          </View>
        )}
      </View>
      <View className="border-t border-gray-200 px-4 py-3 flex-row items-center justify-between">
        {responseCount > 0 ? (
          <Text className="text-xs text-gray-400">{responseCount} {responseCount === 1 ? 'response' : 'responses'}</Text>
        ) : <View />}
        {hasResponded ? (
          <TouchableOpacity onPress={onViewResponses} className="rounded-full px-4 py-1.5 bg-gray-200" activeOpacity={0.7}>
            <Text className="text-sm font-semibold text-gray-700">See Responses</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onRespond} className="rounded-full px-4 py-1.5 bg-black" activeOpacity={0.7}>
            <Text className="text-sm font-semibold text-white">Respond</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Main ChatView ───
export function ChatView({
  title,
  subtitle,
  avatarUrl,
  avatarFallback,
  avatarColor = '#d1d5db',
  onSettingsPress,
  chatId,
  messages,
  messagesLoading,
  onSendMessage,
  placeholder = 'Message...',
  isGroup = false,
}: ChatViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  // Prompt creation sheet state
  const [promptType, setPromptType] = useState<PromptType>('basic');
  const [promptText, setPromptText] = useState('');
  const [debateQuestion, setDebateQuestion] = useState('');
  const [debateOptions, setDebateOptions] = useState<string[]>(['', '']);
  const [drawCanvas, setDrawCanvas] = useState<'blank' | 'image'>('blank');
  const [drawImageUri, setDrawImageUri] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const createPrompt = useCreateChatPrompt();

  // Collect all prompt_ids from messages to check responses
  const promptIdsInChat = useMemo(() => {
    if (!messages) return [];
    const ids: string[] = [];
    messages.forEach(m => {
      const p = decodePrompt(m.content);
      if (p?.prompt_id) ids.push(p.prompt_id);
    });
    return ids;
  }, [messages]);

  const { data: respondedIds } = useRespondedPromptIds(user?.id, promptIdsInChat);
  const { data: responseCounts } = useResponseCountsForPrompts(promptIdsInChat);
  const respondedSet = useMemo(() => new Set(respondedIds || []), [respondedIds]);

  const snapPoints = useMemo(() => ['75%'], []);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;
    try {
      setSending(true);
      await onSendMessage(messageText.trim());
      setMessageText('');
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!result.canceled) toast.success('Image sharing coming soon!');
  };

  const typeDescriptions: Record<PromptType, string> = {
    basic: 'Accepts text, audio, and image responses.',
    debate: 'Members vote on options and share their take.',
    draw: 'Members respond with a drawing.',
  };

  const canPost = () => {
    if (promptType === 'debate') return debateQuestion.trim() && debateOptions.filter(o => o.trim()).length >= 2;
    return promptText.trim();
  };

  const openPromptSheet = useCallback(() => bottomSheetRef.current?.expand(), []);
  const closePromptSheet = useCallback(() => bottomSheetRef.current?.close(), []);

  const resetPromptForm = useCallback(() => {
    setPromptText(''); setDebateQuestion(''); setDebateOptions(['', '']); setDrawCanvas('blank'); setDrawImageUri(null); setPromptType('basic');
  }, []);

  const handleSheetChange = useCallback((index: number) => { if (index === -1) resetPromptForm(); }, [resetPromptForm]);
  const renderBackdrop = useCallback((props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />, []);

  const handlePost = async () => {
    if (!canPost() || !chatId || !user) return;
    try {
      setCreating(true);
      let text: string, dbType: 'general' | 'debate' | 'draw', debateSideA: string | undefined, debateSideB: string | undefined, promptOptions: string[] | undefined;

      if (promptType === 'debate') {
        const filled = debateOptions.map(o => o.trim()).filter(Boolean);
        text = debateQuestion.trim(); dbType = 'debate'; debateSideA = filled[0]; debateSideB = filled[1]; promptOptions = filled;
      } else if (promptType === 'draw') {
        text = promptText.trim(); dbType = 'draw';
      } else {
        text = promptText.trim(); dbType = 'general';
      }

      const prompt = await createPrompt.mutateAsync({ chatId, text, createdBy: user.id, options: { type: dbType, debateSideA, debateSideB, debateOptions: promptOptions } });
      const data: PromptData = { prompt_id: prompt.id, text, type: dbType, options: promptOptions, debate_side_a: debateSideA, debate_side_b: debateSideB };
      await onSendMessage(encodePrompt(data));

      toast.success('Prompt posted!');
      closePromptSheet();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create prompt');
    } finally {
      setCreating(false);
    }
  };

  // Navigate to full-screen response pages
  const handleRespond = (promptData: PromptData, senderName?: string) => {
    if (!chatId) return;
    const params: Record<string, string> = { promptText: promptData.text, creatorName: senderName || '' };
    if (promptData.debate_side_a) params.sideA = promptData.debate_side_a;
    if (promptData.debate_side_b) params.sideB = promptData.debate_side_b;
    if (promptData.type === 'debate') {
      router.push({ pathname: `/(tabs)/circles/${chatId}/debate/${promptData.prompt_id}`, params });
    } else if (promptData.type === 'draw') {
      router.push({ pathname: `/(tabs)/circles/${chatId}/draw/${promptData.prompt_id}`, params });
    } else {
      router.push({ pathname: `/(tabs)/circles/${chatId}/prompt/${promptData.prompt_id}`, params });
    }
  };

  const handleViewResponses = (promptData: PromptData, senderName?: string) => {
    if (!chatId) return;
    const params = { promptText: promptData.text, creatorName: senderName || '' };
    router.push({ pathname: `/(tabs)/circles/${chatId}/responses/${promptData.prompt_id}`, params });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1" keyboardVerticalOffset={0}>
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
            <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color="#111827" /></TouchableOpacity>
            <View className="flex-1 items-center">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="w-8 h-8 rounded-full bg-gray-200 mb-0.5" />
              ) : (
                <View className="w-8 h-8 rounded-full items-center justify-center mb-0.5" style={{ backgroundColor: avatarColor }}>
                  <Text className="text-white font-bold text-sm">{avatarFallback}</Text>
                </View>
              )}
              <Text className="text-base font-semibold text-gray-900">{title}</Text>
              {subtitle && <Text className="text-xs text-gray-500">{subtitle}</Text>}
            </View>
            {onSettingsPress ? (
              <TouchableOpacity onPress={onSettingsPress}><Settings size={22} color="#111827" /></TouchableOpacity>
            ) : <View style={{ width: 24 }} />}
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-3 py-4"
            contentContainerStyle={{ flexGrow: 1 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => Keyboard.dismiss()}
          >
            {messagesLoading ? (
              <View className="flex-1 items-center justify-center py-12"><ActivityIndicator size="large" color="#000" /></View>
            ) : messages && messages.length > 0 ? (
              <View className="gap-3">
                {messages.map((message) => {
                  const isOwnMessage = message.sender_id === user?.id;
                  const promptData = decodePrompt(message.content);

                  if (promptData) {
                    const hasResponded = respondedSet.has(promptData.prompt_id);
                    const count = responseCounts?.[promptData.prompt_id] || 0;

                    return (
                      <View key={message.id} className={`flex-row ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        {!isOwnMessage && (
                          message.sender?.avatar_url ? (
                            <Image source={{ uri: message.sender.avatar_url }} className="w-7 h-7 rounded-full bg-gray-300 mr-2 mt-1" />
                          ) : (
                            <View className="w-7 h-7 rounded-full bg-gray-300 items-center justify-center mr-2 mt-1">
                              <Text className="text-gray-600 text-xs font-semibold">{message.sender?.display_name?.[0]?.toUpperCase()}</Text>
                            </View>
                          )
                        )}
                        <View className={`${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {!isOwnMessage && isGroup && <Text className="text-xs text-gray-500 mb-1 ml-1">{message.sender?.display_name}</Text>}
                          <PromptCard
                            promptData={promptData}
                            hasResponded={hasResponded}
                            responseCount={count}
                            onRespond={() => handleRespond(promptData, message.sender?.display_name)}
                            onViewResponses={() => handleViewResponses(promptData, message.sender?.display_name)}
                          />
                          <Text className="text-xs text-gray-400 mt-1 mx-1">
                            {new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View key={message.id} className={`flex-row ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      {!isOwnMessage && (
                        message.sender?.avatar_url ? (
                          <Image source={{ uri: message.sender.avatar_url }} className="w-7 h-7 rounded-full bg-gray-300 mr-2 mt-1" />
                        ) : (
                          <View className="w-7 h-7 rounded-full bg-gray-300 items-center justify-center mr-2 mt-1">
                            <Text className="text-gray-600 text-xs font-semibold">{message.sender?.display_name?.[0]?.toUpperCase()}</Text>
                          </View>
                        )
                      )}
                      <View className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        {!isOwnMessage && isGroup && <Text className="text-xs text-gray-500 mb-1 ml-1">{message.sender?.display_name}</Text>}
                        {message.media_url && message.media_type === 'image' && (
                          <Image source={{ uri: message.media_url }} className="w-48 h-48 rounded-2xl mb-1" resizeMode="cover" />
                        )}
                        <View className={`px-4 py-2.5 ${isOwnMessage ? 'bg-black rounded-2xl rounded-br-md' : 'bg-gray-100 rounded-2xl rounded-bl-md'}`}>
                          <Text className={isOwnMessage ? 'text-white' : 'text-gray-900'}>{message.content}</Text>
                        </View>
                        <Text className="text-xs text-gray-400 mt-1 mx-1">
                          {new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="flex-1 items-center justify-center py-12">
                <Text className="text-gray-500">No messages yet</Text>
                <Text className="text-gray-400 text-sm mt-1">Start the conversation!</Text>
              </View>
            )}
          </ScrollView>

          <PlusMenu visible={showPlusMenu} onClose={() => setShowPlusMenu(false)} onPrompt={openPromptSheet} onImage={handlePickImage} />

          {/* Input Bar */}
          <View className="flex-row items-end px-3 py-2 bg-white border-t border-gray-200 gap-2">
            <TouchableOpacity onPress={() => setShowPlusMenu(!showPlusMenu)} activeOpacity={0.6} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 1 }}>
              <Plus size={22} color="#9ca3af" strokeWidth={2} />
            </TouchableOpacity>
            <TextInput
              style={{ flex: 1, borderRadius: 18, backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, minHeight: 36, maxHeight: 100, fontSize: 16 }}
              placeholder={placeholder} placeholderTextColor="#9ca3af" value={messageText} onChangeText={setMessageText} multiline maxLength={1000}
              onFocus={() => setShowPlusMenu(false)}
            />
            <TouchableOpacity onPress={handleSend} disabled={!messageText.trim()} activeOpacity={0.6} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: messageText.trim() ? '#000' : '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 1 }}>
              <ArrowUp size={20} color={messageText.trim() ? '#fff' : '#9ca3af'} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {showPlusMenu && <Pressable className="absolute inset-0" style={{ zIndex: 40 }} onPress={() => setShowPlusMenu(false)} />}

      {/* New Prompt Bottom Sheet */}
      <BottomSheet ref={bottomSheetRef} index={-1} snapPoints={snapPoints} enablePanDownToClose backdropComponent={renderBackdrop} onChange={handleSheetChange} handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }} backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <BottomSheetView className="flex-1 px-5">
          <View className="flex-row items-center justify-between py-2 mb-2">
            <TouchableOpacity onPress={closePromptSheet}><Text className="text-base text-gray-600">Cancel</Text></TouchableOpacity>
            <Text className="text-lg font-bold text-black">New Prompt</Text>
            <TouchableOpacity onPress={handlePost} disabled={creating || !canPost()}>
              <Text className={`text-base font-semibold ${canPost() && !creating ? 'text-blue-500' : 'text-gray-300'}`}>{creating ? 'Posting...' : 'Post'}</Text>
            </TouchableOpacity>
          </View>
          <View className="mb-3">
            <View className="flex-row bg-gray-100 rounded-full p-1">
              {(['basic', 'debate', 'draw'] as PromptType[]).map((type) => (
                <TouchableOpacity key={type} onPress={() => setPromptType(type)} className={`flex-1 py-2 rounded-full items-center ${promptType === type ? 'bg-black' : ''}`} activeOpacity={0.7}>
                  <Text className={`font-semibold text-sm capitalize ${promptType === type ? 'text-white' : 'text-gray-500'}`}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-xs text-gray-400 text-center mt-2">{typeDescriptions[promptType]}</Text>
          </View>

          {promptType === 'debate' ? (
            <View>
              <TextInput className="border-2 border-black rounded-2xl px-4 py-4 text-base min-h-[80px]" placeholder="Which is better: morning workouts or evening workouts?" value={debateQuestion} onChangeText={setDebateQuestion} multiline textAlignVertical="top" maxLength={200} />
              <Text className="text-xs text-gray-400 mt-1.5 mb-4 text-right">{debateQuestion.length}/200</Text>
              <Text className="text-base font-bold text-black mb-2">Options</Text>
              {debateOptions.map((option, index) => (
                <View key={index} className="flex-row items-center mb-3">
                  <Text className="text-sm font-bold text-gray-400 w-6">{String.fromCharCode(65 + index)}</Text>
                  <TextInput className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-base" placeholder={`Option ${String.fromCharCode(65 + index)}`} value={option} onChangeText={(t) => { const u = [...debateOptions]; u[index] = t; setDebateOptions(u); }} maxLength={80} />
                  {debateOptions.length > 2 && <TouchableOpacity onPress={() => setDebateOptions(debateOptions.filter((_, i) => i !== index))} className="ml-2"><X size={18} color="#9ca3af" /></TouchableOpacity>}
                </View>
              ))}
              {debateOptions.length < 6 && <TouchableOpacity onPress={() => setDebateOptions([...debateOptions, ''])} className="mb-12"><Text className="text-sm font-semibold text-gray-500">+ Add option</Text></TouchableOpacity>}
            </View>
          ) : promptType === 'draw' ? (
            <View>
              <TextInput className="border-2 border-black rounded-2xl px-4 py-4 text-base min-h-[80px]" placeholder="What should everyone draw?" value={promptText} onChangeText={setPromptText} multiline textAlignVertical="top" maxLength={200} />
              <Text className="text-xs text-gray-400 mt-1.5 mb-4 text-right">{promptText.length}/200</Text>
              <Text className="text-base font-bold text-black mb-3">Canvas</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => { setDrawCanvas('blank'); setDrawImageUri(null); }}
                  className={`flex-1 aspect-square rounded-2xl border-2 items-center justify-center ${drawCanvas === 'blank' ? 'border-black bg-white' : 'border-gray-200 bg-gray-50'}`}
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-xl border-2 border-dashed border-gray-300 items-center justify-center mb-2">
                    <Pencil size={18} color="#9ca3af" />
                  </View>
                  <Text className={`text-sm font-semibold ${drawCanvas === 'blank' ? 'text-black' : 'text-gray-500'}`}>Blank Canvas</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
                    if (!result.canceled) { setDrawImageUri(result.assets[0].uri); setDrawCanvas('image'); }
                  }}
                  className={`flex-1 aspect-square rounded-2xl border-2 items-center justify-center overflow-hidden ${drawCanvas === 'image' ? 'border-black' : 'border-gray-200 bg-gray-50'}`}
                  activeOpacity={0.7}
                >
                  {drawImageUri ? (
                    <Image source={{ uri: drawImageUri }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <>
                      <View className="w-10 h-10 rounded-xl bg-gray-200 items-center justify-center mb-2">
                        <LucideImage size={18} color="#9ca3af" />
                      </View>
                      <Text className={`text-sm font-semibold ${drawCanvas === 'image' ? 'text-black' : 'text-gray-500'}`}>Upload Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <TextInput className="border-2 border-black rounded-2xl px-4 py-4 text-base min-h-[120px]" placeholder="What's something that changed your perspective recently?" value={promptText} onChangeText={setPromptText} multiline textAlignVertical="top" maxLength={200} />
              <Text className="text-xs text-gray-400 mt-2 text-right">{promptText.length}/200</Text>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}
