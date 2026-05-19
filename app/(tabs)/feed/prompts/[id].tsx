import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInRight, FadeInLeft } from 'react-native-reanimated';
import { ArrowLeft, Lock, MoreHorizontal, Pencil } from 'lucide-react-native';
import { useAuth } from '../../../../contexts/AuthContext';
import { usePromptById } from '../../../../hooks/usePrompt';
import { useUserResponse, useFriendsResponses, useToggleVisibility } from '../../../../hooks/useResponses';
import { usePublicResponsesByPrompt } from '../../../../hooks/usePublicFeed';
import { useBlockUser } from '../../../../hooks/useBlocks';
import { VisibilityToggle } from '../../../../components/common/VisibilityToggle';
import ReportModal from '../../../../components/modals/ReportModal';
import { toast } from '../../../../utils/toast';
import * as haptics from '../../../../utils/haptics';

// Avatar colors
const AVATAR_COLORS = ['#F26E5E', '#6AAA64', '#8E73C9', '#4F8FE0', '#C28F2C', '#1A6B5E'];
function getAvatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function formatTimeAgo(date: string) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function PromptDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: prompt, isLoading: promptLoading } = usePromptById(id);
  const { data: userResponse, refetch: refetchUserResponse } = useUserResponse(user?.id, id);
  const { data: friendsResponses, isLoading: friendsLoading } = useFriendsResponses(id, user?.id);
  const { data: publicResponses, isLoading: publicLoading } = usePublicResponsesByPrompt(id, user?.id);

  const [activeTab, setActiveTab] = useState<'friends' | 'public'>('friends');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);

  const blockUser = useBlockUser();
  const toggleVisibility = useToggleVisibility();

  const hasResponded = !!userResponse;
  const friendsCount = friendsResponses?.length || 0;
  const publicCount = publicResponses?.length || 0;

  const handleResponseMenu = (response: any) => {
    Alert.alert('Options', undefined, [
      {
        text: 'Report Response',
        onPress: () => {
          setSelectedResponse(response);
          setReportModalVisible(true);
        },
      },
      {
        text: 'Block User',
        style: 'destructive',
        onPress: () => handleBlockUser(response),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleBlockUser = (response: any) => {
    if (!user) return;
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${response.user?.display_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              haptics.heavyImpact();
              await blockUser.mutateAsync({
                blockerId: user.id,
                blockedId: response.user_id,
                reason: 'Blocked from response',
              });
              toast.success(`${response.user?.display_name} has been blocked`);
            } catch (error: any) {
              haptics.error();
              Alert.alert('Error', error.message || 'Failed to block user');
            }
          },
        },
      ]
    );
  };

  const handleToggleVisibility = async (newValue: boolean) => {
    if (!userResponse) return;
    try {
      await toggleVisibility.mutateAsync({
        responseId: userResponse.id,
        isVisible: newValue,
      });
      refetchUserResponse();
      toast.success(newValue ? 'Visible to friends' : 'Set to private');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update visibility');
    }
  };

  if (promptLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#F7DA21" />
      </SafeAreaView>
    );
  }

  if (!prompt) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-xl font-extrabold text-ink text-center mb-2">
          Prompt not found
        </Text>
      </SafeAreaView>
    );
  }

  const responses = activeTab === 'friends' ? friendsResponses : publicResponses;
  const isLoading = activeTab === 'friends' ? friendsLoading : publicLoading;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-5 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-sand rounded-full items-center justify-center"
        >
          <ArrowLeft size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <View className="flex-1 ml-3">
          <Text className="text-[11px] font-bold text-ink-soft uppercase tracking-widest">
            Daily Prompt
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Prompt Card */}
        <View className="px-5 mb-4">
          <View className="bg-primary rounded-[28px] p-5">
            <Text className="text-[10px] font-bold text-ink/60 uppercase tracking-widest mb-2">
              {prompt.active_date &&
                new Date(prompt.active_date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
            </Text>
            <Text className="text-[24px] font-extrabold text-ink leading-tight" style={{ letterSpacing: -0.5 }}>
              {prompt.text}
            </Text>
          </View>
        </View>

        {/* UNLOCK GATE - Show if user hasn't responded */}
        {!hasResponded && (
          <Animated.View entering={FadeIn.duration(300)} className="px-5 mb-6">
            <View className="bg-sand rounded-[20px] p-6 items-center">
              <View className="w-12 h-12 bg-card rounded-full items-center justify-center mb-3">
                <Lock size={24} color="#6B6B6B" />
              </View>
              <Text className="text-[18px] font-extrabold text-ink text-center mb-2">
                Answer to unlock responses
              </Text>
              <Text className="text-[14px] text-ink-soft text-center mb-4">
                Share your answer to see what others said
              </Text>
              <TouchableOpacity
                onPress={() => {
                  haptics.lightImpact();
                  router.push('/compose');
                }}
                className="bg-ink rounded-full px-6 py-3"
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-[15px]">Drop your answer</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* USER'S RESPONSE - Show if responded */}
        {hasResponded && userResponse && (
          <Animated.View entering={FadeIn.duration(300)} className="px-5 mb-4">
            <View className="bg-card rounded-[20px] border border-rule overflow-hidden">
              {/* Header */}
              <View className="flex-row items-center p-4 pb-2">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#6AAA64' }}
                >
                  <Text className="text-white font-bold">Y</Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-[15px] font-bold text-ink">You</Text>
                  <Text className="text-[12px] text-ink-soft">
                    {formatTimeAgo(userResponse.created_at)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/compose')}
                  className="bg-sand rounded-full px-3 py-1.5 flex-row items-center"
                >
                  <Pencil size={14} color="#1A1A1A" />
                  <Text className="text-ink font-bold text-[12px] ml-1.5">Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View className="px-4 pb-3">
                {userResponse.media_url && userResponse.media_type === 'image' && (
                  <Image
                    source={{ uri: userResponse.media_url }}
                    className="w-full rounded-[14px] mb-3"
                    style={{ aspectRatio: 4 / 3 }}
                    resizeMode="cover"
                  />
                )}
                {userResponse.text_content && (
                  <Text className="text-[15px] text-ink leading-relaxed">
                    {userResponse.text_content}
                  </Text>
                )}
              </View>

              {/* Visibility Toggle */}
              <View className="px-4 pb-4 flex-row items-center justify-between border-t border-rule pt-3">
                <Text className="text-[11px] font-bold text-ink-soft uppercase tracking-widest">
                  Visibility
                </Text>
                <VisibilityToggle
                  isVisible={userResponse.is_visible}
                  onToggle={handleToggleVisibility}
                  disabled={toggleVisibility.isPending}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* TABS - Friends / Public */}
        {hasResponded && (
          <>
            <View className="px-5 mb-4">
              <View className="flex-row bg-sand rounded-full p-1">
                <TouchableOpacity
                  onPress={() => {
                    haptics.lightImpact();
                    setActiveTab('friends');
                  }}
                  className={`flex-1 py-2.5 rounded-full ${
                    activeTab === 'friends' ? 'bg-ink' : ''
                  }`}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-center font-bold text-[14px] ${
                      activeTab === 'friends' ? 'text-white' : 'text-ink-soft'
                    }`}
                  >
                    Friends · {friendsCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    haptics.lightImpact();
                    setActiveTab('public');
                  }}
                  className={`flex-1 py-2.5 rounded-full ${
                    activeTab === 'public' ? 'bg-ink' : ''
                  }`}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-center font-bold text-[14px] ${
                      activeTab === 'public' ? 'text-white' : 'text-ink-soft'
                    }`}
                  >
                    Public · {publicCount}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* RESPONSES LIST */}
            <View className="px-5">
              {isLoading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="small" color="#1A1A1A" />
                </View>
              ) : responses && responses.length > 0 ? (
                responses.map((response: any, index: number) => (
                  <Animated.View
                    key={response.id}
                    entering={activeTab === 'friends' ? FadeInLeft.delay(index * 50) : FadeInRight.delay(index * 50)}
                    className="mb-3"
                  >
                    <View className="bg-card rounded-[20px] border border-rule overflow-hidden">
                      {/* User Header */}
                      <View className="flex-row items-center p-4 pb-2">
                        {response.user?.avatar_url ? (
                          <Image
                            source={{ uri: response.user.avatar_url }}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <View
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{ backgroundColor: getAvatarColor(response.user?.display_name) }}
                          >
                            <Text className="text-white font-bold">
                              {response.user?.display_name?.[0]?.toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View className="flex-1 ml-3">
                          <Text className="text-[15px] font-bold text-ink">
                            {response.user?.display_name}
                          </Text>
                          <Text className="text-[12px] text-ink-soft">
                            @{response.user?.username} · {formatTimeAgo(response.created_at)}
                          </Text>
                        </View>
                        {response.user_id !== user?.id && (
                          <TouchableOpacity
                            onPress={() => handleResponseMenu(response)}
                            className="w-8 h-8 items-center justify-center"
                          >
                            <MoreHorizontal size={18} color="#6B6B6B" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Content */}
                      <View className="px-4 pb-4">
                        {response.media_url && response.media_type === 'image' && (
                          <Image
                            source={{ uri: response.media_url }}
                            className="w-full rounded-[14px] mb-3"
                            style={{ aspectRatio: 4 / 3 }}
                            resizeMode="cover"
                          />
                        )}
                        {response.text_content && (
                          <Text className="text-[15px] text-ink leading-relaxed">
                            {response.text_content}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Animated.View>
                ))
              ) : (
                <View className="bg-sand rounded-[20px] p-8 items-center">
                  <Text className="text-[15px] font-medium text-ink-soft text-center">
                    {activeTab === 'friends'
                      ? 'No friends have responded yet'
                      : 'No public responses yet'}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Report Modal */}
      {selectedResponse && (
        <ReportModal
          visible={reportModalVisible}
          onClose={() => {
            setReportModalVisible(false);
            setSelectedResponse(null);
          }}
          contentType="response"
          contentId={selectedResponse.id}
          reportedUserId={selectedResponse.user_id}
        />
      )}
    </SafeAreaView>
  );
}
