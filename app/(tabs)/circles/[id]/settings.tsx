import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Users, UserMinus, LogOut, Check, Camera, X, UserPlus, Bell, BellOff } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../../contexts/AuthContext';
import { useChat as useCircle, useChatMembers as useCircleMembers, useLeaveChat as useLeaveCircle, useUpdateChat as useUpdateCircle } from '../../../../hooks/useChats';
import { AddMembersModal } from '../../../../components/circles/AddMembersModal';
import { supabase } from '../../../../lib/supabase';

// V2 Theme color options
const CIRCLE_THEME_OPTIONS = [
  { name: 'Coral', color: '#F26E5E' },
  { name: 'Green', color: '#6AAA64' },
  { name: 'Purple', color: '#8E73C9' },
  { name: 'Blue', color: '#4F8FE0' },
  { name: 'Gold', color: '#C28F2C' },
  { name: 'Yellow', color: '#F7DA21' },
  { name: 'Ink', color: '#111111' },
];

// V2 Avatar colors
const AVATAR_COLORS = ['#F26E5E', '#6AAA64', '#8E73C9', '#4F8FE0', '#C28F2C'];

function getAvatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function CircleSettingsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: circle, isLoading: circleLoading } = useCircle(id);
  const { data: members, isLoading: membersLoading } = useCircleMembers(id);
  const leaveCircle = useLeaveCircle();
  const updateCircle = useUpdateCircle();

  const [circleName, setCircleName] = useState('');
  const [circleDescription, setCircleDescription] = useState('');
  const [circleContext, setCircleContext] = useState('');
  const [themeColor, setThemeColor] = useState('#111111');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const isAdmin = circle?.creator_id === user?.id;

  useEffect(() => {
    if (circle) {
      setCircleName(circle.name || '');
      setCircleDescription(circle.description || '');
      setCircleContext(circle.context || '');
      setThemeColor(circle.theme_color || '#111111');
      setAvatarUrl(circle.avatar_url || null);
    }
  }, [circle]);

  // Fetch notification status for this circle
  useEffect(() => {
    const fetchNotificationStatus = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase.rpc('get_circle_notification_status', {
          p_chat_id: id,
        });
        if (!error && data !== null) {
          setNotificationsEnabled(data);
        }
      } catch (error) {
        console.error('Failed to fetch notification status:', error);
      }
    };
    fetchNotificationStatus();
  }, [id]);

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!id) return;
    setNotificationsLoading(true);
    try {
      const { error } = await supabase.rpc('toggle_circle_notifications', {
        p_chat_id: id,
        p_enabled: enabled,
      });
      if (error) throw error;
      setNotificationsEnabled(enabled);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update notification settings');
      // Revert the toggle on error
      setNotificationsEnabled(!enabled);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
  };

  const handleSaveSettings = async () => {
    if (!circleName.trim()) {
      Alert.alert('Error', 'Circle name cannot be empty');
      return;
    }

    if (!id) return;

    try {
      await updateCircle.mutateAsync({
        chatId: id,
        updates: {
          name: circleName.trim(),
          description: circleDescription.trim() || null,
          context: circleContext.trim() || null,
          theme_color: themeColor,
          avatar_url: avatarUrl,
        },
      });
      Alert.alert('Success', 'Circle settings saved!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save settings');
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement remove member API
            Alert.alert('Info', 'Remove member API needs to be implemented in backend');
          },
        },
      ]
    );
  };

  const handleLeaveCircle = () => {
    Alert.alert(
      'Leave Circle',
      'Are you sure you want to leave this circle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!user || !id) return;
            try {
              await leaveCircle.mutateAsync({ chatId: id, userId: user.id });
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to leave circle');
            }
          },
        },
      ]
    );
  };

  if (circleLoading || membersLoading) {
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
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {/* V2 Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-rule">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ChevronLeft size={24} color="#111111" strokeWidth={2} />
        </TouchableOpacity>
        <Text className="text-lg font-extrabold text-ink" style={{ letterSpacing: -0.5 }}>Circle Settings</Text>
        {isAdmin && (
          <TouchableOpacity onPress={handleSaveSettings} disabled={updateCircle.isPending}>
            <Text className={`text-[15px] font-bold ${updateCircle.isPending ? 'text-ink-soft' : 'text-blue'}`}>
              {updateCircle.isPending ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        )}
        {!isAdmin && <View style={{ width: 40 }} />}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-6">
          {/* Circle Info - Admin can edit */}
          {isAdmin ? (
            <View className="mb-6">
              {/* Circle Avatar - V2 Style */}
              <View className="items-center mb-6">
                <TouchableOpacity onPress={handlePickAvatar} className="relative">
                  {avatarUrl ? (
                    <View>
                      <Image
                        source={{ uri: avatarUrl }}
                        className="w-24 h-24 rounded-[22px]"
                        style={{ backgroundColor: themeColor }}
                      />
                      <TouchableOpacity
                        onPress={handleRemoveAvatar}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-coral rounded-full items-center justify-center"
                      >
                        <X size={14} color="white" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View
                      className="w-24 h-24 rounded-[22px] items-center justify-center"
                      style={{ backgroundColor: themeColor }}
                    >
                      <Text className="text-white/20 text-[60px] font-extrabold" style={{ letterSpacing: -3 }}>
                        {circleName?.[0]?.toUpperCase() || 'C'}
                      </Text>
                      <View className="absolute">
                        <Camera size={28} color="white" />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
                <Text className="text-[13px] text-ink-soft font-medium mt-3">Tap to change image</Text>
              </View>

              {/* Circle Name - V2 Style */}
              <View className="mb-4">
                <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>Circle Name</Text>
                <TextInput
                  className="w-full px-4 py-4 bg-sand border border-rule rounded-[14px] text-[15px] text-ink font-medium"
                  placeholder="Circle name"
                  placeholderTextColor="#6B6760"
                  value={circleName}
                  onChangeText={setCircleName}
                />
              </View>

              {/* Description - V2 Style */}
              <View className="mb-4">
                <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>Description</Text>
                <TextInput
                  className="w-full px-4 py-4 bg-sand border border-rule rounded-[14px] text-[15px] text-ink font-medium"
                  placeholder="What's this circle about?"
                  placeholderTextColor="#6B6760"
                  value={circleDescription}
                  onChangeText={setCircleDescription}
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                />
              </View>

              {/* Context - V2 Style */}
              <View className="mb-6">
                <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>Circle Context</Text>
                <TextInput
                  className="w-full px-4 py-4 bg-sand border border-rule rounded-[14px] text-[15px] text-ink font-medium"
                  placeholder="e.g., College friends who love hiking..."
                  placeholderTextColor="#6B6760"
                  value={circleContext}
                  onChangeText={setCircleContext}
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                />
                <Text className="text-[11px] text-ink-soft font-medium mt-1.5 ml-1">
                  This helps generate personalized prompts for your circle
                </Text>
              </View>

              {/* Theme Color - V2 Style */}
              <View className="mb-6">
                <Text className="text-[15px] font-extrabold text-ink mb-3" style={{ letterSpacing: -0.3 }}>
                  Theme Color
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {CIRCLE_THEME_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.name}
                      onPress={() => setThemeColor(option.color)}
                      className="items-center"
                      activeOpacity={0.7}
                    >
                      <View
                        className={`w-12 h-12 rounded-full items-center justify-center ${
                          themeColor === option.color ? 'border-[3px] border-ink' : ''
                        }`}
                        style={{ backgroundColor: option.color }}
                      >
                        {themeColor === option.color && (
                          <Check size={20} color="white" strokeWidth={3} />
                        )}
                      </View>
                      <Text className="text-[11px] text-ink-soft font-medium mt-1.5">{option.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            /* Non-admin view */
            <View className="mb-6">
              <View className="items-center mb-4">
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    className="w-20 h-20 rounded-[18px]"
                    style={{ backgroundColor: themeColor }}
                  />
                ) : (
                  <View
                    className="w-20 h-20 rounded-[18px] items-center justify-center"
                    style={{ backgroundColor: themeColor }}
                  >
                    <Text className="text-white/20 text-[50px] font-extrabold" style={{ letterSpacing: -2 }}>
                      {circle.name?.[0]?.toUpperCase() || 'C'}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-xl font-extrabold text-ink text-center mb-1" style={{ letterSpacing: -0.5 }}>
                {circle.name}
              </Text>
              {circle.description && (
                <Text className="text-ink-soft font-medium text-center text-[14px]">
                  {circle.description}
                </Text>
              )}
            </View>
          )}

          {/* Members Section - V2 Style */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[15px] font-extrabold text-ink" style={{ letterSpacing: -0.3 }}>
                Members · {members?.length || 0}
              </Text>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => setShowAddMembersModal(true)}
                  className="bg-ink rounded-full px-4 py-2 flex-row items-center"
                  activeOpacity={0.7}
                >
                  <UserPlus size={14} color="white" strokeWidth={2} />
                  <Text className="text-white font-bold text-[12px] ml-1.5">Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {members && members.length > 0 ? (
              <View className="bg-sand border border-rule rounded-[18px] overflow-hidden">
                {members.map((member: any, index: number) => {
                  const avatarColor = getAvatarColor(member.user?.display_name);
                  const isLastItem = index === members.length - 1;

                  return (
                    <View
                      key={member.user_id || member.id || `member-${index}`}
                      className={`flex-row items-center p-4 ${!isLastItem ? 'border-b border-rule' : ''}`}
                    >
                      <TouchableOpacity
                        onPress={() => router.push(`/(tabs)/profile/${member.user_id}`)}
                        className="flex-row items-center flex-1"
                        activeOpacity={0.6}
                      >
                        {member.user?.avatar_url ? (
                          <Image
                            source={{ uri: member.user.avatar_url }}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <View
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{ backgroundColor: avatarColor }}
                          >
                            <Text className="text-white font-bold text-[14px]">
                              {member.user?.display_name?.[0]?.toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View className="ml-3 flex-1">
                          <View className="flex-row items-center">
                            <Text className="font-bold text-ink text-[14px]" style={{ letterSpacing: -0.2 }}>
                              {member.user?.display_name}
                            </Text>
                            {member.role === 'admin' && (
                              <View className="bg-primary rounded-full px-2 py-0.5 ml-2">
                                <Text className="text-ink text-[10px] font-bold">ADMIN</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-ink-soft font-medium text-[12px]">
                            @{member.user?.username}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {isAdmin && member.user_id !== user?.id && (
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(member.user_id, member.user?.display_name)}
                          className="bg-coral/10 rounded-full p-2 ml-2"
                          activeOpacity={0.7}
                        >
                          <UserMinus size={16} color="#F26E5E" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="bg-sand rounded-[18px] p-8 items-center">
                <View className="w-12 h-12 bg-background rounded-full items-center justify-center mb-3">
                  <Users size={24} color="#6B6760" />
                </View>
                <Text className="text-ink font-bold text-[14px] mb-1">No members yet</Text>
                <Text className="text-ink-soft font-medium text-[12px]">Add friends to get started</Text>
              </View>
            )}
          </View>

          {/* Notifications Toggle - V2 Style */}
          <View className="mb-6">
            <Text className="text-[15px] font-extrabold text-ink mb-3" style={{ letterSpacing: -0.3 }}>
              Notifications
            </Text>
            <View className="bg-sand border border-rule rounded-[18px] p-4 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                {notificationsEnabled ? (
                  <Bell size={20} color="#111111" />
                ) : (
                  <BellOff size={20} color="#6B6760" />
                )}
                <View className="ml-3 flex-1">
                  <Text className="font-bold text-ink text-[14px]" style={{ letterSpacing: -0.2 }}>
                    Circle Notifications
                  </Text>
                  <Text className="text-ink-soft font-medium text-[12px]">
                    {notificationsEnabled ? 'Get notified about messages and prompts' : 'Notifications are muted'}
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                disabled={notificationsLoading}
                trackColor={{ false: '#D1CEC7', true: '#6AAA64' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Leave Circle - V2 Style */}
          <TouchableOpacity
            onPress={handleLeaveCircle}
            className="bg-coral/10 border border-coral/20 rounded-[18px] p-4 flex-row items-center justify-center"
            activeOpacity={0.7}
          >
            <LogOut size={18} color="#F26E5E" />
            <Text className="text-coral font-bold text-[14px] ml-2">Leave Circle</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Members Modal */}
      <AddMembersModal
        visible={showAddMembersModal}
        onClose={() => setShowAddMembersModal(false)}
        circleId={id || ''}
      />
    </SafeAreaView>
  );
}
