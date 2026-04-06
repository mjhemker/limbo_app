import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Mic, Square, Play, Pause, Trash2, AlertCircle } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

// Try to import expo-av, but handle if it's not available
let Audio: any = null;
let isAudioAvailable = false;

try {
  const expoAv = require('expo-av');
  Audio = expoAv.Audio;
  isAudioAvailable = true;
} catch (e) {
  console.log('expo-av not available');
}

interface AudioRecorderProps {
  onRecordingComplete: (uri: string) => void;
  onRecordingCancelled?: () => void;
}

export default function AudioRecorder({
  onRecordingComplete,
  onRecordingCancelled,
}: AudioRecorderProps) {
  const [recording, setRecording] = useState<any | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [sound, setSound] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);

  const waveScale = useSharedValue(1);

  const waveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: waveScale.value }],
  }));

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const startRecording = async () => {
    if (!isAudioAvailable || !Audio) {
      setAudioError(true);
      return;
    }

    try {
      const { status } = await Audio.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone permission');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setRecordingUri(null);

      // Start waveform animation
      waveScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        false
      );

      // Update duration while recording
      const interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Store interval ID for cleanup
      (newRecording as any)._interval = interval;
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      // Clear interval
      if ((recording as any)._interval) {
        clearInterval((recording as any)._interval);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecording(null);
      setRecordingUri(uri);

      // Stop waveform animation
      cancelAnimation(waveScale);
      waveScale.value = withTiming(1);

      if (uri) {
        onRecordingComplete(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const playRecording = async () => {
    if (!recordingUri) return;

    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: recordingUri },
          { shouldPlay: true }
        );

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        });

        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Failed to play recording:', error);
      Alert.alert('Error', 'Failed to play recording');
    }
  };

  const deleteRecording = () => {
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    setRecordingUri(null);
    setDuration(0);
    setIsPlaying(false);
    onRecordingCancelled?.();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show error state if audio is not available
  if (!isAudioAvailable || audioError) {
    return (
      <View className="bg-gray-100 rounded-lg p-4">
        <View className="flex-row items-center justify-center py-3">
          <AlertCircle size={24} color="#9ca3af" />
          <Text className="ml-3 text-gray-500 font-medium text-center">
            Audio recording requires a development build
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-gray-100 rounded-lg p-4">
      {!recording && !recordingUri ? (
        // Initial state - ready to record
        <TouchableOpacity
          onPress={startRecording}
          className="flex-row items-center justify-center py-3"
        >
          <Mic size={24} color="#FFBF00" />
          <Text className="ml-3 text-gray-900 font-medium">Record Audio</Text>
        </TouchableOpacity>
      ) : recording ? (
        // Recording in progress
        <View>
          <View className="flex-row items-center justify-center mb-3">
            <Animated.View
              style={waveAnimatedStyle}
              className="w-12 h-12 rounded-full bg-red-500 items-center justify-center"
            >
              <Mic size={24} color="white" />
            </Animated.View>
          </View>
          <Text className="text-center text-gray-900 font-semibold mb-3">
            Recording... {formatDuration(duration)}
          </Text>
          <TouchableOpacity
            onPress={stopRecording}
            className="bg-red-500 rounded-lg py-3 flex-row items-center justify-center"
          >
            <Square size={20} color="white" fill="white" />
            <Text className="ml-2 text-white font-semibold">Stop</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Recording complete - playback controls
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-900 font-medium">
              Recording ({formatDuration(duration)})
            </Text>
            <TouchableOpacity onPress={deleteRecording}>
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={playRecording}
            className="bg-black rounded-lg py-3 flex-row items-center justify-center"
          >
            {isPlaying ? (
              <>
                <Pause size={20} color="white" />
                <Text className="ml-2 text-white font-semibold">Pause</Text>
              </>
            ) : (
              <>
                <Play size={20} color="white" />
                <Text className="ml-2 text-white font-semibold">Play</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
