import { useState, useRef } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Play, Pause } from 'lucide-react-native';

interface VideoPlayerProps {
  uri: string;
  width?: number;
  height?: number;
  resizeMode?: ResizeMode;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VideoPlayer({
  uri,
  width = SCREEN_WIDTH,
  height = 300,
  resizeMode = ResizeMode.CONTAIN,
  autoPlay = false,
  loop = false,
  className = '',
}: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setIsPlaying(status.isPlaying);

      // Hide controls after video starts playing
      if (status.isPlaying) {
        setTimeout(() => setShowControls(false), 2000);
      }

      // Loop if enabled
      if (status.didJustFinish && loop) {
        videoRef.current?.replayAsync();
      }
    }
  };

  return (
    <View className={`relative ${className}`} style={{ width, height }}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={{ width, height }}
        resizeMode={resizeMode}
        shouldPlay={autoPlay}
        isLooping={loop}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        useNativeControls={false}
      />

      {/* Loading indicator */}
      {isLoading && (
        <View className="absolute inset-0 items-center justify-center bg-black/50">
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {/* Play/Pause overlay */}
      {!isLoading && (showControls || !isPlaying) && (
        <TouchableOpacity
          onPress={handlePlayPause}
          className="absolute inset-0 items-center justify-center"
          onPressIn={() => setShowControls(true)}
        >
          <View className="bg-black/50 rounded-full p-4">
            {isPlaying ? (
              <Pause size={40} color="white" />
            ) : (
              <Play size={40} color="white" />
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Tap to show controls when playing */}
      {!isLoading && !showControls && isPlaying && (
        <TouchableOpacity
          onPress={() => setShowControls(true)}
          className="absolute inset-0"
        />
      )}
    </View>
  );
}
