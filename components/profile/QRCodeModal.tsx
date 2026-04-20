import { View, Text, Modal, TouchableOpacity, Share as RNShare, Alert } from 'react-native';
import { X, Share, Download } from 'phosphor-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as haptics from '../../utils/haptics';
import { DEEP_LINKING } from '../../lib/constants';

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  displayName: string;
}

export function QRCodeModal({
  visible,
  onClose,
  userId,
  username,
  displayName,
}: QRCodeModalProps) {
  // Generate the deep link URL for the profile
  const profileUrl = `${DEEP_LINKING.prefixes[1]}/profile/${userId}`;

  const handleShare = async () => {
    haptics.lightImpact();
    try {
      await RNShare.share({
        message: `Add me on Limbo! ${profileUrl}`,
        title: 'Share Profile',
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share profile');
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/50 justify-center items-center"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          className="bg-white rounded-3xl p-6 mx-6 w-80"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-black text-black font-heading">My QR Code</Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 items-center justify-center"
            >
              <X weight="bold" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* QR Code */}
          <View className="items-center mb-6">
            <View className="bg-white p-4 rounded-2xl border-2 border-gray-100">
              <QRCode
                value={profileUrl}
                size={200}
                backgroundColor="white"
                color="black"
                logo={require('../../assets/icon.png')}
                logoSize={40}
                logoBackgroundColor="white"
                logoBorderRadius={10}
              />
            </View>
          </View>

          {/* User Info */}
          <View className="items-center mb-6">
            <Text className="text-lg font-bold text-black font-heading">{displayName}</Text>
            <Text className="text-gray-500">@{username}</Text>
          </View>

          {/* Instructions */}
          <Text className="text-center text-gray-600 text-sm mb-6">
            Have friends scan this code to add you on Limbo instantly!
          </Text>

          {/* Share Button */}
          <TouchableOpacity
            onPress={handleShare}
            className="bg-black rounded-full py-3.5 flex-row items-center justify-center"
            activeOpacity={0.7}
          >
            <Share weight="bold" size={18} color="white" />
            <Text className="text-white font-semibold ml-2">Share Profile Link</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
