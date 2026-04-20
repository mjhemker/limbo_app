import { useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowUUpLeft, Trash } from 'phosphor-react-native';
import {
  Canvas,
  Path as SkiaPath,
  Skia,
  useCanvasRef,
  makeImageFromView,
} from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useSubmitChatResponse } from '../../../../../hooks/useChats';
import { supabase } from '../../../../../lib/supabase';
import { toast } from '../../../../../utils/toast';
import * as haptics from '../../../../../utils/haptics';

const COLORS = [
  '#000000', '#FFFFFF', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
];

const STROKE_WIDTH = 4;
const CANVAS_SIZE = Dimensions.get('window').width - 32;

interface PathData {
  path: SkPath;
  color: string;
}

export default function DrawRespondPage() {
  const { id: chatId, promptId, promptText, creatorName } = useLocalSearchParams<{
    id: string;
    promptId: string;
    promptText?: string;
    creatorName?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  const [completedPaths, setCompletedPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useCanvasRef();
  const canvasViewRef = useRef<View>(null);
  const submitResponse = useSubmitChatResponse();
  const selectedColorRef = useRef(selectedColor);
  selectedColorRef.current = selectedColor;

  const headerTitle = creatorName ? `${creatorName}'s prompt` : 'Daily prompt';

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .runOnJS(true)
        .onStart((e) => {
          const path = Skia.Path.Make();
          path.moveTo(e.x, e.y);
          setCurrentPath(path);
        })
        .onUpdate((e) => {
          setCurrentPath((prev) => {
            if (!prev) return prev;
            const updated = prev.copy();
            updated.lineTo(e.x, e.y);
            return updated;
          });
        })
        .onEnd(() => {
          setCurrentPath((prev) => {
            if (prev) {
              setCompletedPaths((paths) => [
                ...paths,
                { path: prev, color: selectedColorRef.current },
              ]);
            }
            return null;
          });
        }),
    []
  );

  const handleUndo = () => {
    haptics.lightImpact();
    setCompletedPaths((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    haptics.mediumImpact();
    setCompletedPaths([]);
    setCurrentPath(null);
  };

  const handleSubmit = async () => {
    if (!user || !promptId || completedPaths.length === 0) {
      toast.error('Draw something first!');
      return;
    }

    setSubmitting(true);
    try {
      // Capture the canvas view as an image
      const snapshot = await makeImageFromView(canvasViewRef);
      if (!snapshot) throw new Error('Failed to capture drawing');

      const base64 = snapshot.encodeToBase64();

      // Upload to Supabase storage
      const filePath = `${user.id}/draw-${promptId}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('response-media')
        .upload(filePath, decode(base64), {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('response-media')
        .getPublicUrl(filePath);

      await submitResponse.mutateAsync({
        promptId,
        userId: user.id,
        textContent: '',
        mediaUrl: urlData.publicUrl,
        mediaType: 'image',
      });

      haptics.success();
      toast.success('Drawing submitted!');
      router.back();
    } catch (e: any) {
      console.error('Drawing submit error:', e);
      haptics.error();
      toast.error(e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft weight="bold" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 font-heading">{headerTitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Prompt text */}
      <View className="px-6 py-4">
        <Text className="text-xl font-bold text-gray-900 text-center font-heading">
          {promptText || ''}
        </Text>
      </View>

      {/* Canvas */}
      <View className="flex-1 items-center px-4">
        <GestureDetector gesture={pan}>
          <View
            ref={canvasViewRef}
            collapsable={false}
            style={styles.canvasContainer}
          >
            <Canvas ref={canvasRef} style={styles.canvas}>
              {completedPaths.map((p, index) => (
                <SkiaPath
                  key={index}
                  path={p.path}
                  color={p.color}
                  style="stroke"
                  strokeWidth={STROKE_WIDTH}
                  strokeCap="round"
                  strokeJoin="round"
                />
              ))}
              {currentPath && (
                <SkiaPath
                  path={currentPath}
                  color={selectedColor}
                  style="stroke"
                  strokeWidth={STROKE_WIDTH}
                  strokeCap="round"
                  strokeJoin="round"
                />
              )}
            </Canvas>
          </View>
        </GestureDetector>
      </View>

      {/* Tools: undo + colors + trash */}
      <View className="px-4 py-3">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={handleUndo} disabled={completedPaths.length === 0} className="p-2">
            <ArrowUUpLeft weight="bold" size={24} color={completedPaths.length > 0 ? '#111827' : '#d1d5db'} />
          </TouchableOpacity>

          <View className="flex-row items-center gap-2">
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => { haptics.lightImpact(); setSelectedColor(color); }}
                style={{
                  width: 26, height: 26, borderRadius: 13, backgroundColor: color,
                  borderWidth: selectedColor === color ? 3 : 1,
                  borderColor: selectedColor === color ? '#3B82F6' : '#d1d5db',
                }}
              />
            ))}
          </View>

          <TouchableOpacity onPress={handleClear} disabled={completedPaths.length === 0} className="p-2">
            <Trash weight="bold" size={24} color={completedPaths.length > 0 ? '#EF4444' : '#d1d5db'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Submit */}
      <View className="px-4 pb-4">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || completedPaths.length === 0}
          className={`rounded-full py-4 ${
            submitting || completedPaths.length === 0 ? 'bg-gray-300' : 'bg-black'
          }`}
        >
          <Text className="text-white text-center font-bold text-base">
            {submitting ? 'Submitting...' : 'Submit Drawing'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  canvasContainer: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  canvas: {
    width: CANVAS_SIZE - 4,
    height: CANVAS_SIZE - 4,
  },
});
