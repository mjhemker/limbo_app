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
import { ArrowLeft, Camera, QrCode, LogOut, FileText, Shield, Moon, Code } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfile, useUpdateProfile } from '../../../hooks/useProfile';
import { useTheme } from '../../../contexts/ThemeContext';
import { env, getEnvironmentDisplayName, type Environment } from '../../../utils/env';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
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

  const handleShowQR = () => {
    Alert.alert('QR Code', 'QR code display coming soon');
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FFBF00" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text className="text-primary-600 font-semibold">
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Avatar */}
          <View className="items-center mb-6">
            <TouchableOpacity onPress={pickImage} className="relative">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  className="w-24 h-24 rounded-full bg-gray-300"
                />
              ) : (
                <View className="w-24 h-24 rounded-full bg-gray-300 items-center justify-center">
                  <Text className="text-gray-600 text-2xl font-semibold">
                    {displayName?.[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 bg-primary-500 rounded-full p-2">
                <Camera size={16} color="white" />
              </View>
            </TouchableOpacity>
            <Text className="text-sm text-gray-600 mt-2">Tap to change photo</Text>
          </View>

          {/* Display Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Display Name</Text>
            <TextInput
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
              placeholder="Your name"
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          {/* Username (Read-only) */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Username</Text>
            <View className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg">
              <Text className="text-base text-gray-600">@{profile?.username}</Text>
            </View>
            <Text className="text-xs text-gray-500 mt-1">
              Username cannot be changed
            </Text>
          </View>

          {/* Bio */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Bio</Text>
            <TextInput
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
              placeholder="Tell us about yourself"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Phone Number */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Phone Number</Text>
            <TextInput
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
              placeholder="+1234567890"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          {/* Theme Settings */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Appearance
            </Text>

            <View className="bg-gray-50 border border-gray-200 rounded-lg mb-4">
              <TouchableOpacity
                onPress={() => setTheme('light')}
                className={`flex-row items-center justify-between p-4 ${
                  theme === 'dark' || theme === 'system' ? 'border-b border-gray-200' : ''
                }`}
              >
                <View className="flex-1">
                  <Text className="font-medium text-gray-900">☀️ Light</Text>
                </View>
                {theme === 'light' && (
                  <View className="w-5 h-5 rounded-full bg-primary-500 items-center justify-center">
                    <Text className="text-white text-xs">✓</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTheme('dark')}
                className={`flex-row items-center justify-between p-4 ${
                  theme === 'system' ? 'border-b border-gray-200' : ''
                }`}
              >
                <View className="flex-1">
                  <Text className="font-medium text-gray-900">🌙 Dark</Text>
                </View>
                {theme === 'dark' && (
                  <View className="w-5 h-5 rounded-full bg-primary-500 items-center justify-center">
                    <Text className="text-white text-xs">✓</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTheme('system')}
                className="flex-row items-center justify-between p-4"
              >
                <View className="flex-1">
                  <Text className="font-medium text-gray-900">⚙️ System</Text>
                  <Text className="text-sm text-gray-600">Match device theme</Text>
                </View>
                {theme === 'system' && (
                  <View className="w-5 h-5 rounded-full bg-primary-500 items-center justify-center">
                    <Text className="text-white text-xs">✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Notification Settings */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Notifications
            </Text>

            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1">
                <Text className="font-medium text-gray-900">SMS Notifications</Text>
                <Text className="text-sm text-gray-600">
                  Receive daily prompts via text
                </Text>
              </View>
              <Switch
                value={smsOptIn}
                onValueChange={setSmsOptIn}
                trackColor={{ false: '#d1d5db', true: '#FFE082' }}
                thumbColor={smsOptIn ? '#FFBF00' : '#f3f4f6'}
              />
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-medium text-gray-900">Push Notifications</Text>
                <Text className="text-sm text-gray-600">
                  Receive app notifications
                </Text>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: '#d1d5db', true: '#FFE082' }}
                thumbColor={pushNotifications ? '#FFBF00' : '#f3f4f6'}
              />
            </View>
          </View>

          {/* QR Code */}
          <TouchableOpacity
            onPress={handleShowQR}
            className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex-row items-center justify-between mb-4"
          >
            <View className="flex-1">
              <Text className="font-semibold text-gray-900">My QR Code</Text>
              <Text className="text-sm text-gray-600">
                Share your profile with friends
              </Text>
            </View>
            <QrCode size={24} color="#FFBF00" />
          </TouchableOpacity>

          {/* Legal Section */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Legal
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/privacy')}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex-row items-center justify-between mb-3"
            >
              <View className="flex-1 flex-row items-center">
                <Shield size={20} color="#6b7280" />
                <Text className="font-medium text-gray-900 ml-3">Privacy Policy</Text>
              </View>
              <Text className="text-gray-400">›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/terms')}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex-row items-center justify-between"
            >
              <View className="flex-1 flex-row items-center">
                <FileText size={20} color="#6b7280" />
                <Text className="font-medium text-gray-900 ml-3">Terms of Service</Text>
              </View>
              <Text className="text-gray-400">›</Text>
            </TouchableOpacity>
          </View>

          {/* Developer Section (Dev Mode Only) */}
          {__DEV__ && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Developer
              </Text>

              <View className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <View className="flex-row items-center mb-2">
                  <Code size={20} color="#6b7280" />
                  <Text className="font-medium text-gray-900 ml-3">Environment</Text>
                </View>
                <Text className="text-sm text-gray-600 mb-2">
                  Current: {getEnvironmentDisplayName(env.name)}
                </Text>
                <View className="bg-white rounded-lg p-3 border border-gray-200">
                  <Text className="text-xs font-mono text-gray-600">
                    URL: {env.supabaseUrl}
                  </Text>
                  <Text className="text-xs font-mono text-gray-600 mt-1">
                    Debug: {env.enableDebug ? 'Enabled' : 'Disabled'}
                  </Text>
                  <Text className="text-xs font-mono text-gray-600 mt-1">
                    Error Reporting: {env.enableErrorReporting ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 mt-2">
                  To switch environments, update your .env file and restart the app
                </Text>
              </View>
            </View>
          )}

          {/* Sign Out */}
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex-row items-center justify-center"
          >
            <LogOut size={20} color="#ef4444" />
            <Text className="text-red-600 font-semibold ml-2">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
