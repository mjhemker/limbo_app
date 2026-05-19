import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { Mic, Square, Play, Pause, Trash2, AlertCircle } from 'lucide-react-native';
import * as haptics from '../../utils/haptics';

// Dynamically import expo-av to handle cases where it's not available
let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) {
  console.warn('expo-av not available:', e);
}

interface AudioRecorderProps {
  onRecordingComplete: (uri: string) => void;
  onRecordingCancelled?: () => void;
  existingUri?: string | null;
  darkMode?: boolean;
}

export default function AudioRecorder({
  onRecordingComplete,
  onRecordingCancelled,
  existingUri,
  darkMode = false,
}: AudioRecorderProps) {
  const [recording, setRecording] = useState<any>(null);
  const [sound, setSound] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(existingUri || null);
  const [duration, setDuration] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(!!Audio);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationTimer = useRef<NodeJS.Timeout | null>(null);

  // Colors based on dark mode
  const bgColor = darkMode ? 'bg-white/10' : 'bg-gray-100';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const softTextColor = darkMode ? 'text-white/60' : 'text-gray-500';
  const iconColor = darkMode ? '#fff' : '#1A1A1A';
  const softIconColor = darkMode ? 'rgba(255,255,255,0.6)' : '#6B7280';

  useEffect(() => {
    if (Audio) {
      checkPermissions();
    } else {
      setIsAvailable(false);
      setError('Audio recording requires a development build');
    }
    return () => {
      if (durationTimer.current) clearInterval(durationTimer.current);
      if (sound) sound.unloadAsync?.();
    };
  }, []);

  useEffect(() => {
    if (existingUri) {
      setRecordingUri(existingUri);
    }
  }, [existingUri]);

  const checkPermissions = async () => {
    if (!Audio) {
      setPermissionGranted(false);
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
      if (status !== 'granted') {
        setError('Microphone permission is required');
      }
    } catch (e) {
      setError('Failed to check permissions');
      setPermissionGranted(false);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const startRecording = async () => {
    if (!Audio) return;

    try {
      setError(null);
      haptics.mediumImpact();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setDuration(0);
      startPulseAnimation();

      // Start duration timer
      durationTimer.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (e: any) {
      console.error('Failed to start recording:', e);
      setError('Failed to start recording');
      haptics.error();
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      haptics.lightImpact();
      stopPulseAnimation();
      if (durationTimer.current) clearInterval(durationTimer.current);

      setIsRecording(false);
      await recording.stopAndUnloadAsync();

      if (Audio) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      }

      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        setRecordingUri(uri);
        onRecordingComplete(uri);
        haptics.success();
      }
    } catch (e: any) {
      console.error('Failed to stop recording:', e);
      setError('Failed to save recording');
      haptics.error();
    }
  };

  const playRecording = async () => {
    if (!recordingUri || !Audio) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true },
        (status: any) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis / 1000);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlaybackPosition(0);
            }
          }
        }
      );

      setSound(newSound);
      setIsPlaying(true);
      haptics.lightImpact();
    } catch (e) {
      console.error('Failed to play recording:', e);
      setError('Failed to play recording');
    }
  };

  const pausePlayback = async () => {
    if (!sound) return;
    await sound.pauseAsync();
    setIsPlaying(false);
  };

  const deleteRecording = () => {
    haptics.mediumImpact();
    setRecordingUri(null);
    setDuration(0);
    setPlaybackPosition(0);
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    onRecordingCancelled?.();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show unavailable state for Expo Go
  if (!isAvailable) {
    return (
      <View className={`${bgColor} rounded-2xl p-6 items-center`}>
        <AlertCircle size={32} color={softIconColor} />
        <Text className={`${softTextColor} font-medium text-center mt-3`}>
          Voice recording requires a development build
        </Text>
        <Text className={`${softTextColor} text-xs text-center mt-2 opacity-70`}>
          Not available in Expo Go
        </Text>
      </View>
    );
  }

  // Show error state
  if (permissionGranted === false || error) {
    return (
      <View className={`${bgColor} rounded-2xl p-6 items-center`}>
        <AlertCircle size={32} color={softIconColor} />
        <Text className={`${softTextColor} font-medium text-center mt-3`}>
          {error || 'Microphone permission is required'}
        </Text>
        <TouchableOpacity
          onPress={checkPermissions}
          className="mt-4 bg-ink px-4 py-2 rounded-full"
        >
          <Text className="text-white font-semibold text-sm">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (permissionGranted === null) {
    return (
      <View className={`${bgColor} rounded-2xl p-6 items-center`}>
        <Text className={softTextColor}>Checking permissions...</Text>
      </View>
    );
  }

  // Has recording - show playback controls
  if (recordingUri && !isRecording) {
    return (
      <View className={`${bgColor} rounded-2xl p-5`}>
        <View className="flex-row items-center justify-between">
          {/* Play/Pause Button */}
          <TouchableOpacity
            onPress={isPlaying ? pausePlayback : playRecording}
            className="w-14 h-14 bg-ink rounded-full items-center justify-center"
          >
            {isPlaying ? (
              <Pause size={24} color="#fff" fill="#fff" />
            ) : (
              <Play size={24} color="#fff" fill="#fff" />
            )}
          </TouchableOpacity>

          {/* Waveform placeholder / Duration */}
          <View className="flex-1 mx-4">
            <View className="h-10 flex-row items-center justify-center gap-0.5">
              {[...Array(20)].map((_, i) => (
                <View
                  key={i}
                  className="w-1 rounded-full"
                  style={{
                    height: Math.random() * 24 + 8,
                    backgroundColor: i / 20 < playbackPosition / Math.max(duration, 1)
                      ? (darkMode ? '#F7DA21' : '#1A1A1A')
                      : (darkMode ? 'rgba(255,255,255,0.3)' : '#D1D5DB'),
                  }}
                />
              ))}
            </View>
            <Text className={`${softTextColor} text-xs text-center mt-1`}>
              {formatTime(isPlaying ? playbackPosition : duration)}
            </Text>
          </View>

          {/* Delete Button */}
          <TouchableOpacity
            onPress={deleteRecording}
            className="w-10 h-10 items-center justify-center"
          >
            <Trash2 size={20} color="#F26E5E" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Recording controls
  return (
    <View className={`${bgColor} rounded-2xl p-6 items-center`}>
      {isRecording ? (
        <>
          {/* Recording indicator */}
          <Animated.View
            style={{ transform: [{ scale: pulseAnim }] }}
            className="w-20 h-20 bg-coral rounded-full items-center justify-center mb-4"
          >
            <View className="w-6 h-6 bg-white rounded-sm" />
          </Animated.View>
          <Text className={`${textColor} font-bold text-lg mb-1`}>
            {formatTime(duration)}
          </Text>
          <Text className={`${softTextColor} text-sm mb-4`}>Recording...</Text>
          <TouchableOpacity
            onPress={stopRecording}
            className="bg-ink px-8 py-3 rounded-full"
          >
            <Text className="text-white font-bold">Stop Recording</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Start recording button */}
          <TouchableOpacity
            onPress={startRecording}
            className="w-20 h-20 bg-coral rounded-full items-center justify-center mb-4"
            activeOpacity={0.8}
          >
            <Mic size={32} color="#fff" />
          </TouchableOpacity>
          <Text className={`${textColor} font-bold text-base mb-1`}>
            Tap to Record
          </Text>
          <Text className={`${softTextColor} text-sm`}>
            Up to 60 seconds
          </Text>
        </>
      )}
    </View>
  );
}
