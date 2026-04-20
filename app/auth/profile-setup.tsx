import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload } from 'phosphor-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useUpdateProfile } from '../../hooks/useProfile';
import { profilesService } from '../../services/supabase/profiles';

export default function ProfileSetupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  // Debounced username check
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      setUsernameAvailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        await profilesService.getProfileByUsername(username);
        // If we get here, username is taken
        setUsernameAvailable(false);
      } catch (error: any) {
        // Username not found = available
        if (error.code === 'PGRST116') {
          setUsernameAvailable(true);
        } else {
          setUsernameAvailable(null);
        }
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please grant permission to access your photos'
      );
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

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please grant permission to access your camera'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleComplete = async () => {
    if (!displayName || !username) {
      Alert.alert('Error', 'Please enter both display name and username');
      return;
    }

    if (usernameAvailable === false) {
      Alert.alert('Error', 'Username is not available');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    setLoading(true);
    try {
      const avatarFile = avatarUri
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
          username: username.toLowerCase(),
          email: user.email!,
        },
        avatarFile,
      });

      // Navigate to main app
      router.replace('/(tabs)/feed');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ flexGrow: 1, paddingVertical: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-8">
        {/* Header */}
        <View className="mb-10">
          <Text className="text-3xl font-black text-black mb-2 font-heading">
            Complete Your Profile
          </Text>
          <Text className="text-gray-600 text-base">
            One last step to get started
          </Text>
        </View>

        {/* Avatar Upload */}
        <View className="items-center mb-8">
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Choose Photo', 'Select an option', [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Choose from Library', onPress: pickImage },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
            className="relative"
            disabled={loading}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                className="w-28 h-28 rounded-full bg-gray-100"
              />
            ) : (
              <View className="w-28 h-28 rounded-full bg-gray-100 items-center justify-center">
                <Upload weight="bold" size={36} color="#9ca3af" />
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-black rounded-full p-2.5">
              <Camera weight="bold" size={18} color="white" />
            </View>
          </TouchableOpacity>
          <Text className="text-sm text-gray-500 mt-3">
            Add a profile photo
          </Text>
        </View>

        {/* Display Name */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Display Name
          </Text>
          <TextInput
            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base text-gray-900"
            placeholder="Your name"
            placeholderTextColor="#9ca3af"
            value={displayName}
            onChangeText={setDisplayName}
            editable={!loading}
          />
        </View>

        {/* Username */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Username
          </Text>
          <View className="relative">
            <TextInput
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base text-gray-900"
              placeholder="username"
              placeholderTextColor="#9ca3af"
              value={username}
              onChangeText={(text) => setUsername(text.toLowerCase())}
              autoCapitalize="none"
              editable={!loading}
            />
            {checkingUsername && (
              <View className="absolute right-4 top-4">
                <ActivityIndicator size="small" color="#000" />
              </View>
            )}
          </View>
          {username.length > 0 && !checkingUsername && (
            <Text
              className={`text-xs mt-2 ml-1 ${
                usernameAvailable === true
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {usernameAvailable === true
                ? '✓ Username available'
                : usernameAvailable === false
                ? '✗ Username not available'
                : 'Lowercase, alphanumeric + underscore, 3-20 chars'}
            </Text>
          )}
          {username.length === 0 && (
            <Text className="text-xs text-gray-500 mt-2 ml-1">
              3-20 characters, lowercase letters, numbers, and underscores
            </Text>
          )}
        </View>

        {/* Complete Button */}
        <TouchableOpacity
          className={`w-full py-4 rounded-full mt-4 ${
            loading || usernameAvailable !== true
              ? 'bg-black opacity-30'
              : 'bg-black'
          }`}
          onPress={handleComplete}
          disabled={loading || usernameAvailable !== true}
          activeOpacity={0.7}
        >
          <Text className="text-white text-center font-semibold text-base">
            {loading ? 'Creating profile...' : 'Complete Setup'}
          </Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
