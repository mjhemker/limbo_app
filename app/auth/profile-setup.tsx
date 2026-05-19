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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload } from 'lucide-react-native';
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

      // Navigate to warmup prompt (step 3)
      router.push('/auth/warmup-prompt');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: '#FBFAF7' }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View className="flex-1 px-8" style={{ maxWidth: 500, alignSelf: 'center', width: '100%' }}>
        {/* Header - V2 Style */}
        <View className="mb-10">
          <Text className="text-3xl font-extrabold text-ink mb-2" style={{ letterSpacing: -1 }}>
            Complete Your Profile
          </Text>
          <Text className="text-ink-soft text-base font-medium">
            One last step to get started
          </Text>
        </View>

        {/* Avatar Upload - V2 Style */}
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
                className="w-28 h-28 rounded-full bg-sand"
              />
            ) : (
              <View className="w-28 h-28 rounded-full bg-sand items-center justify-center">
                <Upload size={36} color="#6B6760" />
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-ink rounded-full p-2.5">
              <Camera size={18} color="white" />
            </View>
          </TouchableOpacity>
          <Text className="text-[13px] text-ink-soft font-medium mt-3">
            Add a profile photo
          </Text>
        </View>

        {/* Display Name - V2 Style */}
        <View className="mb-4">
          <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>
            Display Name
          </Text>
          <TextInput
            className="w-full px-4 py-4 bg-sand border border-rule rounded-[14px] text-[15px] text-ink font-medium"
            placeholder="Your name"
            placeholderTextColor="#6B6760"
            value={displayName}
            onChangeText={setDisplayName}
            editable={!loading}
          />
        </View>

        {/* Username - V2 Style */}
        <View className="mb-6">
          <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>
            Username
          </Text>
          <View className="relative">
            <TextInput
              className="w-full px-4 py-4 bg-sand border border-rule rounded-[14px] text-[15px] text-ink font-medium"
              placeholder="username"
              placeholderTextColor="#6B6760"
              value={username}
              onChangeText={(text) => setUsername(text.toLowerCase())}
              autoCapitalize="none"
              editable={!loading}
            />
            {checkingUsername && (
              <View className="absolute right-4 top-4">
                <ActivityIndicator size="small" color="#111111" />
              </View>
            )}
          </View>
          {username.length > 0 && !checkingUsername && (
            <Text
              className={`text-[11px] font-bold mt-2 ml-1 ${
                usernameAvailable === true
                  ? 'text-green'
                  : usernameAvailable === false
                  ? 'text-coral'
                  : 'text-ink-soft'
              }`}
            >
              {usernameAvailable === true
                ? '✓ Username available'
                : usernameAvailable === false
                ? '✗ Username not available or invalid format'
                : 'Lowercase, alphanumeric + underscore, 3-20 chars'}
            </Text>
          )}
          {username.length === 0 && (
            <Text className="text-[11px] text-ink-soft font-medium mt-2 ml-1">
              3-20 characters, lowercase letters, numbers, and underscores
            </Text>
          )}
        </View>

        {/* Complete Button - V2 Primary */}
        <TouchableOpacity
          className={`w-full py-4 rounded-full mt-4 ${
            loading || usernameAvailable !== true
              ? 'bg-ink opacity-30'
              : 'bg-ink'
          }`}
          onPress={handleComplete}
          disabled={loading || usernameAvailable !== true}
          activeOpacity={0.7}
        >
          <Text className="text-white text-center font-bold text-[14px]">
            {loading ? 'Creating profile...' : 'Complete Setup →'}
          </Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
