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
import { ChevronLeft, MoreVertical, Plus, ArrowUp, HelpCircle, Image as LucideImage, Swords, Pencil, X, Reply, Bell, BellOff, ImageIcon, Link, MessageSquare, Eye, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ReactionPicker } from '../messages/ReactionPicker';
import { COLORS } from '../../lib/constants';
import * as ImagePicker from 'expo-image-picker';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useAuth } from '../../contexts/AuthContext';
import { useCreateChatPrompt, useRespondedPromptIds, useResponseCountsForPrompts } from '../../hooks/useChats';
import { toast } from '../../utils/toast';

// V2 Avatar colors
const AVATAR_COLORS = ['#F26E5E', '#6AAA64', '#8E73C9', '#4F8FE0', '#C28F2C'];

function getAvatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

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
  onProfilePress?: () => void;
  onBack?: () => void;

  chatId?: string;
  messages: ChatMessage[] | undefined;
  messagesLoading: boolean;

  onSendMessage: (content: string) => Promise<void>;
  placeholder?: string;

  isGroup?: boolean;
  showSettingsButton?: boolean;
}

type PromptType = 'basic' | 'debate' | 'draw';

// ─── Plus Menu ─── V2 Style
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
        className="bg-card rounded-[18px] py-3 px-1 border border-rule"
        style={{ minWidth: 180, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12 }}
      >
        <TouchableOpacity className="flex-row items-center px-4 py-3" onPress={() => { onClose(); onPrompt(); }} activeOpacity={0.6}>
          <View className="w-10 h-10 bg-ink rounded-[14px] items-center justify-center">
            <HelpCircle size={20} color="white" />
          </View>
          <Text className="text-[15px] font-bold text-ink ml-3">Prompt</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center px-4 py-3" onPress={() => { onClose(); onImage(); }} activeOpacity={0.6}>
          <View className="w-10 h-10 bg-ink rounded-[14px] items-center justify-center">
            <LucideImage size={20} color="white" />
          </View>
          <Text className="text-[15px] font-bold text-ink ml-3">Image</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Prompt Card ─── V2 Yellow Style
function PromptCard({ promptData, hasResponded, responseCount, onRespond, onViewResponses }: {
  promptData: PromptData;
  hasResponded: boolean;
  responseCount: number;
  onRespond: () => void;
  onViewResponses: () => void;
}) {
  const typeConfig = {
    general: { label: 'BASIC', Icon: HelpCircle, bgColor: '#F7DA21', textColor: '#111111' },
    debate: { label: 'DEBATE', Icon: Swords, bgColor: '#8E73C9', textColor: '#FFFFFF' },
    draw: { label: 'DRAW', Icon: Pencil, bgColor: '#6AAA64', textColor: '#FFFFFF' },
  };

  const { label, Icon, bgColor, textColor } = typeConfig[promptData.type] || typeConfig.general;
  const options = promptData.options || [promptData.debate_side_a, promptData.debate_side_b].filter(Boolean);

  return (
    <View className="rounded-[18px] overflow-hidden" style={{ width: 260, backgroundColor: bgColor }}>
      <View className="flex-row items-center px-4 pt-3.5 pb-2">
        <Icon size={14} color={textColor} strokeWidth={2.5} />
        <Text className="text-[10px] font-bold uppercase tracking-widest ml-1.5" style={{ color: textColor, opacity: 0.7 }}>{label}</Text>
      </View>
      <View className="px-4 pb-3">
        <Text className="text-[15px] font-bold mb-1" style={{ color: textColor, letterSpacing: -0.2 }}>{promptData.text}</Text>
        {promptData.type === 'debate' && options.length > 0 && (
          <View className="mt-1">
            {options.map((opt, i) => (
              <Text key={i} className="text-[13px] font-medium" style={{ color: textColor, opacity: 0.8 }}>{String.fromCharCode(65 + i)}. {opt}</Text>
            ))}
          </View>
        )}
      </View>
      <View className="border-t px-4 py-3 flex-row items-center justify-between" style={{ borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}>
        {responseCount > 0 ? (
          <Text className="text-[11px] font-medium" style={{ color: textColor, opacity: 0.6 }}>{responseCount} {responseCount === 1 ? 'response' : 'responses'}</Text>
        ) : <View />}
        {hasResponded ? (
          <TouchableOpacity onPress={onViewResponses} className="rounded-full px-4 py-1.5" style={{ backgroundColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} activeOpacity={0.7}>
            <Text className="text-[13px] font-bold" style={{ color: textColor }}>See Responses</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onRespond} className="rounded-full px-4 py-1.5 bg-ink" activeOpacity={0.7}>
            <Text className="text-[13px] font-bold text-white">Respond</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Main ChatView ─── V2 Style
export function ChatView({
  title,
  subtitle,
  avatarUrl,
  avatarFallback,
  avatarColor,
  onSettingsPress,
  onProfilePress,
  onBack,
  chatId,
  messages,
  messagesLoading,
  onSendMessage,
  placeholder = 'Message...',
  isGroup = false,
  showSettingsButton = true,
}: ChatViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);

  // Chat settings state
  const [settingsTab, setSettingsTab] = useState<'settings' | 'media' | 'prompts'>('settings');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPromptsInChat, setShowPromptsInChat] = useState(true);

  // Prompt creation sheet state
  const [promptType, setPromptType] = useState<PromptType>('basic');
  const [promptText, setPromptText] = useState('');
  const [debateQuestion, setDebateQuestion] = useState('');
  const [debateOptions, setDebateOptions] = useState<string[]>(['', '']);
  const [drawCanvas, setDrawCanvas] = useState<'blank' | 'image'>('blank');
  const [drawImageUri, setDrawImageUri] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const createPrompt = useCreateChatPrompt();

  // Compute avatar color from name if not provided
  const computedAvatarColor = avatarColor || getAvatarColor(avatarFallback);

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

  const handleMessageLongPress = (message: ChatMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessageId(message.id);
    setShowReactionPicker(true);
  };

  const handleReactionSelect = (emoji: string) => {
    // TODO: Save reaction to database
    console.log('Selected reaction:', emoji, 'for message:', selectedMessageId);
    toast.success(`Reacted with ${emoji}`);
    setShowReactionPicker(false);
    setSelectedMessageId(null);
  };

  const handleReply = (message: ChatMessage) => {
    setReplyToMessage(message);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const clearReply = () => {
    setReplyToMessage(null);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1" keyboardVerticalOffset={0}>
        <View className="flex-1">
          {/* V2 Header */}
          <View className="flex-row items-center px-4 py-3 border-b border-rule">
            <TouchableOpacity onPress={onBack || (() => router.back())} className="w-10 h-10 items-center justify-center">
              <ChevronLeft size={24} color="#111111" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 items-center"
              onPress={onProfilePress}
              activeOpacity={onProfilePress ? 0.7 : 1}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="w-9 h-9 rounded-full bg-sand mb-0.5" />
              ) : (
                <View className="w-9 h-9 rounded-full items-center justify-center mb-0.5" style={{ backgroundColor: computedAvatarColor }}>
                  <Text className="text-white font-bold text-[14px]">{avatarFallback}</Text>
                </View>
              )}
              <Text className="text-[15px] font-bold text-ink" style={{ letterSpacing: -0.2 }}>{title}</Text>
              {subtitle && <Text className="text-[11px] text-ink-soft font-medium">{subtitle}</Text>}
            </TouchableOpacity>
            {showSettingsButton ? (
              <TouchableOpacity
                onPress={onSettingsPress || (() => settingsSheetRef.current?.expand())}
                className="w-10 h-10 items-center justify-center"
              >
                <MoreVertical size={22} color="#111111" strokeWidth={2} />
              </TouchableOpacity>
            ) : <View style={{ width: 40 }} />}
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
              <View className="flex-1 items-center justify-center py-12"><ActivityIndicator size="large" color="#F7DA21" /></View>
            ) : messages && messages.length > 0 ? (
              <View className="gap-3">
                {messages.map((message, index) => {
              // Add date header between messages from different days
              const currentDate = new Date(message.created_at);
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const prevDate = prevMessage ? new Date(prevMessage.created_at) : null;
              const showDateHeader = !prevDate ||
                currentDate.toDateString() !== prevDate.toDateString();

              const formatDateHeader = (date: Date) => {
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();

                if (date.toDateString() === today.toDateString()) {
                  return `TODAY · ${timeStr}`;
                } else if (date.toDateString() === yesterday.toDateString()) {
                  return `YESTERDAY · ${timeStr}`;
                } else {
                  const dayStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
                  return `${dayStr} · ${timeStr}`;
                }
              };
                  const isOwnMessage = message.sender_id === user?.id;
                  const promptData = decodePrompt(message.content);
                  const senderColor = getAvatarColor(message.sender?.display_name);

                  if (promptData) {
                    const hasResponded = respondedSet.has(promptData.prompt_id);
                    const count = responseCounts?.[promptData.prompt_id] || 0;

                    return (
                      <View key={message.id}>
                        {showDateHeader && (
                          <View className="flex-row items-center justify-center my-4">
                            <View className="flex-1 h-px bg-rule" />
                            <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mx-3" style={{ fontFamily: 'JetBrainsMono_400Regular' }}>
                              {formatDateHeader(currentDate)}
                            </Text>
                            <View className="flex-1 h-px bg-rule" />
                          </View>
                        )}
                        <View className={`flex-row ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        {!isOwnMessage && (
                          message.sender?.avatar_url ? (
                            <Image source={{ uri: message.sender.avatar_url }} className="w-7 h-7 rounded-full bg-sand mr-2 mt-1" />
                          ) : (
                            <View className="w-7 h-7 rounded-full items-center justify-center mr-2 mt-1" style={{ backgroundColor: senderColor }}>
                              <Text className="text-white text-[11px] font-bold">{message.sender?.display_name?.[0]?.toUpperCase()}</Text>
                            </View>
                          )
                        )}
                        <View className={`${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {!isOwnMessage && isGroup && <Text className="text-[11px] text-ink-soft font-medium mb-1 ml-1">{message.sender?.display_name}</Text>}
                          <PromptCard
                            promptData={promptData}
                            hasResponded={hasResponded}
                            responseCount={count}
                            onRespond={() => handleRespond(promptData, message.sender?.display_name)}
                            onViewResponses={() => handleViewResponses(promptData, message.sender?.display_name)}
                          />
                          <Text className="text-[10px] text-ink-soft font-medium mt-1 mx-1" style={{ fontFamily: 'JetBrainsMono_400Regular' }}>
                            {new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </Text>
                        </View>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View key={message.id}>
                      {showDateHeader && (
                        <View className="flex-row items-center justify-center my-4">
                          <View className="flex-1 h-px bg-rule" />
                          <Text className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mx-3" style={{ fontFamily: 'JetBrainsMono_400Regular' }}>
                            {formatDateHeader(currentDate)}
                          </Text>
                          <View className="flex-1 h-px bg-rule" />
                        </View>
                      )}
                      <View className={`flex-row ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      {!isOwnMessage && (
                        message.sender?.avatar_url ? (
                          <Image source={{ uri: message.sender.avatar_url }} className="w-7 h-7 rounded-full bg-sand mr-2 mt-1" />
                        ) : (
                          <View className="w-7 h-7 rounded-full items-center justify-center mr-2 mt-1" style={{ backgroundColor: senderColor }}>
                            <Text className="text-white text-[11px] font-bold">{message.sender?.display_name?.[0]?.toUpperCase()}</Text>
                          </View>
                        )
                      )}
                      <View className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        {!isOwnMessage && isGroup && <Text className="text-[11px] text-ink-soft font-medium mb-1 ml-1">{message.sender?.display_name}</Text>}
                        {message.media_url && message.media_type === 'image' && (
                          <Image source={{ uri: message.media_url }} className="w-48 h-48 rounded-[18px] mb-1" resizeMode="cover" />
                        )}
                        <Pressable
                          onLongPress={() => handleMessageLongPress(message)}
                          onPress={() => !isOwnMessage && handleReply(message)}
                          delayLongPress={400}
                        >
                          <View className={`px-4 py-2.5 ${isOwnMessage ? 'bg-ink rounded-[18px] rounded-br-[6px]' : 'bg-sand rounded-[18px] rounded-bl-[6px]'}`}>
                            <Text className={`text-[15px] font-medium ${isOwnMessage ? 'text-white' : 'text-ink'}`}>{message.content}</Text>
                          </View>
                        </Pressable>
                        <Text className="text-[10px] text-ink-soft font-medium mt-1 mx-1" style={{ fontFamily: 'JetBrainsMono_400Regular' }}>
                          {new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </Text>
                      </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="flex-1 items-center justify-center py-12">
                <Text className="text-ink-soft font-medium">No messages yet</Text>
                <Text className="text-ink-soft text-[13px] mt-1">Start the conversation!</Text>
              </View>
            )}
          </ScrollView>

          <PlusMenu visible={showPlusMenu} onClose={() => setShowPlusMenu(false)} onPrompt={openPromptSheet} onImage={handlePickImage} />

          {/* Reply Preview Bar - V2 Style */}
          {replyToMessage && (
            <View className="flex-row items-center px-4 py-2 bg-sand border-t border-rule">
              <Reply size={16} color="#6B6760" />
              <View className="flex-1 ml-2">
                <Text className="text-[11px] text-ink-soft font-medium">
                  Replying to {replyToMessage.sender?.display_name || 'message'}
                </Text>
                <Text className="text-[13px] text-ink font-medium" numberOfLines={1}>
                  {replyToMessage.content}
                </Text>
              </View>
              <TouchableOpacity onPress={clearReply} className="p-1">
                <X size={18} color="#6B6760" />
              </TouchableOpacity>
            </View>
          )}

          {/* Input Bar - V2 Style */}
          <View className="flex-row items-end px-3 py-2 bg-background border-t border-rule gap-2">
            <TouchableOpacity onPress={() => setShowPlusMenu(!showPlusMenu)} activeOpacity={0.6} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2EBDD', alignItems: 'center', justifyContent: 'center', marginBottom: 1 }}>
              <Plus size={22} color="#6B6760" strokeWidth={2} />
            </TouchableOpacity>
            <TextInput
              style={{ flex: 1, borderRadius: 18, backgroundColor: '#F2EBDD', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, minHeight: 36, maxHeight: 100, fontSize: 15, fontWeight: '500', color: '#111111' }}
              placeholder={placeholder} placeholderTextColor="#6B6760" value={messageText} onChangeText={setMessageText} multiline maxLength={1000}
              onFocus={() => setShowPlusMenu(false)}
            />
            <TouchableOpacity onPress={handleSend} disabled={!messageText.trim()} activeOpacity={0.6} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: messageText.trim() ? '#111111' : '#F2EBDD', alignItems: 'center', justifyContent: 'center', marginBottom: 1 }}>
              <ArrowUp size={20} color={messageText.trim() ? '#fff' : '#6B6760'} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {showPlusMenu && <Pressable className="absolute inset-0" style={{ zIndex: 40 }} onPress={() => setShowPlusMenu(false)} />}

      {/* New Prompt Bottom Sheet - V2 Style */}
      <BottomSheet ref={bottomSheetRef} index={-1} snapPoints={snapPoints} enablePanDownToClose backdropComponent={renderBackdrop} onChange={handleSheetChange} handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 40 }} backgroundStyle={{ borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FBFAF7' }}>
        <BottomSheetView className="flex-1 px-5">
          <View className="flex-row items-center justify-between py-2 mb-2">
            <TouchableOpacity onPress={closePromptSheet}><Text className="text-[15px] text-ink-soft font-medium">Cancel</Text></TouchableOpacity>
            <Text className="text-lg font-extrabold text-ink" style={{ letterSpacing: -0.5 }}>New Prompt</Text>
            <TouchableOpacity onPress={handlePost} disabled={creating || !canPost()}>
              <Text className={`text-[15px] font-bold ${canPost() && !creating ? 'text-blue' : 'text-ink-soft'}`}>{creating ? 'Posting...' : 'Post'}</Text>
            </TouchableOpacity>
          </View>
          <View className="mb-3">
            <View className="flex-row bg-sand rounded-full p-1">
              {(['basic', 'debate', 'draw'] as PromptType[]).map((type) => (
                <TouchableOpacity key={type} onPress={() => setPromptType(type)} className={`flex-1 py-2.5 rounded-full items-center ${promptType === type ? 'bg-ink' : ''}`} activeOpacity={0.7}>
                  <Text className={`font-bold text-[13px] capitalize ${promptType === type ? 'text-white' : 'text-ink-soft'}`}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-[11px] text-ink-soft font-medium text-center mt-2">{typeDescriptions[promptType]}</Text>
          </View>

          {promptType === 'debate' ? (
            <View>
              <TextInput className="border-2 border-ink rounded-[18px] px-4 py-4 text-[15px] font-medium text-ink min-h-[80px]" placeholder="Which is better: morning workouts or evening workouts?" placeholderTextColor="#6B6760" value={debateQuestion} onChangeText={setDebateQuestion} multiline textAlignVertical="top" maxLength={200} />
              <Text className="text-[11px] text-ink-soft font-medium mt-1.5 mb-4 text-right">{debateQuestion.length}/200</Text>
              <Text className="text-[15px] font-bold text-ink mb-2">Options</Text>
              {debateOptions.map((option, index) => (
                <View key={index} className="flex-row items-center mb-3">
                  <Text className="text-[13px] font-bold text-ink-soft w-6">{String.fromCharCode(65 + index)}</Text>
                  <TextInput className="flex-1 bg-sand rounded-[14px] px-4 py-3 text-[15px] font-medium text-ink" placeholder={`Option ${String.fromCharCode(65 + index)}`} placeholderTextColor="#6B6760" value={option} onChangeText={(t) => { const u = [...debateOptions]; u[index] = t; setDebateOptions(u); }} maxLength={80} />
                  {debateOptions.length > 2 && <TouchableOpacity onPress={() => setDebateOptions(debateOptions.filter((_, i) => i !== index))} className="ml-2"><X size={18} color="#6B6760" /></TouchableOpacity>}
                </View>
              ))}
              {debateOptions.length < 6 && <TouchableOpacity onPress={() => setDebateOptions([...debateOptions, ''])} className="mb-12"><Text className="text-[13px] font-bold text-ink-soft">+ Add option</Text></TouchableOpacity>}
            </View>
          ) : promptType === 'draw' ? (
            <View>
              <TextInput className="border-2 border-ink rounded-[18px] px-4 py-4 text-[15px] font-medium text-ink min-h-[80px]" placeholder="What should everyone draw?" placeholderTextColor="#6B6760" value={promptText} onChangeText={setPromptText} multiline textAlignVertical="top" maxLength={200} />
              <Text className="text-[11px] text-ink-soft font-medium mt-1.5 mb-4 text-right">{promptText.length}/200</Text>
              <Text className="text-[15px] font-bold text-ink mb-3">Canvas</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => { setDrawCanvas('blank'); setDrawImageUri(null); }}
                  className={`flex-1 aspect-square rounded-[18px] border-2 items-center justify-center ${drawCanvas === 'blank' ? 'border-ink bg-card' : 'border-rule bg-sand'}`}
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-[14px] border-2 border-dashed border-ink-soft items-center justify-center mb-2">
                    <Pencil size={18} color="#6B6760" />
                  </View>
                  <Text className={`text-[13px] font-bold ${drawCanvas === 'blank' ? 'text-ink' : 'text-ink-soft'}`}>Blank Canvas</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
                    if (!result.canceled) { setDrawImageUri(result.assets[0].uri); setDrawCanvas('image'); }
                  }}
                  className={`flex-1 aspect-square rounded-[18px] border-2 items-center justify-center overflow-hidden ${drawCanvas === 'image' ? 'border-ink' : 'border-rule bg-sand'}`}
                  activeOpacity={0.7}
                >
                  {drawImageUri ? (
                    <Image source={{ uri: drawImageUri }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <>
                      <View className="w-10 h-10 rounded-[14px] bg-rule items-center justify-center mb-2">
                        <LucideImage size={18} color="#6B6760" />
                      </View>
                      <Text className={`text-[13px] font-bold ${drawCanvas === 'image' ? 'text-ink' : 'text-ink-soft'}`}>Upload Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <TextInput className="border-2 border-ink rounded-[18px] px-4 py-4 text-[15px] font-medium text-ink min-h-[120px]" placeholder="What's something that changed your perspective recently?" placeholderTextColor="#6B6760" value={promptText} onChangeText={setPromptText} multiline textAlignVertical="top" maxLength={200} />
              <Text className="text-[11px] text-ink-soft font-medium mt-2 text-right">{promptText.length}/200</Text>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>

      {/* Chat Settings Bottom Sheet */}
      <BottomSheet
        ref={settingsSheetRef}
        index={-1}
        snapPoints={['70%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 40 }}
        backgroundStyle={{ borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FBFAF7' }}
      >
        <BottomSheetView className="flex-1 px-5">
          <View className="flex-row items-center justify-between py-2 mb-4">
            <Text className="text-lg font-extrabold text-ink" style={{ letterSpacing: -0.5 }}>Chat Settings</Text>
            <TouchableOpacity onPress={() => settingsSheetRef.current?.close()}>
              <X size={22} color="#6B6760" />
            </TouchableOpacity>
          </View>

          {/* Settings Tabs */}
          <View className="flex-row bg-sand rounded-full p-1 mb-4">
            {(['settings', 'media', 'prompts'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setSettingsTab(tab)}
                className={`flex-1 py-2.5 rounded-full items-center ${settingsTab === tab ? 'bg-ink' : ''}`}
                activeOpacity={0.7}
              >
                <Text className={`font-bold text-[13px] capitalize ${settingsTab === tab ? 'text-white' : 'text-ink-soft'}`}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Settings Tab Content */}
          {settingsTab === 'settings' && (
            <View>
              {/* Notifications Toggle */}
              <TouchableOpacity
                className="flex-row items-center py-4 border-b border-rule"
                onPress={() => {
                  setNotificationsEnabled(!notificationsEnabled);
                  toast.success(notificationsEnabled ? 'Notifications muted' : 'Notifications enabled');
                }}
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-full bg-sand items-center justify-center">
                  {notificationsEnabled ? (
                    <Bell size={20} color="#111111" />
                  ) : (
                    <BellOff size={20} color="#6B6760" />
                  )}
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-[15px] font-bold text-ink">Notifications</Text>
                  <Text className="text-[12px] text-ink-soft">
                    {notificationsEnabled ? 'Enabled' : 'Muted'}
                  </Text>
                </View>
                <View className={`w-12 h-7 rounded-full p-0.5 ${notificationsEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <View className={`w-6 h-6 rounded-full bg-white ${notificationsEnabled ? 'ml-auto' : ''}`} />
                </View>
              </TouchableOpacity>

              {/* Show Prompts Toggle */}
              <TouchableOpacity
                className="flex-row items-center py-4 border-b border-rule"
                onPress={() => {
                  setShowPromptsInChat(!showPromptsInChat);
                  toast.success(showPromptsInChat ? 'Prompts hidden in chat' : 'Prompts visible in chat');
                }}
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-full bg-sand items-center justify-center">
                  {showPromptsInChat ? (
                    <Eye size={20} color="#111111" />
                  ) : (
                    <EyeOff size={20} color="#6B6760" />
                  )}
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-[15px] font-bold text-ink">Show Prompts</Text>
                  <Text className="text-[12px] text-ink-soft">
                    {showPromptsInChat ? 'Prompts visible in chat' : 'Prompts hidden'}
                  </Text>
                </View>
                <View className={`w-12 h-7 rounded-full p-0.5 ${showPromptsInChat ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <View className={`w-6 h-6 rounded-full bg-white ${showPromptsInChat ? 'ml-auto' : ''}`} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Media Tab Content */}
          {settingsTab === 'media' && (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {(() => {
                const mediaMessages = messages?.filter(m => m.media_url) || [];
                const linkMessages = messages?.filter(m =>
                  !m.content.startsWith(PROMPT_PREFIX) &&
                  (m.content.includes('http://') || m.content.includes('https://'))
                ) || [];

                if (mediaMessages.length === 0 && linkMessages.length === 0) {
                  return (
                    <View className="py-12 items-center">
                      <ImageIcon size={40} color="#D1D5DB" />
                      <Text className="text-[15px] font-bold text-ink-soft mt-3">No media yet</Text>
                      <Text className="text-[13px] text-ink-soft mt-1">Shared photos and links will appear here</Text>
                    </View>
                  );
                }

                return (
                  <View>
                    {mediaMessages.length > 0 && (
                      <View className="mb-4">
                        <Text className="text-[12px] font-bold text-ink-soft uppercase tracking-widest mb-3">
                          Images ({mediaMessages.length})
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                          {mediaMessages.slice(0, 9).map((m) => (
                            <Image
                              key={m.id}
                              source={{ uri: m.media_url }}
                              className="w-[30%] aspect-square rounded-lg"
                            />
                          ))}
                        </View>
                      </View>
                    )}
                    {linkMessages.length > 0 && (
                      <View>
                        <Text className="text-[12px] font-bold text-ink-soft uppercase tracking-widest mb-3">
                          Links ({linkMessages.length})
                        </Text>
                        {linkMessages.slice(0, 5).map((m) => (
                          <View key={m.id} className="flex-row items-center py-2 border-b border-rule">
                            <Link size={16} color="#6B6760" />
                            <Text className="text-[14px] text-ink ml-2 flex-1" numberOfLines={1}>
                              {m.content}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()}
            </ScrollView>
          )}

          {/* Prompts Tab Content */}
          {settingsTab === 'prompts' && (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {(() => {
                const promptMessages = messages?.filter(m => decodePrompt(m.content)) || [];

                if (promptMessages.length === 0) {
                  return (
                    <View className="py-12 items-center">
                      <HelpCircle size={40} color="#D1D5DB" />
                      <Text className="text-[15px] font-bold text-ink-soft mt-3">No prompts yet</Text>
                      <Text className="text-[13px] text-ink-soft mt-1">Prompts shared in this chat will appear here</Text>
                    </View>
                  );
                }

                return (
                  <View>
                    <Text className="text-[12px] font-bold text-ink-soft uppercase tracking-widest mb-3">
                      {promptMessages.length} {promptMessages.length === 1 ? 'Prompt' : 'Prompts'}
                    </Text>
                    {promptMessages.map((m) => {
                      const prompt = decodePrompt(m.content);
                      if (!prompt) return null;
                      const typeConfig: Record<string, { bg: string; icon: any }> = {
                        general: { bg: '#F7DA21', icon: HelpCircle },
                        debate: { bg: '#8E73C9', icon: Swords },
                        draw: { bg: '#6AAA64', icon: Pencil },
                      };
                      const config = typeConfig[prompt.type] || typeConfig.general;
                      const Icon = config.icon;

                      return (
                        <TouchableOpacity
                          key={m.id}
                          className="flex-row items-center py-3 border-b border-rule"
                          activeOpacity={0.7}
                        >
                          <View
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{ backgroundColor: config.bg }}
                          >
                            <Icon size={18} color="white" />
                          </View>
                          <View className="flex-1 ml-3">
                            <Text className="text-[14px] font-bold text-ink" numberOfLines={1}>
                              {prompt.text}
                            </Text>
                            <Text className="text-[11px] text-ink-soft uppercase">
                              {prompt.type} · {new Date(m.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })()}
            </ScrollView>
          )}
        </BottomSheetView>
      </BottomSheet>

      {/* Reaction Picker */}
      <ReactionPicker
        visible={showReactionPicker}
        onClose={() => {
          setShowReactionPicker(false);
          setSelectedMessageId(null);
        }}
        onSelectEmoji={handleReactionSelect}
      />
    </SafeAreaView>
  );
}
