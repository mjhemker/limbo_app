import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  Platform,
  Share as RNShareAPI,
} from 'react-native';
import { X, ChatText, PaperPlaneRight, Copy, ShareNetwork } from 'phosphor-react-native';
import * as haptics from '../../utils/haptics';
import { toast } from '../../utils/toast';
import { DEEP_LINKING, APP_NAME } from '../../lib/constants';

interface SMSInviteModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  displayName: string;
}

export function SMSInviteModal({
  visible,
  onClose,
  userId,
  displayName,
}: SMSInviteModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');

  // Generate the invite link
  const inviteLink = `${DEEP_LINKING.prefixes[1]}/invite?ref=${userId}`;
  const inviteMessage = `Hey! Join me on ${APP_NAME} - the daily prompt app where you can share your thoughts with friends. Use my invite link to get started: ${inviteLink}`;

  const handleSendSMS = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    haptics.lightImpact();

    // Format phone number for SMS
    const cleanedNumber = phoneNumber.replace(/[^\d+]/g, '');

    // Use the SMS URI scheme
    const smsUrl = Platform.select({
      ios: `sms:${cleanedNumber}&body=${encodeURIComponent(inviteMessage)}`,
      android: `sms:${cleanedNumber}?body=${encodeURIComponent(inviteMessage)}`,
      default: `sms:${cleanedNumber}?body=${encodeURIComponent(inviteMessage)}`,
    });

    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
        onClose();
      } else {
        Alert.alert('Error', 'Unable to open SMS app');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open SMS app');
    }
  };

  const handleCopyLink = async () => {
    haptics.lightImpact();
    try {
      await RNShareAPI.share({
        message: inviteLink,
      });
    } catch (error) {
      // User cancelled
    }
  };

  const handleShare = async () => {
    haptics.lightImpact();
    try {
      await RNShareAPI.share({
        message: inviteMessage,
        title: `Join me on ${APP_NAME}`,
      });
    } catch (error) {
      // User cancelled or error
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-black font-heading">Invite Friends</Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 items-center justify-center"
            >
              <X weight="bold" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* SMS Invite Section */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Send via SMS
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1 flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-4 py-3">
                <ChatText weight="bold" size={20} color="#6b7280" />
                <TextInput
                  className="flex-1 ml-2 text-base"
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
              </View>
              <TouchableOpacity
                onPress={handleSendSMS}
                className="bg-black rounded-xl p-3.5"
                disabled={!phoneNumber.trim()}
              >
                <PaperPlaneRight weight="bold" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Invite Link Section */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Or share your invite link
            </Text>
            <View className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <Text className="text-gray-600 text-sm mb-3" numberOfLines={2}>
                {inviteLink}
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleCopyLink}
                  className="flex-1 flex-row items-center justify-center bg-gray-100 rounded-xl py-3"
                >
                  <Copy weight="bold" size={18} color="#374151" />
                  <Text className="text-gray-700 font-semibold ml-2">Copy Link</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShare}
                  className="flex-1 flex-row items-center justify-center bg-primary-500 rounded-xl py-3"
                >
                  <ShareNetwork weight="bold" size={18} color="#000" />
                  <Text className="text-black font-semibold ml-2">Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Preview Message */}
          <View className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <Text className="text-xs text-gray-500 uppercase font-semibold mb-2">
              Message Preview
            </Text>
            <Text className="text-gray-700 text-sm leading-relaxed">
              {inviteMessage}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
