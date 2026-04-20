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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Users, UserMinus, SignOut, Check, Camera, X } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../../contexts/AuthContext';
import { useChat as useCircle, useChatMembers as useCircleMembers, useLeaveChat as useLeaveCircle, useUpdateChat as useUpdateCircle } from '../../../../hooks/useChats';
import { AddMembersModal } from '../../../../components/circles/AddMembersModal';
import { COLORS } from '../../../../lib/constants';

const CIRCLE_THEME_OPTIONS = [
  { name: 'Black', color: COLORS.circleThemes.black },
  { name: 'Blue', color: COLORS.circleThemes.blue },
  { name: 'Purple', color: COLORS.circleThemes.purple },
  { name: 'Pink', color: COLORS.circleThemes.pink },
  { name: 'Red', color: COLORS.circleThemes.red },
  { name: 'Orange', color: COLORS.circleThemes.orange },
  { name: 'Green', color: COLORS.circleThemes.green },
  { name: 'Teal', color: COLORS.circleThemes.teal },
];

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
  const [themeColor, setThemeColor] = useState(COLORS.circleThemes.black);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);

  const isAdmin = circle?.creator_id === user?.id;

  useEffect(() => {
    if (circle) {
      setCircleName(circle.name || '');
      setCircleDescription(circle.description || '');
      setCircleContext(circle.context || '');
      setThemeColor(circle.theme_color || COLORS.circleThemes.black);
      setAvatarUrl(circle.avatar_url || null);
    }
  }, [circle]);

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
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FFBF00" />
      </SafeAreaView>
    );
  }

  if (!circle) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-xl font-semibold text-gray-900 text-center mb-2 font-heading">
          Circle not found
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft weight="bold" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900 ml-3 font-heading">
          Circle Settings
        </Text>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Circle Info */}
          {isAdmin ? (
            <View className="mb-6">
              {/* Circle Avatar */}
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Circle Image
              </Text>
              <View className="flex-row items-center mb-4">
                <TouchableOpacity
                  onPress={handlePickAvatar}
                  className="relative"
                >
                  {avatarUrl ? (
                    <View>
                      <Image
                        source={{ uri: avatarUrl }}
                        className="w-20 h-20 rounded-full bg-gray-200"
                      />
                      <TouchableOpacity
                        onPress={handleRemoveAvatar}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                      >
                        <X weight="bold" size={14} color="white" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View
                      className="w-20 h-20 rounded-full items-center justify-center"
                      style={{ backgroundColor: themeColor }}
                    >
                      <Camera weight="bold" size={28} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
                <Text className="text-gray-500 text-sm ml-4 flex-1">
                  Tap to {avatarUrl ? 'change' : 'add'} circle image
                </Text>
              </View>

              <Text className="text-sm font-medium text-gray-700 mb-2">
                Circle Name
              </Text>
              <TextInput
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base mb-4"
                placeholder="Circle name"
                value={circleName}
                onChangeText={setCircleName}
              />

              <Text className="text-sm font-medium text-gray-700 mb-2">
                Description
              </Text>
              <TextInput
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base mb-4"
                placeholder="Description"
                value={circleDescription}
                onChangeText={setCircleDescription}
                multiline
                numberOfLines={3}
              />

              <Text className="text-sm font-medium text-gray-700 mb-2">
                Circle Context
              </Text>
              <TextInput
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
                placeholder="e.g., College friends who love hiking and travel..."
                value={circleContext}
                onChangeText={setCircleContext}
                multiline
                numberOfLines={3}
              />
              <Text className="text-gray-500 text-xs mt-1 mb-4">
                This context helps generate personalized AI prompts for your circle
              </Text>

              <Text className="text-sm font-medium text-gray-700 mb-3">
                Theme Color
              </Text>
              <View className="flex-row flex-wrap gap-3 mb-2">
                {CIRCLE_THEME_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.name}
                    onPress={() => setThemeColor(option.color)}
                    className="items-center"
                  >
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center ${
                        themeColor === option.color ? 'border-2 border-gray-400' : ''
                      }`}
                      style={{ backgroundColor: option.color }}
                    >
                      {themeColor === option.color && (
                        <Check weight="bold" size={20} color="white" />
                      )}
                    </View>
                    <Text className="text-xs text-gray-600 mt-1">{option.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                className="bg-black rounded-lg p-4 mt-4"
                onPress={handleSaveSettings}
                disabled={updateCircle.isPending}
              >
                <Text className="text-white text-center font-semibold">
                  {updateCircle.isPending ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mb-6 p-4 bg-gray-50 rounded-lg">
              <Text className="text-lg font-semibold text-gray-900 mb-2 font-heading">
                {circle.name}
              </Text>
              {circle.description && (
                <Text className="text-gray-600">
                  {circle.description}
                </Text>
              )}
            </View>
          )}

          {/* Members Section */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-gray-900 font-heading">
                Members ({members?.length || 0})
              </Text>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => setShowAddMembersModal(true)}
                  className="bg-primary-100 rounded-lg px-3 py-1"
                >
                  <Text className="text-black font-medium text-sm">
                    Add
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {members && members.length > 0 ? (
              <View className="gap-2">
                {members.map((member: any, index: number) => (
                  <View
                    key={member.user_id || member.id || `member-${index}`}
                    className="flex-row items-center justify-between py-3 border-b border-gray-100"
                  >
                    <View className="flex-row items-center flex-1">
                      {member.user?.avatar_url ? (
                        <Image
                          source={{ uri: member.user.avatar_url }}
                          className="w-10 h-10 rounded-full bg-gray-300"
                        />
                      ) : (
                        <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center">
                          <Text className="text-gray-600 font-semibold">
                            {member.user?.display_name?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="ml-3 flex-1">
                        <Text className="font-semibold text-gray-900">
                          {member.user?.display_name}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          @{member.user?.username}
                        </Text>
                      </View>
                      {member.role === 'admin' && (
                        <View className="bg-primary-100 rounded px-2 py-1">
                          <Text className="text-xs text-black font-medium">
                            Admin
                          </Text>
                        </View>
                      )}
                    </View>
                    {isAdmin && member.user_id !== user?.id && (
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(member.user_id, member.user?.display_name)}
                        className="ml-3"
                      >
                        <UserMinus weight="bold" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-gray-50 rounded-lg p-6 items-center">
                <Users weight="bold" size={32} color="#9ca3af" />
                <Text className="text-gray-600 text-center mt-2">
                  No members yet
                </Text>
              </View>
            )}
          </View>

          {/* Leave Circle */}
          <TouchableOpacity
            onPress={handleLeaveCircle}
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex-row items-center justify-center"
          >
            <SignOut weight="bold" size={20} color="#ef4444" />
            <Text className="text-red-600 font-semibold ml-2">
              Leave Circle
            </Text>
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
