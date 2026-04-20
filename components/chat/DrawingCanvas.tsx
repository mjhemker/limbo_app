import { useState, useCallback } from 'react';
import { View, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Canvas, Path, Skia, useCanvasRef } from '@shopify/react-native-skia';
import { ArrowUUpLeft, Trash } from 'phosphor-react-native';

const COLORS = ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

interface DrawingCanvasProps {
  backgroundImageUri?: string | null;
  onDrawingChange?: (hasContent: boolean) => void;
  canvasRef?: React.RefObject<any>;
}

export function DrawingCanvas({ backgroundImageUri, onDrawingChange, canvasRef: externalRef }: DrawingCanvasProps) {
  const internalRef = useCanvasRef();
  const ref = externalRef || internalRef;

  const [paths, setPaths] = useState<{ path: any; color: string; strokeWidth: number }[]>([]);
  const [currentPath, setCurrentPath] = useState<any>(null);
  const [selectedColor, setSelectedColor] = useState('#000000');

  const screenWidth = Dimensions.get('window').width - 40;
  const canvasHeight = screenWidth;

  const handleTouchStart = useCallback((e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    const path = Skia.Path.Make();
    path.moveTo(locationX, locationY);
    setCurrentPath({ path, color: selectedColor, strokeWidth: 4 });
  }, [selectedColor]);

  const handleTouchMove = useCallback((e: any) => {
    if (!currentPath) return;
    const { locationX, locationY } = e.nativeEvent;
    currentPath.path.lineTo(locationX, locationY);
    setCurrentPath({ ...currentPath });
  }, [currentPath]);

  const handleTouchEnd = useCallback(() => {
    if (currentPath) {
      const newPaths = [...paths, currentPath];
      setPaths(newPaths);
      setCurrentPath(null);
      onDrawingChange?.(newPaths.length > 0);
    }
  }, [currentPath, paths, onDrawingChange]);

  const undo = () => {
    const newPaths = paths.slice(0, -1);
    setPaths(newPaths);
    onDrawingChange?.(newPaths.length > 0);
  };

  const clear = () => {
    setPaths([]);
    setCurrentPath(null);
    onDrawingChange?.(false);
  };

  return (
    <View style={{ width: screenWidth, alignSelf: 'center' }}>
      {/* Canvas */}
      <View
        className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-white"
        style={{ width: screenWidth, height: canvasHeight }}
      >
        {backgroundImageUri && (
          <Image
            source={{ uri: backgroundImageUri }}
            style={{ position: 'absolute', width: screenWidth, height: canvasHeight }}
            resizeMode="cover"
          />
        )}
        <View
          style={{ width: screenWidth, height: canvasHeight }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Canvas ref={ref} style={{ width: screenWidth, height: canvasHeight }}>
            {paths.map((p, i) => (
              <Path
                key={i}
                path={p.path}
                color={p.color}
                style="stroke"
                strokeWidth={p.strokeWidth}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
            {currentPath && (
              <Path
                path={currentPath.path}
                color={currentPath.color}
                style="stroke"
                strokeWidth={currentPath.strokeWidth}
                strokeCap="round"
                strokeJoin="round"
              />
            )}
          </Canvas>
        </View>
      </View>

      {/* Toolbar: colors left, undo/trash right */}
      <View className="flex-row items-center justify-between mt-4">
        <View className="flex-row items-center gap-2">
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => setSelectedColor(color)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: color,
                borderWidth: selectedColor === color ? 3 : 1,
                borderColor: selectedColor === color ? '#3b82f6' : (color === '#ffffff' ? '#d1d5db' : 'transparent'),
              }}
              activeOpacity={0.7}
            />
          ))}
        </View>

        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            onPress={undo}
            disabled={paths.length === 0}
            className={paths.length === 0 ? 'opacity-30' : ''}
            activeOpacity={0.6}
          >
            <ArrowUUpLeft weight="bold" size={22} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={clear}
            disabled={paths.length === 0}
            className={paths.length === 0 ? 'opacity-30' : ''}
            activeOpacity={0.6}
          >
            <Trash weight="bold" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
