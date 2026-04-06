import { useState, useEffect } from 'react';
import * as Vibrant from 'node-vibrant';

export function useImageColor(imageUri?: string) {
  const [color, setColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imageUri) {
      setColor(null);
      return;
    }

    setLoading(true);

    Vibrant.from(imageUri)
      .getPalette()
      .then((palette) => {
        const vibrantColor =
          palette.Vibrant?.hex ||
          palette.DarkVibrant?.hex ||
          palette.LightVibrant?.hex ||
          palette.Muted?.hex ||
          null;
        setColor(vibrantColor);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error extracting color:', error);
        setColor(null);
        setLoading(false);
      });
  }, [imageUri]);

  return { color, loading };
}
