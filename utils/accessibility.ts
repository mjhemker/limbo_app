/**
 * Accessibility utility functions and constants
 * Provides consistent accessibility labels and helpers across the app
 */

/**
 * Common accessibility labels for reusable components
 */
export const AccessibilityLabels = {
  // Navigation
  backButton: 'Go back',
  closeButton: 'Close',
  settingsButton: 'Open settings',
  searchButton: 'Search',

  // Actions
  sendMessage: 'Send message',
  createResponse: 'Create new response',
  editProfile: 'Edit profile',
  addFriend: 'Add friend',
  removeFriend: 'Remove friend',
  nudgeFriend: 'Nudge friend to answer prompt',
  shareResponse: 'Share response',

  // Media
  pickImage: 'Choose image from library',
  takePhoto: 'Take photo with camera',
  recordAudio: 'Record audio',
  playAudio: 'Play audio recording',

  // Responses
  pinResponse: 'Pin response to profile',
  unpinResponse: 'Unpin response from profile',
  deleteResponse: 'Delete response',

  // Messages
  reactToMessage: 'React to message',
  messageInput: 'Type your message',

  // Circles
  createCircle: 'Create new circle',
  createPrompt: 'Create prompt for circle',
  createDebate: 'Create debate for circle',

  // Profile
  viewProfile: 'View profile',
  viewFriends: 'View friends list',
};

/**
 * Accessibility hints for common actions
 */
export const AccessibilityHints = {
  backButton: 'Returns to previous screen',
  sendMessage: 'Sends your message to the conversation',
  createResponse: 'Opens compose screen to answer prompt',
  shareResponse: 'Opens share menu to share this response',
  reactToMessage: 'Opens reaction picker with emoji options',
  pickImage: 'Opens photo library to select an image',
  nudgeFriend: 'Sends a notification reminder to your friend',
};

/**
 * Get accessibility props for a button
 */
export function getButtonAccessibility(
  label: string,
  hint?: string,
  disabled: boolean = false
) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'button' as const,
    accessibilityState: {
      disabled,
    },
  };
}

/**
 * Get accessibility props for a text input
 */
export function getTextInputAccessibility(
  label: string,
  hint?: string,
  value?: string
) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityValue: value ? { text: value } : undefined,
  };
}

/**
 * Get accessibility props for an image
 */
export function getImageAccessibility(
  description: string,
  decorative: boolean = false
) {
  if (decorative) {
    return {
      accessible: false,
      importantForAccessibility: 'no' as const,
    };
  }

  return {
    accessible: true,
    accessibilityLabel: description,
    accessibilityRole: 'image' as const,
  };
}

/**
 * Get accessibility props for a link/navigation element
 */
export function getLinkAccessibility(label: string, hint?: string) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'link' as const,
  };
}

/**
 * Announce message for screen readers
 */
export function announceForAccessibility(message: string) {
  // This would use AccessibilityInfo.announceForAccessibility in production
  // For now, it's a placeholder that can be implemented
  console.log('Accessibility announcement:', message);
}
