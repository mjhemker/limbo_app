import { useState, useRef } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  Animated,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { X, ShareNetwork } from 'phosphor-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as haptics from '../../utils/haptics';
import { toast } from '../../utils/toast';

interface ImageLightboxProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImageLightbox({ visible, imageUrl, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [lastScale, setLastScale] = useState(1);

  const pan = useRef(new Animated.ValueXY()).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  // Track distance between fingers for pinch
  let initialDistance = 0;

  const getDistance = (touches: any[]) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length >= 2) {
          // Pinch to zoom
          const currentDistance = getDistance(touches);

          if (initialDistance === 0) {
            initialDistance = currentDistance;
          } else {
            const newScale = Math.max(1, Math.min(5, lastScale * (currentDistance / initialDistance)));
            setScale(newScale);
            scaleValue.setValue(newScale);
          }
        } else if (scale > 1) {
          // Pan only when zoomed
          Animated.event([null, { dx: pan.x, dy: pan.y }], {
            useNativeDriver: false,
          })(evt, gestureState);
        }
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        setLastScale(scale);
        initialDistance = 0;

        // Snap back if scale is less than 1
        if (scale < 1.1) {
          Animated.spring(scaleValue, {
            toValue: 1,
            useNativeDriver: false,
          }).start();
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
          setScale(1);
          setLastScale(1);
        }
      },
    })
  ).current;

  const handleDoubleTap = () => {
    haptics.lightImpact();

    if (scale > 1) {
      // Zoom out
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: false,
      }).start();
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
      setScale(1);
      setLastScale(1);
    } else {
      // Zoom in
      Animated.spring(scaleValue, {
        toValue: 2.5,
        useNativeDriver: false,
      }).start();
      setScale(2.5);
      setLastScale(2.5);
    }
  };

  const handleShare = async () => {
    haptics.lightImpact();

    try {
      if (await Sharing.isAvailableAsync()) {
        // Download image first
        const filename = imageUrl.split('/').pop() || 'image.jpg';
        const downloadPath = `${FileSystem.cacheDirectory}${filename}`;

        const downloadResult = await FileSystem.downloadAsync(imageUrl, downloadPath);

        if (downloadResult.status === 200) {
          await Sharing.shareAsync(downloadResult.uri);
        }
      }
    } catch (error) {
      // User cancelled or error
    }
  };

  const handleClose = () => {
    // Reset zoom and pan
    scaleValue.setValue(1);
    pan.setValue({ x: 0, y: 0 });
    setScale(1);
    setLastScale(1);
    onClose();
  };

  let lastTap: number | null = null;

  const handleTap = () => {
    const now = Date.now();
    if (lastTap && now - lastTap < 300) {
      handleDoubleTap();
      lastTap = null;
    } else {
      lastTap = now;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.headerButton}
          >
            <X weight="bold" size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleShare}
              style={styles.headerButton}
            >
              <ShareNetwork weight="bold" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Image */}
        <View
          style={styles.imageContainer}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleTap}
            style={styles.imageTouchable}
          >
            <Animated.Image
              source={{ uri: imageUrl }}
              style={[
                styles.image,
                {
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { scale: scaleValue },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Zoom hint */}
        {scale === 1 && (
          <View style={styles.hint}>
            <View style={styles.hintPill}>
              <View style={styles.hintText}>
                <View style={styles.hintDot} />
                <View style={styles.hintDot} />
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchable: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  hint: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  hintText: {
    flexDirection: 'row',
    gap: 4,
  },
  hintDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
});
