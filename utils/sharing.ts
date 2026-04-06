import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

/**
 * Share a response with text and optional media
 */
export async function shareResponse(params: {
  text?: string;
  mediaUrl?: string;
  promptText?: string;
  userName?: string;
}) {
  const { text, mediaUrl, promptText, userName } = params;

  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing not available', 'Sharing is not available on this device');
      return;
    }

    // Build share message
    let shareMessage = '';
    if (promptText) {
      shareMessage += `Prompt: ${promptText}\n\n`;
    }
    if (userName) {
      shareMessage += `From ${userName}:\n`;
    }
    if (text) {
      shareMessage += text;
    }
    shareMessage += '\n\nShared from Limbo';

    // If there's media, download and share it
    if (mediaUrl) {
      const fileUri = FileSystem.documentDirectory + 'shared_response.jpg';

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(mediaUrl, fileUri);

      if (downloadResult.status === 200) {
        await Sharing.shareAsync(downloadResult.uri, {
          dialogTitle: 'Share Response',
          mimeType: 'image/jpeg',
        });
      }
    } else {
      // Share text only
      // For text-only, we need to create a temporary file
      const fileUri = FileSystem.documentDirectory + 'shared_response.txt';
      await FileSystem.writeAsStringAsync(fileUri, shareMessage);
      await Sharing.shareAsync(fileUri, {
        dialogTitle: 'Share Response',
        mimeType: 'text/plain',
      });
    }
  } catch (error) {
    console.error('Error sharing:', error);
    Alert.alert('Error', 'Failed to share response');
  }
}

/**
 * Share a simple text message
 */
export async function shareText(text: string, title?: string) {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing not available', 'Sharing is not available on this device');
      return;
    }

    const fileUri = FileSystem.documentDirectory + 'shared_text.txt';
    await FileSystem.writeAsStringAsync(fileUri, text);
    await Sharing.shareAsync(fileUri, {
      dialogTitle: title || 'Share',
      mimeType: 'text/plain',
    });
  } catch (error) {
    console.error('Error sharing text:', error);
    Alert.alert('Error', 'Failed to share');
  }
}

/**
 * Share app invite link
 */
export async function shareAppInvite() {
  const inviteMessage = `Join me on Limbo! Answer daily prompts, share with friends, and engage in fun debates.\n\nDownload: https://limbo.app`;

  try {
    await shareText(inviteMessage, 'Invite to Limbo');
  } catch (error) {
    console.error('Error sharing invite:', error);
  }
}
