/**
 * Hashtag utility functions
 */

export interface HashtagMatch {
  hashtag: string;
  start: number;
  end: number;
}

/**
 * Extract hashtags from text
 * Returns array of hashtag matches with positions
 */
export function extractHashtags(text: string): HashtagMatch[] {
  if (!text) return [];

  // Match hashtags: # followed by alphanumeric characters (including underscores)
  // Must be preceded by whitespace or start of string
  const regex = /(?:^|\s)(#[a-zA-Z0-9_]+)/g;
  const matches: HashtagMatch[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const hashtag = match[1];
    // Adjust start position to account for potential whitespace
    const start = match.index + (match[0].length - hashtag.length);
    const end = start + hashtag.length;

    matches.push({
      hashtag,
      start,
      end,
    });
  }

  return matches;
}

/**
 * Get unique hashtags from text (without # symbol)
 */
export function getUniqueHashtags(text: string): string[] {
  const matches = extractHashtags(text);
  const hashtags = matches.map((m) => m.hashtag.slice(1)); // Remove # symbol
  return Array.from(new Set(hashtags));
}

/**
 * Check if text contains hashtags
 */
export function hasHashtags(text: string): boolean {
  return extractHashtags(text).length > 0;
}

/**
 * Format hashtag for display (capitalize)
 */
export function formatHashtag(hashtag: string): string {
  // Remove # if present
  const cleaned = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
