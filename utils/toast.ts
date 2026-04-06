import Toast from 'react-native-toast-message';

/**
 * Utility functions for displaying toast notifications
 * Use these instead of Alert.alert() for non-critical feedback
 */

export const toast = {
  /**
   * Show a success toast
   */
  success: (message: string, title?: string) => {
    Toast.show({
      type: 'success',
      text1: title || 'Success',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60,
    });
  },

  /**
   * Show an error toast
   */
  error: (message: string, title?: string) => {
    Toast.show({
      type: 'error',
      text1: title || 'Error',
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      topOffset: 60,
    });
  },

  /**
   * Show an info toast
   */
  info: (message: string, title?: string) => {
    Toast.show({
      type: 'info',
      text1: title || 'Info',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60,
    });
  },

  /**
   * Show a warning toast
   */
  warning: (message: string, title?: string) => {
    Toast.show({
      type: 'info', // Using info type styled as warning
      text1: title || 'Warning',
      text2: message,
      position: 'top',
      visibilityTime: 3500,
      topOffset: 60,
    });
  },

  /**
   * Hide all toasts
   */
  hide: () => {
    Toast.hide();
  },
};
