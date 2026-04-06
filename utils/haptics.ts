import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback utility functions
 * Provides consistent haptic feedback across the app
 */

/**
 * Light haptic feedback for minor interactions
 * Use for: button presses, selections, toggles
 */
export const lightImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
 * Medium haptic feedback for standard interactions
 * Use for: confirmations, important button presses
 */
export const mediumImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/**
 * Heavy haptic feedback for significant interactions
 * Use for: deletions, important confirmations, major actions
 */
export const heavyImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/**
 * Success haptic feedback
 * Use for: successful operations, completions
 */
export const success = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * Warning haptic feedback
 * Use for: warnings, important notices
 */
export const warning = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

/**
 * Error haptic feedback
 * Use for: errors, failed operations
 */
export const error = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

/**
 * Selection haptic feedback
 * Use for: picker scrolling, slider changes
 */
export const selection = () => {
  Haptics.selectionAsync();
};
