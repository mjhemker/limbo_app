import { useState, useEffect, useRef, useMemo } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { X, Image as ImageIcon, Mic, Type, Video, Camera, Clipboard as ClipboardIcon, Lock, Users, Globe, Clock } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { DrawingCanvas } from '../components/chat/DrawingCanvas';
import { captureRef } from 'react-native-view-shot';
import { useAuth } from '../contexts/AuthContext';
import { useTodaysPrompt, usePrompt } from '../hooks/usePrompt';
import { useUserResponse, useCreateResponse, useUpdateResponse } from '../hooks/useResponses';
import AudioRecorder from '../components/media/AudioRecorder';
import { validateImageFile, validateVideoFile, validateAudioFile } from '../utils/mediaValidation';
import { toast } from '../utils/toast';
import * as haptics from '../utils/haptics';

type ResponseMode = 'text' | 'photo' | 'video' | 'voice';

// Calculate time remaining until 4pm Pacific
function useCountdownTo4PMPacific() {
  const [timeRemaining, setTimeRemaining] = useState('--:--');

  useEffect(() => {
    const calculateTimeRemaining = () => {
      try {
        const now = new Date();

        // Get Pacific time offset (PST = -8, PDT = -7)
        const pacificOffset = -7 * 60; // PDT in minutes
        const localOffset = now.getTimezoneOffset();
        const offsetDiff = localOffset + pacificOffset;

        // Create current time in Pacific
        const pacificNow = new Date(now.getTime() + offsetDiff * 60 * 1000);

        // Create 4pm target for today in Pacific
        const target = new Date(pacificNow);
        target.setHours(16, 0, 0, 0);

        // If we're past 4pm Pacific, target is tomorrow's 4pm
        if (pacificNow >= target) {
          target.setDate(target.getDate() + 1);
        }

        // Calculate difference in milliseconds
        const diff = target.getTime() - pacificNow.getTime();

        if (diff <= 0 || !isFinite(diff)) {
          setTimeRemaining('00:00');
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      } catch (e) {
        setTimeRemaining('--:--');
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, []);

  return timeRemaining;
}

export default function ComposePage() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ promptId?: string; promptText?: string; promptType?: string; senderName?: string; options?: string; backgroundImage?: string }>();
  const countdown = useCountdownTo4PMPacific();

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
  const [visibility, setVisibility] = useState<'private' | 'friends' | 'public'>('friends');
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<ResponseMode>('text');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [defendText, setDefendText] = useState('');
  const [hasDrawing, setHasDrawing] = useState(false);

  useEffect(() => {
    if (existingResponse) {
      setTextContent(existingResponse.text_content || '');
      setMediaUri(existingResponse.media_url || null);
      setMediaType(existingResponse.media_type || null);
      setAudioUri(existingResponse.audio_url || null);

      // Determine visibility from is_visible and is_public
      if (!existingResponse.is_visible) {
        setVisibility('private');
      } else if (existingResponse.is_public) {
        setVisibility('public');
      } else {
        setVisibility('friends');
      }

      if (existingResponse.media_url) {
        setActiveMode(existingResponse.media_type === 'video' ? 'video' : 'photo');
      } else if (existingResponse.audio_url) {
        setActiveMode('voice');
      }
    }
  }, [existingResponse]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: activeMode === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
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
    }
  };

  const pasteImage = async () => {
    try {
      const hasImage = await Clipboard.hasImageAsync();
      if (hasImage) {
        const image = await Clipboard.getImageAsync({ format: 'png' });
        if (image?.data) {
          const dataUri = `data:image/png;base64,${image.data}`;
          setMediaUri(dataUri);
          setMediaType('image');
          haptics.success();
          toast.success('Image pasted from clipboard');
        }
      } else {
        toast.info('No image in clipboard');
      }
    } catch (error) {
      console.error('Paste image error:', error);
      toast.error('Failed to paste image');
    }
  };

  const handlePost = async () => {
    const isDebate = promptType === 'debate';
    const isDraw = promptType === 'draw';

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

      // Convert visibility state to is_visible and is_public
      const isVisible = visibility !== 'private';
      const isPublic = visibility === 'public';

      if (existingResponse) {
        await updateResponse.mutateAsync({
          responseId: existingResponse.id,
          userId: user.id,
          textContent: responseText,
          mediaFile,
          audioFile,
          isVisible,
          isPublic,
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
          isPublic,
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

  const isDebate = promptType === 'debate';
  const isDraw = promptType === 'draw';
  const hasContent = isDebate ? selectedOption !== null : isDraw ? hasDrawing : (textContent || mediaUri || audioUri);

  // Mode options for pill selector
  const modes: { key: ResponseMode; label: string; icon: any }[] = [
    { key: 'video', label: 'Video', icon: Video },
    { key: 'photo', label: 'Photo', icon: ImageIcon },
    { key: 'voice', label: 'Voice', icon: Mic },
    { key: 'text', label: 'Text', icon: Type },
  ];

  if (promptLoading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink">
        <View className="flex-row items-center justify-center px-5 py-4">
          <TouchableOpacity onPress={() => router.back()} className="absolute left-5">
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F7DA21" />
        </View>
      </SafeAreaView>
    );
  }

  if (!promptText) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink">
        <View className="flex-row items-center justify-center px-5 py-4">
          <TouchableOpacity onPress={() => router.back()} className="absolute left-5">
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-bold text-white text-center mb-2">
            No prompt available
          </Text>
          <Text className="text-white/60 text-center">
            Check back later!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-ink">
      <SafeAreaView edges={['top']} className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <X size={24} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Center badge */}
            <View className="flex-row items-center bg-white/10 rounded-full px-4 py-2">
              <Text className="text-white/80 font-semibold text-[13px]">
                {isDailyPrompt ? 'Today · Daily Prompt' : params.senderName ? `From ${params.senderName}` : 'Prompt'}
              </Text>
            </View>

            {/* Timer countdown */}
            <View className="flex-row items-center">
              <Clock size={14} color="#F7DA21" />
              <Text className="text-primary font-bold text-[14px] ml-1.5">{countdown}</Text>
            </View>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 200 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Prompt text */}
            <View className="px-6 py-8">
              <Text className="text-[28px] font-extrabold text-white text-center leading-tight" style={{ letterSpacing: -0.5 }}>
                {isDebate ? params.promptText : promptText}
              </Text>
            </View>

            {isDebate ? (
              /* ===== DEBATE POLL UI ===== */
              <View className="px-5 pt-4">
                <Text className="text-sm font-bold text-white/60 mb-4 uppercase tracking-wider">Pick your side</Text>
                {debateOptions.map((option, index) => {
                  const isSelected = selectedOption === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedOption(index)}
                      className={`flex-row items-center p-4 rounded-2xl mb-3 border-2 ${
                        isSelected ? 'border-primary bg-primary/10' : 'border-white/20 bg-white/5'
                      }`}
                      activeOpacity={0.7}
                    >
                      <View className={`w-8 h-8 rounded-full border-2 items-center justify-center mr-3 ${
                        isSelected ? 'border-primary bg-primary' : 'border-white/30'
                      }`}>
                        {isSelected && (
                          <View className="w-3 h-3 rounded-full bg-ink" />
                        )}
                      </View>
                      <Text className="text-sm font-bold text-white/40 mr-2">
                        {String.fromCharCode(65 + index)}
                      </Text>
                      <Text className={`text-base flex-1 ${isSelected ? 'font-semibold text-white' : 'text-white/70'}`}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <View className="mt-4">
                  <Text className="text-sm font-bold text-white/60 mb-2 uppercase tracking-wider">Defend your pick (optional)</Text>
                  <TextInput
                    className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-base text-white min-h-[100px]"
                    placeholder="Why did you choose this option?"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={defendText}
                    onChangeText={setDefendText}
                    multiline
                    textAlignVertical="top"
                    maxLength={500}
                    editable={!loading}
                  />
                  <Text className="text-xs text-white/40 mt-1 text-right">
                    {defendText.length}/500
                  </Text>
                </View>
              </View>
            ) : isDraw ? (
              /* Draw Canvas */
              <View className="px-5 py-4 items-center" ref={drawingViewRef} collapsable={false}>
                <DrawingCanvas
                  backgroundImageUri={params.backgroundImage}
                  onDrawingChange={setHasDrawing}
                />
              </View>
            ) : (
              /* ===== STANDARD RESPONSE UI ===== */
              <View className="px-5">
                {/* Text mode */}
                {activeMode === 'text' && (
                  <View>
                    <TextInput
                      className="bg-white/10 border border-white/20 rounded-[20px] px-5 py-4 text-[16px] text-white min-h-[160px]"
                      placeholder="Write your response..."
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={textContent}
                      onChangeText={setTextContent}
                      multiline
                      textAlignVertical="top"
                      maxLength={500}
                      editable={!loading}
                    />
                    <Text className="text-xs text-white/40 mt-2 text-right">
                      {textContent.length}/500
                    </Text>
                  </View>
                )}

                {/* Photo/Video mode */}
                {(activeMode === 'photo' || activeMode === 'video') && (
                  <View>
                    {mediaUri ? (
                      <View className="w-full rounded-[20px] overflow-hidden mb-4" style={{ aspectRatio: 4 / 3 }}>
                        <Image
                          source={{ uri: mediaUri }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          onPress={() => { setMediaUri(null); setMediaType(null); }}
                          className="absolute top-3 right-3 bg-black/60 rounded-full p-2"
                        >
                          <X size={18} color="white" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="mb-4">
                        <View
                          className="w-full rounded-[20px] border-2 border-dashed border-white/30 items-center justify-center bg-white/5"
                          style={{ aspectRatio: 4 / 3 }}
                        >
                          {activeMode === 'video' ? (
                            <Video size={40} color="rgba(255,255,255,0.4)" />
                          ) : (
                            <ImageIcon size={40} color="rgba(255,255,255,0.4)" />
                          )}
                          <Text className="text-[15px] text-white/40 mt-3 font-medium">
                            {activeMode === 'video' ? 'Add a video' : 'Add a photo'}
                          </Text>
                        </View>
                        {/* Source buttons */}
                        <View className="flex-row justify-center gap-3 mt-4">
                          <TouchableOpacity
                            onPress={pickImage}
                            className="flex-row items-center bg-white/10 px-5 py-3 rounded-full"
                            activeOpacity={0.7}
                          >
                            <ImageIcon size={18} color="#fff" />
                            <Text className="ml-2 text-[14px] font-semibold text-white">Gallery</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={takePhoto}
                            className="flex-row items-center bg-white/10 px-5 py-3 rounded-full"
                            activeOpacity={0.7}
                          >
                            <Camera size={18} color="#fff" />
                            <Text className="ml-2 text-[14px] font-semibold text-white">Camera</Text>
                          </TouchableOpacity>
                          {activeMode === 'photo' && (
                            <TouchableOpacity
                              onPress={pasteImage}
                              className="flex-row items-center bg-white/10 px-5 py-3 rounded-full"
                              activeOpacity={0.7}
                            >
                              <ClipboardIcon size={18} color="#fff" />
                              <Text className="ml-2 text-[14px] font-semibold text-white">Paste</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Optional caption */}
                    <TextInput
                      className="bg-white/10 border border-white/20 rounded-[16px] px-4 py-3 text-[15px] text-white"
                      placeholder="Add a caption (optional)..."
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={textContent}
                      onChangeText={setTextContent}
                      maxLength={200}
                      editable={!loading}
                    />
                  </View>
                )}

                {/* Voice mode */}
                {activeMode === 'voice' && (
                  <View className="items-center py-6">
                    <AudioRecorder
                      onRecordingComplete={(uri) => setAudioUri(uri)}
                      existingUri={audioUri}
                      darkMode={true}
                    />
                    {audioUri && (
                      <TouchableOpacity
                        onPress={() => setAudioUri(null)}
                        className="mt-4 bg-white/10 px-4 py-2 rounded-full"
                      >
                        <Text className="text-white font-semibold text-[14px]">Remove Recording</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Visibility Toggle — only for daily/feed prompts */}
            {isDailyPrompt && !isDebate && !isDraw && (
              <View className="px-5 mt-6">
                <Text className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3">
                  Who can see this?
                </Text>
                <View className="flex-row gap-2">
                  {/* Private Option */}
                  <TouchableOpacity
                    onPress={() => !loading && setVisibility('private')}
                    disabled={loading}
                    className={`flex-1 flex-row items-center justify-center py-3.5 rounded-full border-2 ${
                      visibility === 'private'
                        ? 'bg-white border-white'
                        : 'bg-white/10 border-white/20'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Lock
                      size={16}
                      color={visibility === 'private' ? '#1A1A1A' : 'rgba(255,255,255,0.6)'}
                      strokeWidth={2.5}
                    />
                    <Text
                      className={`font-bold text-[13px] ml-1.5 ${
                        visibility === 'private' ? 'text-ink' : 'text-white/60'
                      }`}
                    >
                      Private
                    </Text>
                  </TouchableOpacity>

                  {/* Friends Option */}
                  <TouchableOpacity
                    onPress={() => !loading && setVisibility('friends')}
                    disabled={loading}
                    className={`flex-1 flex-row items-center justify-center py-3.5 rounded-full border-2 ${
                      visibility === 'friends'
                        ? 'bg-white border-white'
                        : 'bg-white/10 border-white/20'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Users
                      size={16}
                      color={visibility === 'friends' ? '#1A1A1A' : 'rgba(255,255,255,0.6)'}
                      strokeWidth={2.5}
                    />
                    <Text
                      className={`font-bold text-[13px] ml-1.5 ${
                        visibility === 'friends' ? 'text-ink' : 'text-white/60'
                      }`}
                    >
                      Friends
                    </Text>
                  </TouchableOpacity>

                  {/* Public Option */}
                  <TouchableOpacity
                    onPress={() => !loading && setVisibility('public')}
                    disabled={loading}
                    className={`flex-1 flex-row items-center justify-center py-3.5 rounded-full border-2 ${
                      visibility === 'public'
                        ? 'bg-primary border-primary'
                        : 'bg-white/10 border-white/20'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Globe
                      size={16}
                      color={visibility === 'public' ? '#1A1A1A' : 'rgba(255,255,255,0.6)'}
                      strokeWidth={2.5}
                    />
                    <Text
                      className={`font-bold text-[13px] ml-1.5 ${
                        visibility === 'public' ? 'text-ink' : 'text-white/60'
                      }`}
                    >
                      Public
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Fixed Bottom: Mode Picker + Post Button */}
          <View className="absolute bottom-0 left-0 right-0 bg-ink border-t border-white/10">
            <SafeAreaView edges={['bottom']}>
              {/* Mode Picker Pills */}
              {!isDebate && !isDraw && (
                <View className="px-5 pt-4 pb-2">
                  <View className="flex-row bg-white/10 rounded-full p-1">
                    {modes.map((mode) => {
                      const Icon = mode.icon;
                      const isActive = activeMode === mode.key;
                      return (
                        <TouchableOpacity
                          key={mode.key}
                          onPress={() => {
                            haptics.lightImpact();
                            setActiveMode(mode.key);
                          }}
                          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-full ${
                            isActive ? 'bg-white' : ''
                          }`}
                          activeOpacity={0.8}
                        >
                          <Icon size={16} color={isActive ? '#1A1A1A' : 'rgba(255,255,255,0.5)'} />
                          <Text
                            className={`ml-1.5 font-bold text-[12px] ${
                              isActive ? 'text-ink' : 'text-white/50'
                            }`}
                          >
                            {mode.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Post Button */}
              <View className="px-5 pb-4 pt-2">
                <TouchableOpacity
                  onPress={handlePost}
                  disabled={!hasContent || loading}
                  className={`rounded-full py-4 ${
                    hasContent && !loading ? 'bg-primary' : 'bg-white/20'
                  }`}
                  activeOpacity={0.8}
                >
                  <Text className={`text-center font-extrabold text-[16px] ${
                    hasContent && !loading ? 'text-ink' : 'text-white/40'
                  }`}>
                    {loading ? 'Posting...' : existingResponse ? 'Update Response' : 'Post'}
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
