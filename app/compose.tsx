import { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { X, Image as ImageIcon, Microphone, ArrowLeft, TextT, Camera } from 'phosphor-react-native';
import { DrawingCanvas } from '../components/chat/DrawingCanvas';
import { captureRef } from 'react-native-view-shot';
import { useAuth } from '../contexts/AuthContext';
import { useTodaysPrompt, usePrompt } from '../hooks/usePrompt';
import { useUserResponse, useCreateResponse, useUpdateResponse } from '../hooks/useResponses';
import AudioRecorder from '../components/media/AudioRecorder';
import { validateImageFile, validateVideoFile, validateAudioFile } from '../utils/mediaValidation';
import { toast } from '../utils/toast';
import * as haptics from '../utils/haptics';

type ResponseMode = 'text' | 'image' | 'audio' | 'draw';

export default function ComposePage() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ promptId?: string; promptText?: string; promptType?: string; senderName?: string; options?: string; backgroundImage?: string }>();

  // If promptText is passed, this is a chat prompt. Otherwise load today's prompt.
  const isDailyPrompt = !params.promptText;
  const debateOptions: string[] = params.options ? JSON.parse(params.options) : [];
  const drawingViewRef = useRef<View>(null);
  const { data: todaysPrompt, isLoading: todayLoading } = useTodaysPrompt();
  const { data: paramPrompt, isLoading: paramLoading } = usePrompt(params.promptId);

  const prompt = params.promptId ? paramPrompt : todaysPrompt;
  const promptText = params.promptText || prompt?.text;
  const promptType = (params.promptType as 'basic' | 'debate' | 'draw') || 'basic';
  const promptLoading = params.promptId ? paramLoading : todayLoading;

  const { data: existingResponse, isLoading: responseLoading } = useUserResponse(user?.id, prompt?.id);
  const createResponse = useCreateResponse();
  const updateResponse = useUpdateResponse();

  const [textContent, setTextContent] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ResponseMode>('text');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [defendText, setDefendText] = useState('');
  const [hasDrawing, setHasDrawing] = useState(false);

  // Set default tab based on prompt type
  useEffect(() => {
    if (promptType === 'draw') setActiveTab('draw');
  }, [promptType]);

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

      setMediaUri(asset.uri);
      setMediaType(isVideo ? 'video' : 'image');
      setActiveTab('image');
    }
  };

  const handlePost = async () => {
    if (isDebate) {
      if (selectedOption === null) {
        Alert.alert('Error', 'Please select an option');
        return;
      }
    } else if (isDraw) {
      if (!hasDrawing) {
        Alert.alert('Error', 'Please draw something first');
        return;
      }
    } else if (!textContent && !mediaUri && !audioUri) {
      Alert.alert('Error', 'Please add some content to your response');
      return;
    }

    if (!user || !prompt) {
      Alert.alert('Error', 'Missing user or prompt data');
      return;
    }

    setLoading(true);
    try {
      // Capture drawing as image
      let drawingUri: string | null = null;
      if (isDraw && hasDrawing && drawingViewRef.current) {
        try {
          drawingUri = await captureRef(drawingViewRef, {
            format: 'png',
            quality: 1,
          });
        } catch (e) {
          console.error('Failed to capture drawing:', e);
        }
      }

      let mediaFile = undefined;
      const effectiveMediaUri = drawingUri || mediaUri;
      const effectiveMediaType = drawingUri ? 'image' as const : mediaType;
      if (effectiveMediaUri) {
        const file = {
          uri: effectiveMediaUri,
          type: effectiveMediaType === 'video' ? 'video/mp4' : 'image/png',
          name: effectiveMediaType === 'video' ? 'video.mp4' : 'drawing.png',
        };

        const validation = effectiveMediaType === 'video'
          ? await validateVideoFile(file)
          : await validateImageFile(file);

        if (!validation.valid) {
          toast.error(validation.error || 'Media validation failed');
          setLoading(false);
          return;
        }

        mediaFile = file;
      }

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

      // For debate, encode the selected option + defend text
      const responseText = isDebate
        ? JSON.stringify({ option: selectedOption, optionLabel: debateOptions[selectedOption!], defend: defendText.trim() })
        : textContent;

      if (existingResponse) {
        await updateResponse.mutateAsync({
          responseId: existingResponse.id,
          userId: user.id,
          textContent: responseText,
          mediaFile,
          audioFile,
          isVisible,
          existingMediaUrl: existingResponse.media_url,
          existingAudioUrl: existingResponse.audio_url,
        });
      } else {
        await createResponse.mutateAsync({
          userId: user.id,
          promptId: prompt.id,
          textContent: responseText,
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

  const hasContent = isDebate ? selectedOption !== null : isDraw ? hasDrawing : (textContent || mediaUri || audioUri);

  if (promptLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft weight="bold" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  if (!promptText) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft weight="bold" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-bold text-gray-900 text-center mb-2 font-heading">
            No prompt available
          </Text>
          <Text className="text-gray-600 text-center">
            Check back later!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Determine which tabs to show based on prompt type
  const isDebate = promptType === 'debate';
  const isDraw = promptType === 'draw';

  // Available tabs for each type
  const tabs: { key: ResponseMode; label: string; icon: any }[] = isDraw
    ? [{ key: 'draw', label: 'Draw', icon: null }]
    : [
        { key: 'text', label: 'Text', icon: TextT },
        { key: 'image', label: 'Photo', icon: ImageIcon },
      ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white"
      >
        <View className="flex-1">
          {/* Header */}
          <View className="px-5 pt-4 pb-3 border-b border-gray-100">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft weight="bold" size={24} color="#000" />
              </TouchableOpacity>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isDailyPrompt ? "Today's Prompt" : params.senderName ? `Prompt by ${params.senderName}` : 'Prompt'}
              </Text>
              <View className="w-6" />
            </View>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }} scrollEnabled={!isDraw}>
            {/* Prompt text */}
            <View className="px-8 py-5">
              <Text className="text-xl font-bold text-black text-center font-heading">
                {isDebate ? params.promptText : promptText}
              </Text>
            </View>

            {isDebate ? (
              /* ===== DEBATE POLL UI ===== */
              <View className="px-5 pt-4">
                <Text className="text-sm font-semibold text-gray-500 mb-4">Pick your side</Text>
                {debateOptions.map((option, index) => {
                  const isSelected = selectedOption === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedOption(index)}
                      className={`flex-row items-center p-4 rounded-2xl mb-3 border-2 ${
                        isSelected ? 'border-black bg-gray-50' : 'border-gray-200 bg-white'
                      }`}
                      activeOpacity={0.7}
                    >
                      <View className={`w-8 h-8 rounded-full border-2 items-center justify-center mr-3 ${
                        isSelected ? 'border-black bg-black' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <View className="w-3 h-3 rounded-full bg-white" />
                        )}
                      </View>
                      <Text className="text-sm font-bold text-gray-400 mr-2">
                        {String.fromCharCode(65 + index)}
                      </Text>
                      <Text className={`text-base flex-1 ${isSelected ? 'font-semibold text-black' : 'text-gray-700'}`}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <View className="mt-4">
                    <Text className="text-sm font-semibold text-gray-500 mb-2">Defend your pick (optional)</Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-base min-h-[100px]"
                      placeholder="Why did you choose this option?"
                      placeholderTextColor="#9ca3af"
                      value={defendText}
                      onChangeText={setDefendText}
                      multiline
                      textAlignVertical="top"
                      maxLength={500}
                      editable={!loading}
                    />
                    <Text className="text-xs text-gray-400 mt-1 text-right">
                      {defendText.length}/500
                    </Text>
                  </View>
              </View>
            ) : (
              /* ===== STANDARD RESPONSE UI ===== */
              <>
                {isDraw ? (
                  /* Draw Canvas */
                  <View className="px-5 py-4 items-center" ref={drawingViewRef} collapsable={false}>
                    <DrawingCanvas
                      backgroundImageUri={params.backgroundImage}
                      onDrawingChange={setHasDrawing}
                    />
                  </View>
                ) : (
                  /* ===== BASIC RESPONSE: image + text ===== */
                  <View className="px-5">
                    {/* Image upload */}
                    {mediaUri ? (
                      <View className="w-full rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: 4 / 3 }}>
                        <Image
                          source={{ uri: mediaUri }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          onPress={() => { setMediaUri(null); setMediaType(null); }}
                          className="absolute top-3 right-3 bg-black/50 rounded-full p-2"
                        >
                          <X weight="bold" size={18} color="white" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={pickImage}
                        className="w-full rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center mb-4"
                        style={{ aspectRatio: 16 / 9 }}
                        activeOpacity={0.6}
                      >
                        <ImageIcon weight="bold" size={28} color="#9ca3af" />
                        <Text className="text-sm text-gray-400 mt-2">Add a photo (optional)</Text>
                      </TouchableOpacity>
                    )}

                    {/* Text input */}
                    <TextInput
                      className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-base min-h-[120px]"
                      placeholder="Write your response..."
                      placeholderTextColor="#9ca3af"
                      value={textContent}
                      onChangeText={setTextContent}
                      multiline
                      textAlignVertical="top"
                      maxLength={500}
                      editable={!loading}
                    />
                    <Text className="text-xs text-gray-400 mt-1 text-right mb-4">
                      {textContent.length}/500
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Visibility Toggle — only for daily/feed prompts */}
            {isDailyPrompt && (
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
            )}

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
