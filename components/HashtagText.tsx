import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { extractHashtags } from '../utils/hashtags';

interface HashtagTextProps {
  children: string;
  className?: string;
  numberOfLines?: number;
  hashtagClassName?: string;
}

/**
 * Component that renders text with clickable hashtags
 */
export function HashtagText({
  children,
  className = '',
  numberOfLines,
  hashtagClassName = 'text-blue-600 font-semibold',
}: HashtagTextProps) {
  const router = useRouter();
  const text = children || '';

  // Extract hashtags
  const hashtags = extractHashtags(text);

  // If no hashtags, render plain text
  if (hashtags.length === 0) {
    return (
      <Text className={className} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  // Split text into parts (text and hashtags)
  const parts: Array<{ text: string; isHashtag: boolean; hashtag?: string }> = [];
  let lastIndex = 0;

  hashtags.forEach((match) => {
    // Add text before hashtag
    if (match.start > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.start),
        isHashtag: false,
      });
    }

    // Add hashtag
    parts.push({
      text: match.hashtag,
      isHashtag: true,
      hashtag: match.hashtag.slice(1), // Remove # for navigation
    });

    lastIndex = match.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      isHashtag: false,
    });
  }

  const handleHashtagPress = (hashtag: string) => {
    router.push(`/hashtag/${encodeURIComponent(hashtag)}`);
  };

  return (
    <Text className={className} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (part.isHashtag) {
          return (
            <Text
              key={`${part.hashtag}-${index}`}
              className={hashtagClassName}
              onPress={() => handleHashtagPress(part.hashtag!)}
            >
              {part.text}
            </Text>
          );
        }
        return <Text key={index}>{part.text}</Text>;
      })}
    </Text>
  );
}
