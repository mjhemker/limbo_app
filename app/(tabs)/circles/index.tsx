import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useMyGroupChats as useMyCircles } from '../../../hooks/useChats';
import { useConversations, useSuggestedConversations } from '../../../hooks/useMessages';
import { useProfile } from '../../../hooks/useProfile';
import { CircleCreationModal } from '../../../components/circles/CircleCreationModal';
import * as haptics from '../../../utils/haptics';
import { PROMPT_PREFIX } from '../../../components/chat/ChatView';

// V2 color palette for circles grid
const CIRCLE_COLORS = ['#F7DA21', '#6AAA64', '#F26E5E', '#4F8FE0', '#8E73C9', '#C28F2C', '#1A6B5E', '#F2A93B'];
const AVATAR_COLORS = ['#F26E5E', '#6AAA64', '#8E73C9', '#4F8FE0', '#C28F2C', '#1A1A1A'];

function getCircleColor(index: number, themeColor?: string) {
  if (themeColor) return themeColor;
  return CIRCLE_COLORS[index % CIRCLE_COLORS.length];
}

function getAvatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function isLightColor(color: string) {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

function formatTimeAgo(date: string) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * (5 / 4);

// Helper to get display preview for last message (handles ::PROMPT:: encoding)
function getMessagePreview(content?: string): string {
  if (!content) return 'Start a conversation';
  if (content.startsWith(PROMPT_PREFIX)) {
    try {
      const promptData = JSON.parse(content.slice(PROMPT_PREFIX.length));
      return `📋 ${promptData.text || 'Prompt'}`;
    } catch {
      return 'Prompt';
    }
  }
  return content;
}

// Circle Card Component
function CircleCard({ circle, index, onPress }: { circle: any; index: number; onPress: () => void }) {
  const bgColor = getCircleColor(index, circle.theme_color);
  const isDark = !isLightColor(bgColor);
  const textColor = isDark ? 'text-white' : 'text-ink';
  const softTextColor = isDark ? 'text-white/70' : 'text-ink/60';
  const badgeBg = isDark ? 'bg-white/25' : 'bg-black/10';
  const memberCount = circle.member_count || 0;
  const unreadCount = circle.new_count || circle.today_count || circle.unread_count || 0;
  const isAdmin = circle.is_admin || circle.role === 'admin';
  const initial = circle.name?.[0]?.toUpperCase() || 'C';

  return (
    <TouchableOpacity
      className="rounded-[22px] overflow-hidden mb-3"
      style={{ backgroundColor: bgColor, width: CARD_WIDTH, height: CARD_HEIGHT }}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View className="absolute inset-0 items-center justify-center">
        <Text
          className="font-extrabold select-none leading-none"
          style={{ fontSize: 120, color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.07)' }}
        >
          {initial}
        </Text>
      </View>
      <View className="absolute inset-0 p-4 flex-col">
        <View className="flex-row items-start justify-between">
          <Text className={`text-[17px] font-extrabold leading-tight flex-1 mr-2 ${textColor}`} numberOfLines={2}>
            {circle.name}
          </Text>
          {isAdmin && (
            <View className={`${badgeBg} rounded-full px-2 py-0.5`}>
              <Text className={`text-[9px] font-extrabold uppercase tracking-wide ${textColor}`}>Admin</Text>
            </View>
          )}
        </View>
        <View className="flex-1" />
        <View className="flex-row items-center justify-between">
          <Text className={`text-[12px] font-semibold ${softTextColor}`}>{memberCount} members</Text>
          {unreadCount > 0 && (
            <View className="bg-coral px-2 py-0.5 rounded-full">
              <Text className="text-white text-[10px] font-extrabold">{unreadCount} new</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// New Circle Card
function NewCircleCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      className="rounded-[22px] overflow-hidden mb-3 bg-sand"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(17,17,17,0.2)' }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="absolute inset-0 items-center justify-center">
        <Text className="font-extrabold select-none leading-none text-ink/20" style={{ fontSize: 80 }}>+</Text>
      </View>
      <View className="absolute inset-0 p-4 flex-col">
        <Text className="text-[17px] font-extrabold text-ink leading-tight">New Circle</Text>
        <View className="flex-1" />
        <Text className="text-[12px] font-semibold text-ink-soft">Create a group</Text>
      </View>
    </TouchableOpacity>
  );
}

// DM Conversation Item
function ConversationItem({ conversation, onPress }: { conversation: any; onPress: () => void }) {
  const otherUser = conversation.partner;
  const hasUnread = conversation.unreadCount > 0;

  // Use display_name if available, otherwise fall back to username
  const displayName = otherUser?.display_name || otherUser?.username || 'Unknown';
  const avatarInitial = (otherUser?.display_name?.[0] || otherUser?.username?.[0] || '?').toUpperCase();
  const messagePreview = getMessagePreview(conversation.lastMessage?.content);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center py-3 px-5"
      activeOpacity={0.7}
    >
      {otherUser?.avatar_url ? (
        <Image source={{ uri: otherUser.avatar_url }} className="w-12 h-12 rounded-full" />
      ) : (
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: getAvatarColor(displayName) }}
        >
          <Text className="text-white font-bold text-[18px]">
            {avatarInitial}
          </Text>
        </View>
      )}
      <View className="flex-1 ml-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>
            {displayName}
          </Text>
          <Text className="text-[12px] text-ink-soft">
            {conversation.lastMessage?.created_at ? formatTimeAgo(conversation.lastMessage.created_at) : ''}
          </Text>
        </View>
        <View className="flex-row items-center justify-between mt-0.5">
          <Text className="text-[14px] text-ink-soft flex-1 mr-2" numberOfLines={1}>
            {messagePreview}
          </Text>
          {hasUnread && (
            <View className="w-2.5 h-2.5 rounded-full bg-coral" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CirclesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'circles' | 'dms'>('circles');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: circles, isLoading: circlesLoading, refetch: refetchCircles } = useMyCircles(user?.id);
  const { data: conversations, isLoading: dmsLoading, refetch: refetchDms } = useConversations(user?.id);
  const { data: limboFriends, refetch: refetchLimbo } = useSuggestedConversations(user?.id);
  const { data: profile } = useProfile(user?.id);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCircles(), refetchDms(), refetchLimbo()]);
    setRefreshing(false);
  };

  const circleCount = circles?.length || 0;
  // Filter to only show DM type conversations (not groups)
  const dmConversations = conversations?.filter((c: any) => c.chat?.type === 'dm') || [];
  const conversationCount = dmConversations.length;
  const unreadDms = dmConversations.filter((c: any) => c.unreadCount > 0).length;

  // Split circles into columns
  const leftColumn: any[] = [];
  const rightColumn: any[] = [];
  circles?.forEach((circle: any, index: number) => {
    if (index % 2 === 0) leftColumn.push({ ...circle, originalIndex: index });
    else rightColumn.push({ ...circle, originalIndex: index });
  });
  const newCircleInLeft = circleCount % 2 === 0;

  const isLoading = activeTab === 'circles' ? circlesLoading : dmsLoading;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-2 pb-3">
        <Text className="text-[28px] font-extrabold text-ink" style={{ letterSpacing: -0.5 }}>
          Messages
        </Text>
      </View>

      {/* Segmented Toggle: Circles / DMs */}
      <View className="px-5 mb-4">
        <View className="flex-row bg-sand rounded-full p-1">
          <TouchableOpacity
            onPress={() => {
              haptics.lightImpact();
              setActiveTab('circles');
            }}
            className={`flex-1 py-2.5 rounded-full ${activeTab === 'circles' ? 'bg-ink' : ''}`}
            activeOpacity={0.8}
          >
            <Text className={`text-center font-bold text-[14px] ${activeTab === 'circles' ? 'text-white' : 'text-ink-soft'}`}>
              Circles
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              haptics.lightImpact();
              setActiveTab('dms');
            }}
            className={`flex-1 py-2.5 rounded-full ${activeTab === 'dms' ? 'bg-ink' : ''}`}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center justify-center">
              <Text className={`text-center font-bold text-[14px] ${activeTab === 'dms' ? 'text-white' : 'text-ink-soft'}`}>
                DMs
              </Text>
              {unreadDms > 0 && (
                <View className="ml-1.5 w-5 h-5 rounded-full bg-coral items-center justify-center">
                  <Text className="text-white text-[10px] font-bold">{unreadDms}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F7DA21" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* CIRCLES TAB */}
          {activeTab === 'circles' && (
            <>
              <View className="px-5 mb-3">
                <Text className="text-[12px] font-bold text-ink-soft uppercase tracking-widest">
                  {circleCount} {circleCount === 1 ? 'circle' : 'circles'}
                </Text>
              </View>
              {circles && circles.length > 0 ? (
                <View className="px-5">
                  <View className="flex-row">
                    <View className="flex-1 mr-1.5">
                      {leftColumn.map((circle) => (
                        <CircleCard
                          key={circle.id}
                          circle={circle}
                          index={circle.originalIndex}
                          onPress={() => router.push(`/(tabs)/circles/${circle.id}`)}
                        />
                      ))}
                      {newCircleInLeft && <NewCircleCard onPress={() => setShowCreateModal(true)} />}
                    </View>
                    <View className="flex-1 ml-1.5">
                      {rightColumn.map((circle) => (
                        <CircleCard
                          key={circle.id}
                          circle={circle}
                          index={circle.originalIndex}
                          onPress={() => router.push(`/(tabs)/circles/${circle.id}`)}
                        />
                      ))}
                      {!newCircleInLeft && <NewCircleCard onPress={() => setShowCreateModal(true)} />}
                    </View>
                  </View>
                </View>
              ) : (
                <View className="px-5">
                  <View className="flex-row">
                    <View className="flex-1 mr-1.5">
                      <NewCircleCard onPress={() => setShowCreateModal(true)} />
                    </View>
                    <View className="flex-1 ml-1.5" />
                  </View>
                </View>
              )}
            </>
          )}

          {/* DMS TAB */}
          {activeTab === 'dms' && (
            <>
              <View className="px-5 mb-2 flex-row items-center justify-between">
                <Text className="text-[12px] font-bold text-ink-soft uppercase tracking-widest">
                  Inbox · {conversationCount}
                </Text>
                {unreadDms > 0 && (
                  <Text className="text-[12px] font-bold text-coral">{unreadDms} unread</Text>
                )}
              </View>
              {dmConversations.length > 0 ? (
                <View>
                  {dmConversations.map((conversation: any, index: number) => (
                    <ConversationItem
                      key={conversation.chat?.id || `conv-${index}`}
                      conversation={conversation}
                      onPress={() => router.push(`/(tabs)/messages/${conversation.partner?.id}`)}
                    />
                  ))}
                </View>
              ) : (
                <View className="px-5 py-8">
                  <View className="bg-sand rounded-[20px] p-6 items-center">
                    <Text className="text-[16px] font-extrabold text-ink text-center mb-2">
                      No messages yet
                    </Text>
                    <Text className="text-[14px] text-ink-soft text-center">
                      Start a conversation with a friend
                    </Text>
                  </View>
                </View>
              )}

              {/* Limbo Zone - Friends not messaged in 30 days */}
              {limboFriends && limboFriends.length > 0 && (
                <View className="mt-6 px-5">
                  <View className="flex-row items-center mb-3">
                    <Text className="text-[12px] font-bold text-coral uppercase tracking-widest">
                      🌀 Limbo Zone
                    </Text>
                    <Text className="text-[11px] text-ink-soft ml-2">
                      · {limboFriends.length} {limboFriends.length === 1 ? 'friend' : 'friends'}
                    </Text>
                  </View>
                  <View className="bg-coral/10 rounded-[16px] p-3 mb-3">
                    <Text className="text-[12px] text-ink-soft text-center">
                      Friends you haven't chatted with in 30 days
                    </Text>
                  </View>
                  {limboFriends.slice(0, 5).map((item: any, index: number) => {
                    const friend = item.friend;
                    const displayName = friend?.display_name || friend?.username || 'Unknown';
                    const avatarInitial = (friend?.display_name?.[0] || friend?.username?.[0] || '?').toUpperCase();

                    return (
                      <TouchableOpacity
                        key={item.friendshipId || friend?.id || index}
                        onPress={() => router.push(`/(tabs)/messages/${friend?.id}`)}
                        className="flex-row items-center py-3 border-b border-rule"
                        activeOpacity={0.7}
                      >
                        {friend?.avatar_url ? (
                          <Image source={{ uri: friend.avatar_url }} className="w-10 h-10 rounded-full" />
                        ) : (
                          <View
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{ backgroundColor: getAvatarColor(displayName) }}
                          >
                            <Text className="text-white font-bold">{avatarInitial}</Text>
                          </View>
                        )}
                        <View className="flex-1 ml-3">
                          <Text className="text-[15px] font-bold text-ink">{displayName}</Text>
                          <Text className="text-[12px] text-ink-soft">Rescue them from limbo!</Text>
                        </View>
                        <View className="flex-row items-center">
                          <Text className="text-[13px] font-bold text-coral mr-1">rescue</Text>
                          <ArrowRight size={14} color="#F26E5E" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      <CircleCreationModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </SafeAreaView>
  );
}
