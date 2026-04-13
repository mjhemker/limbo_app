import { useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Dimensions, Text, Platform } from 'react-native';
import { Play, Pause, AlertCircle } from 'lucide-react-native';

// Lazy load expo-video to prevent crashes on unsupported devices
let useVideoPlayer: any;
let VideoView: any;
let videoSupported = false;

try {
  const expoVideo = require('expo-video');
  useVideoPlayer = expoVideo.useVideoPlayer;
  VideoView = expoVideo.VideoView;
  videoSupported = true;
} catch (e) {
  console.warn('expo-video not available:', e);
}

interface VideoPlayerProps {
  uri: string;
  width?: number;
  height?: number;
  contentFit?: 'contain' | 'cover' | 'fill';
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function VideoPlayerInner({
  uri,
  width = SCREEN_WIDTH,
  height = 300,
  contentFit = 'contain',
  autoPlay = false,
  loop = false,
  className = '',
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [hasError, setHasError] = useState(false);

  const player = useVideoPlayer(uri, (player: any) => {
    try {
      player.loop = loop;
      if (autoPlay) {
        player.play();
      }
    } catch (e) {
      console.warn('Video player initialization error:', e);
      setHasError(true);
    }
  });

  useEffect(() => {
    if (!player || hasError) return;

    let subscription: any;
    let playingSubscription: any;

    try {
      subscription = player.addListener('statusChange', (status: any) => {
        if (status.status === 'readyToPlay') {
          setIsLoading(false);
        }
      });

      playingSubscription = player.addListener('playingChange', (event: any) => {
        setIsPlaying(event.isPlaying);
        // Hide controls after video starts playing
        if (event.isPlaying) {
          setTimeout(() => setShowControls(false), 2000);
        }
      });
    } catch (e) {
      console.warn('Video player listener error:', e);
      setHasError(true);
    }

    return () => {
      try {
        subscription?.remove();
        playingSubscription?.remove();
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [player, hasError]);

  const handlePlayPause = () => {
    if (!player) return;
    try {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch (e) {
      console.warn('Video playback error:', e);
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <View className={`relative ${className} bg-gray-100 items-center justify-center`} style={{ width, height }}>
        <AlertCircle size={32} color="#9ca3af" />
        <Text className="text-gray-500 mt-2">Video unavailable</Text>
      </View>
    );
  }

  return (
    <View className={`relative ${className}`} style={{ width, height }}>
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit={contentFit}
        nativeControls={false}
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

export default function VideoPlayer(props: VideoPlayerProps) {
  if (!videoSupported) {
    return (
      <View
        className={`relative ${props.className || ''} bg-gray-100 items-center justify-center`}
        style={{ width: props.width || SCREEN_WIDTH, height: props.height || 300 }}
      >
        <AlertCircle size={32} color="#9ca3af" />
        <Text className="text-gray-500 mt-2">Video not supported</Text>
      </View>
    );
  }

  return <VideoPlayerInner {...props} />;
}
