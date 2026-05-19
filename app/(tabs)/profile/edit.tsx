import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera, QrCode, LogOut, FileText, Shield, Trash2, Ban } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfile, useUpdateProfile } from '../../../hooks/useProfile';
import { useTheme } from '../../../contexts/ThemeContext';

// V2 Avatar colors
const AVATAR_COLORS = ['#F26E5E', '#6AAA64', '#8E73C9', '#4F8FE0', '#C28F2C'];

function getAvatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const updateProfile = useUpdateProfile();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setPhoneNumber(profile.phone_number || '');
      setAvatarUri(profile.avatar_url || null);
      setSmsOptIn(profile.sms_opt_in || false);
    }
  }, [profile]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const avatarFile =
        avatarUri && avatarUri !== profile.avatar_url
          ? {
              uri: avatarUri,
              type: 'image/jpeg',
              name: 'avatar.jpg',
            }
          : undefined;

      await updateProfile.mutateAsync({
        userId: user.id,
        updates: {
          display_name: displayName,
          bio,
          phone_number: phoneNumber,
          sms_opt_in: smsOptIn,
          email: user.email!,
        },
        avatarFile,
      });

      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone. All your data, including posts, messages, and profile information will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete your account. Type "DELETE" to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I Understand, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      router.replace('/auth/login');
                    } catch (error: any) {
                      Alert.alert(
                        'Error',
                        error.message || 'Failed to delete account. Please try again or contact support.'
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleShowQR = () => {
    Alert.alert('QR Code', 'QR code display coming soon');
  };

  const avatarColor = getAvatarColor(displayName);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F7DA21" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* V2 Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-rule">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ChevronLeft size={24} color="#111111" strokeWidth={2} />
        </TouchableOpacity>
        <Text className="text-lg font-extrabold text-ink" style={{ letterSpacing: -0.5 }}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text className={`text-[15px] font-bold ${saving ? 'text-ink-soft' : 'text-blue'}`}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        bounces={true}
        showsVerticalScrollIndicator={true}
      >
        <View className="px-5 pt-6">
          {/* Avatar - V2 Style */}
          <View className="items-center mb-8">
            <TouchableOpacity onPress={pickImage} className="relative">
              <View className="rounded-full p-1" style={{ backgroundColor: avatarColor }}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    className="w-24 h-24 rounded-full bg-sand border-4 border-background"
                  />
                ) : (
                  <View
                    className="w-24 h-24 rounded-full items-center justify-center border-4 border-background"
                    style={{ backgroundColor: avatarColor }}
                  >
                    <Text className="text-white text-3xl font-extrabold">
                      {displayName?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View className="absolute bottom-0 right-0 bg-ink rounded-full p-2.5">
                <Camera size={16} color="white" />
              </View>
            </TouchableOpacity>
            <Text className="text-[13px] text-ink-soft font-medium mt-3">Tap to change photo</Text>
          </View>

          {/* Display Name - V2 Style */}
          <View className="mb-4">
            <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>Display Name</Text>
            <TextInput
              className="w-full px-4 py-4 bg-sand border border-rule rounded-[14px] text-[15px] text-ink font-medium"
              placeholder="Your name"
              placeholderTextColor="#6B6760"
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          {/* Username (Read-only) - V2 Style */}
          <View className="mb-4">
            <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>Username</Text>
            <View className="w-full px-4 py-4 bg-sand/50 border border-rule rounded-[14px]">
              <Text className="text-[15px] text-ink-soft font-medium">@{profile?.username}</Text>
            </View>
            <Text className="text-[11px] text-ink-soft font-medium mt-1.5 ml-1">
              Username cannot be changed
            </Text>
          </View>

          {/* Bio - V2 Style */}
          <View className="mb-4">
            <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>Bio</Text>
            <TextInput
              className="w-full px-4 py-4 bg-sand border border-rule rounded-[14px] text-[15px] text-ink font-medium"
              placeholder="Tell us about yourself"
              placeholderTextColor="#6B6760"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </View>

          {/* Phone Number - V2 Style */}
          <View className="mb-6">
            <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>Phone Number</Text>
            <TextInput
              className="w-full px-4 py-4 bg-sand border border-rule rounded-[14px] text-[15px] text-ink font-medium"
              placeholder="+1234567890"
              placeholderTextColor="#6B6760"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          {/* Theme Settings - V2 Style */}
          <View className="mb-6">
            <Text className="text-[15px] font-extrabold text-ink mb-3" style={{ letterSpacing: -0.3 }}>
              Appearance
            </Text>

            <View className="bg-sand border border-rule rounded-[18px] overflow-hidden">
              <TouchableOpacity
                onPress={() => setTheme('light')}
                className="flex-row items-center justify-between p-4 border-b border-rule"
              >
                <Text className="font-bold text-ink text-[14px]">Light</Text>
                {theme === 'light' && (
                  <View className="w-5 h-5 rounded-full bg-ink items-center justify-center">
                    <Text className="text-white text-[10px] font-bold">✓</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTheme('dark')}
                className="flex-row items-center justify-between p-4 border-b border-rule"
              >
                <Text className="font-bold text-ink text-[14px]">Dark</Text>
                {theme === 'dark' && (
                  <View className="w-5 h-5 rounded-full bg-ink items-center justify-center">
                    <Text className="text-white text-[10px] font-bold">✓</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTheme('system')}
                className="flex-row items-center justify-between p-4"
              >
                <View>
                  <Text className="font-bold text-ink text-[14px]">System</Text>
                  <Text className="text-[12px] text-ink-soft font-medium">Match device theme</Text>
                </View>
                {theme === 'system' && (
                  <View className="w-5 h-5 rounded-full bg-ink items-center justify-center">
                    <Text className="text-white text-[10px] font-bold">✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Notification Settings - V2 Style */}
          <View className="mb-6">
            <Text className="text-[15px] font-extrabold text-ink mb-3" style={{ letterSpacing: -0.3 }}>
              Notifications
            </Text>

            <View className="bg-sand border border-rule rounded-[18px] overflow-hidden">
              <View className="flex-row items-center justify-between p-4 border-b border-rule">
                <View className="flex-1 mr-4">
                  <Text className="font-bold text-ink text-[14px]">SMS Notifications</Text>
                  <Text className="text-[12px] text-ink-soft font-medium">Receive daily prompts via text</Text>
                </View>
                <Switch
                  value={smsOptIn}
                  onValueChange={setSmsOptIn}
                  trackColor={{ false: '#E5E0D5', true: '#F7DA21' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View className="flex-row items-center justify-between p-4">
                <View className="flex-1 mr-4">
                  <Text className="font-bold text-ink text-[14px]">Push Notifications</Text>
                  <Text className="text-[12px] text-ink-soft font-medium">Receive app notifications</Text>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  trackColor={{ false: '#E5E0D5', true: '#F7DA21' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* QR Code - V2 Style */}
          <TouchableOpacity
            onPress={handleShowQR}
            className="bg-primary rounded-[18px] p-4 flex-row items-center justify-between mb-6"
          >
            <View className="flex-1">
              <Text className="font-bold text-ink text-[14px]">My QR Code</Text>
              <Text className="text-[12px] text-ink/70 font-medium">Share your profile with friends</Text>
            </View>
            <QrCode size={24} color="#111111" />
          </TouchableOpacity>

          {/* Legal Section - V2 Style */}
          <View className="mb-6">
            <Text className="text-[15px] font-extrabold text-ink mb-3" style={{ letterSpacing: -0.3 }}>
              Legal
            </Text>

            <View className="bg-sand border border-rule rounded-[18px] overflow-hidden">
              <TouchableOpacity
                onPress={() => router.push('/privacy')}
                className="flex-row items-center justify-between p-4 border-b border-rule"
              >
                <View className="flex-row items-center flex-1">
                  <Shield size={18} color="#6B6760" />
                  <Text className="font-bold text-ink text-[14px] ml-3">Privacy Policy</Text>
                </View>
                <Text className="text-ink-soft text-[18px]">›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/terms')}
                className="flex-row items-center justify-between p-4"
              >
                <View className="flex-row items-center flex-1">
                  <FileText size={18} color="#6B6760" />
                  <Text className="font-bold text-ink text-[14px] ml-3">Terms of Service</Text>
                </View>
                <Text className="text-ink-soft text-[18px]">›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Section - V2 Style */}
          <View className="mb-6">
            <Text className="text-[15px] font-extrabold text-ink mb-3" style={{ letterSpacing: -0.3 }}>
              Account
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile/blocked-users')}
              className="bg-sand border border-rule rounded-[18px] p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <Ban size={18} color="#6B6760" />
                <Text className="font-bold text-ink text-[14px] ml-3">Blocked Users</Text>
              </View>
              <Text className="text-ink-soft text-[18px]">›</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Out - V2 Style */}
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-coral/10 border border-coral/20 rounded-[18px] p-4 flex-row items-center justify-center mb-4"
          >
            <LogOut size={18} color="#F26E5E" />
            <Text className="text-coral font-bold text-[14px] ml-2">Sign Out</Text>
          </TouchableOpacity>

          {/* Delete Account - V2 Style */}
          <TouchableOpacity
            onPress={handleDeleteAccount}
            className="bg-coral/20 border border-coral/30 rounded-[18px] p-4 flex-row items-center justify-center"
          >
            <Trash2 size={18} color="#DC2626" />
            <Text className="text-[#DC2626] font-bold text-[14px] ml-2">Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
