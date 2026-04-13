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

// Lazy load expo-audio to prevent crashes on unsupported devices
let useAudioRecorder: any;
let useAudioPlayer: any;
let AudioModule: any;
let RecordingPresets: any;
let audioSupported = false;

try {
  const expoAudio = require('expo-audio');
  useAudioRecorder = expoAudio.useAudioRecorder;
  useAudioPlayer = expoAudio.useAudioPlayer;
  AudioModule = expoAudio.AudioModule;
  RecordingPresets = expoAudio.RecordingPresets;
  audioSupported = true;
} catch (e) {
  console.warn('expo-audio not available:', e);
}

interface AudioRecorderProps {
  onRecordingComplete: (uri: string) => void;
  onRecordingCancelled?: () => void;
}

function AudioRecorderInner({
  onRecordingComplete,
  onRecordingCancelled,
}: AudioRecorderProps) {
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [durationInterval, setDurationInterval] = useState<NodeJS.Timeout | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets?.HIGH_QUALITY);
  const player = useAudioPlayer(recordingUri ?? '');

  const waveScale = useSharedValue(1);

  const waveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: waveScale.value }],
  }));

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (durationInterval) {
        clearInterval(durationInterval);
      }
    };
  }, [durationInterval]);

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();

      if (!status.granted) {
        Alert.alert('Permission needed', 'Please grant microphone permission');
        return;
      }

      audioRecorder.record();
      setIsRecording(true);
      setRecordingUri(null);
      setDuration(0);

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
      setDurationInterval(interval);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setAudioError(true);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      // Clear interval
      if (durationInterval) {
        clearInterval(durationInterval);
        setDurationInterval(null);
      }

      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      setIsRecording(false);
      setRecordingUri(uri ?? null);

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
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error('Failed to play recording:', error);
      Alert.alert('Error', 'Failed to play recording');
    }
  };

  const deleteRecording = () => {
    player.remove();
    setRecordingUri(null);
    setDuration(0);
    onRecordingCancelled?.();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show error state if audio is not available
  if (audioError) {
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
      {!isRecording && !recordingUri ? (
        // Initial state - ready to record
        <TouchableOpacity
          onPress={startRecording}
          className="flex-row items-center justify-center py-3"
        >
          <Mic size={24} color="#FFBF00" />
          <Text className="ml-3 text-gray-900 font-medium">Record Audio</Text>
        </TouchableOpacity>
      ) : isRecording ? (
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
            {player.playing ? (
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

export default function AudioRecorder(props: AudioRecorderProps) {
  if (!audioSupported) {
    return (
      <View className="bg-gray-100 rounded-lg p-4">
        <View className="flex-row items-center justify-center py-3">
          <AlertCircle size={24} color="#9ca3af" />
          <Text className="ml-3 text-gray-500 font-medium text-center">
            Audio recording is not available
          </Text>
        </View>
      </View>
    );
  }

  return <AudioRecorderInner {...props} />;
}
