import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { X, Image as ImageIcon, Video, Mic, ArrowLeft, Type } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTodaysPrompt } from '../hooks/usePrompt';
import { useUserResponse, useCreateResponse, useUpdateResponse } from '../hooks/useResponses';
import AudioRecorder from '../components/media/AudioRecorder';
import { validateImageFile, validateVideoFile, validateAudioFile, formatFileSize } from '../utils/mediaValidation';
import { toast } from '../utils/toast';
import * as haptics from '../utils/haptics';

export default function ComposePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: todaysPrompt } = useTodaysPrompt();
  const { data: existingResponse } = useUserResponse(user?.id, todaysPrompt?.id);
  const createResponse = useCreateResponse();
  const updateResponse = useUpdateResponse();

  const [textContent, setTextContent] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'audio'>('text');

  useEffect(() => {
    if (existingResponse) {
      setTextContent(existingResponse.text_content || '');
      setMediaUri(existingResponse.media_url || null);
      setMediaType(existingResponse.media_type || null);
      setAudioUri(existingResponse.audio_url || null);
      setIsVisible(existingResponse.is_visible);

      if (existingResponse.media_url) setActiveTab('image');
      else if (existingResponse.audio_url) setActiveTab('audio');
    }
  }, [existingResponse]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';

      // Validate file size
      const fileToValidate = {
        uri: asset.uri,
        type: isVideo ? 'video/mp4' : 'image/jpeg',
        name: isVideo ? 'video.mp4' : 'image.jpg',
      };

      const validation = isVideo
        ? await validateVideoFile(fileToValidate)
        : await validateImageFile(fileToValidate);

      if (!validation.valid) {
        toast.error(validation.error || 'File validation failed');
        return;
      }

      // Show file size info
      if (validation.fileSizeFormatted) {
        toast.info(`File size: ${validation.fileSizeFormatted}`);
      }

      setMediaUri(asset.uri);
      setMediaType(isVideo ? 'video' : 'image');
      setActiveTab('image');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';

      // Validate file size
      const fileToValidate = {
        uri: asset.uri,
        type: isVideo ? 'video/mp4' : 'image/jpeg',
        name: isVideo ? 'video.mp4' : 'image.jpg',
      };

      const validation = isVideo
        ? await validateVideoFile(fileToValidate)
        : await validateImageFile(fileToValidate);

      if (!validation.valid) {
        toast.error(validation.error || 'File validation failed');
        return;
      }

      // Show file size info
      if (validation.fileSizeFormatted) {
        toast.info(`File size: ${validation.fileSizeFormatted}`);
      }

      setMediaUri(asset.uri);
      setMediaType(isVideo ? 'video' : 'image');
      setActiveTab('image');
    }
  };

  const handlePost = async () => {
    if (!textContent && !mediaUri && !audioUri) {
      Alert.alert('Error', 'Please add some content to your response');
      return;
    }

    if (!user || !todaysPrompt) {
      Alert.alert('Error', 'Missing user or prompt data');
      return;
    }

    setLoading(true);
    try {
      // Validate and prepare media file
      let mediaFile = undefined;
      if (mediaUri) {
        const file = {
          uri: mediaUri,
          type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
          name: mediaType === 'video' ? 'video.mp4' : 'image.jpg',
        };

        const validation = mediaType === 'video'
          ? await validateVideoFile(file)
          : await validateImageFile(file);

        if (!validation.valid) {
          toast.error(validation.error || 'Media validation failed');
          setLoading(false);
          return;
        }

        mediaFile = file;
      }

      // Validate and prepare audio file
      let audioFile = undefined;
      if (audioUri) {
        const file = {
          uri: audioUri,
          type: 'audio/m4a',
          name: 'audio.m4a',
        };

        const validation = await validateAudioFile(file);

        if (!validation.valid) {
          toast.error(validation.error || 'Audio validation failed');
          setLoading(false);
          return;
        }

        audioFile = file;
      }

      if (existingResponse) {
        await updateResponse.mutateAsync({
          responseId: existingResponse.id,
          userId: user.id,
          textContent,
          mediaFile,
          audioFile,
          isVisible,
          existingMediaUrl: existingResponse.media_url,
          existingAudioUrl: existingResponse.audio_url,
        });
      } else {
        await createResponse.mutateAsync({
          userId: user.id,
          promptId: todaysPrompt.id,
          textContent,
          mediaFile,
          audioFile,
          isVisible,
        });
      }

      haptics.success();
      router.back();
    } catch (error: any) {
      haptics.error();
      Alert.alert('Error', error.message || 'Failed to post response');
    } finally {
      setLoading(false);
    }
  };

  const hasContent = textContent || mediaUri || audioUri;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white"
      >
        <View className="flex-1">
          {/* Header */}
          <View className="px-5 pt-4 pb-3 border-b border-gray-100">
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Today's Prompt
            </Text>
            <View className="w-6" />
          </View>
          <Text className="text-xl font-bold text-black">
            {todaysPrompt?.text}
          </Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Response Preview Card */}
          <View className="px-5 py-6">
            <View
              className="bg-black rounded-3xl overflow-hidden"
              style={{ aspectRatio: 9/11 }}
            >
              {activeTab === 'text' && (
                <View className="flex-1 p-6 justify-center">
                  <TextInput
                    className="flex-1 text-white text-lg text-center"
                    placeholder="Type your response..."
                    placeholderTextColor="#6b7280"
                    value={textContent}
                    onChangeText={setTextContent}
                    multiline
                    textAlignVertical="center"
                    editable={!loading}
                  />
                </View>
              )}

              {activeTab === 'image' && (
                <>
                  {mediaUri ? (
                    <>
                      <Image
                        source={{ uri: mediaUri }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      {textContent && (
                        <View className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                          <Text className="text-white text-base text-center">
                            {textContent}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          setMediaUri(null);
                          setMediaType(null);
                        }}
                        className="absolute top-4 right-4 bg-black/50 rounded-full p-2"
                      >
                        <X size={20} color="white" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <ImageIcon size={48} color="white" strokeWidth={1.5} />
                      <Text className="text-white mt-3 text-sm">Add an image</Text>
                    </View>
                  )}
                </>
              )}

              {activeTab === 'audio' && (
                <View className="flex-1 items-center justify-center p-6">
                  {audioUri ? (
                    <View className="w-full">
                      <Mic size={48} color="white" strokeWidth={1.5} className="self-center" />
                      <Text className="text-white mt-3 text-center">Audio recording</Text>
                      <TouchableOpacity
                        onPress={() => setAudioUri(null)}
                        className="mt-4 bg-white/20 rounded-full px-4 py-2 self-center"
                      >
                        <Text className="text-white text-sm">Remove</Text>
                      </TouchableOpacity>
                      {textContent && (
                        <Text className="text-white mt-6 text-center text-base">
                          {textContent}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View className="w-full">
                      <Mic size={48} color="white" strokeWidth={1.5} className="self-center" />
                      <Text className="text-white mt-3 mb-4 text-sm text-center">
                        Record your response
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Tab Buttons */}
          <View className="px-5 mb-6">
            <View className="flex-row bg-gray-100 rounded-full p-1">
              <TouchableOpacity
                onPress={() => setActiveTab('text')}
                className={`flex-1 py-3 rounded-full flex-row items-center justify-center ${
                  activeTab === 'text' ? 'bg-white' : 'bg-transparent'
                }`}
                activeOpacity={0.7}
              >
                <Type size={18} color={activeTab === 'text' ? '#000' : '#6b7280'} strokeWidth={2} />
                <Text className={`ml-2 font-semibold ${
                  activeTab === 'text' ? 'text-black' : 'text-gray-600'
                }`}>
                  Text
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (!mediaUri) {
                    Alert.alert('Add Media', 'Choose an option', [
                      { text: 'Take Photo', onPress: takePhoto },
                      { text: 'Choose from Library', onPress: pickImage },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  } else {
                    setActiveTab('image');
                  }
                }}
                className={`flex-1 py-3 rounded-full flex-row items-center justify-center ${
                  activeTab === 'image' ? 'bg-white' : 'bg-transparent'
                }`}
                activeOpacity={0.7}
              >
                <ImageIcon size={18} color={activeTab === 'image' ? '#000' : '#6b7280'} strokeWidth={2} />
                <Text className={`ml-2 font-semibold ${
                  activeTab === 'image' ? 'text-black' : 'text-gray-600'
                }`}>
                  Image
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('audio')}
                className={`flex-1 py-3 rounded-full flex-row items-center justify-center ${
                  activeTab === 'audio' ? 'bg-white' : 'bg-transparent'
                }`}
                activeOpacity={0.7}
              >
                <Mic size={18} color={activeTab === 'audio' ? '#000' : '#6b7280'} strokeWidth={2} />
                <Text className={`ml-2 font-semibold ${
                  activeTab === 'audio' ? 'text-black' : 'text-gray-600'
                }`}>
                  Audio
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Audio Recorder */}
          {activeTab === 'audio' && !audioUri && (
            <View className="px-5 mb-6">
              <AudioRecorder
                onRecordingComplete={(uri) => {
                  setAudioUri(uri);
                }}
                onRecordingCancelled={() => {
                  setAudioUri(null);
                }}
              />
            </View>
          )}

          {/* Text Input for Audio Tab */}
          {activeTab === 'audio' && (
            <View className="px-5 mb-6">
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base min-h-24"
                placeholder="Add a caption to your audio..."
                placeholderTextColor="#9ca3af"
                value={textContent}
                onChangeText={setTextContent}
                multiline
                textAlignVertical="top"
                editable={!loading}
              />
            </View>
          )}

          {/* Visibility Toggle */}
          <View className="px-5 mb-6">
            <View className="bg-gray-50 rounded-3xl p-5 border border-gray-200">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-bold text-black mb-1">
                    Visible to friends
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {isVisible ? 'Friends can see this post' : 'Only you can see this post'}
                  </Text>
                </View>
                <Switch
                  value={isVisible}
                  onValueChange={setIsVisible}
                  disabled={loading}
                />
              </View>
            </View>
          </View>

          {/* Post Button */}
          <View className="px-5">
            <TouchableOpacity
              onPress={handlePost}
              disabled={!hasContent || loading}
              className={`rounded-full py-4 ${
                hasContent && !loading ? 'bg-black' : 'bg-gray-300'
              }`}
              activeOpacity={0.7}
            >
              <Text className={`text-center font-bold text-base ${
                hasContent && !loading ? 'text-white' : 'text-gray-500'
              }`}>
                {loading ? 'Posting...' : existingResponse ? 'Update Response' : 'Post Response'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
