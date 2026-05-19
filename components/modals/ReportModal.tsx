import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, AlertTriangle } from 'lucide-react-native';
import { reportsService, ReportReason, ReportContentType } from '../../services/supabase/reports';
import { useAuth } from '../../contexts/AuthContext';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  contentType: ReportContentType;
  contentId: string;
  reportedUserId: string;
  onSuccess?: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Repetitive or unsolicited content' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying, threats, or targeting individuals' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Content promoting hatred against groups' },
  { value: 'violence', label: 'Violence', description: 'Threats or graphic violent content' },
  { value: 'nudity', label: 'Nudity/Sexual', description: 'Inappropriate sexual content' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else' },
  { value: 'other', label: 'Other', description: 'Other violations of community guidelines' },
];

export default function ReportModal({
  visible,
  onClose,
  contentType,
  contentId,
  reportedUserId,
  onSuccess,
}: ReportModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !selectedReason) {
      Alert.alert('Error', 'Please select a reason for your report');
      return;
    }

    setSubmitting(true);
    try {
      // Check if already reported
      const alreadyReported = await reportsService.hasAlreadyReported(
        user.id,
        contentType,
        contentId
      );

      if (alreadyReported) {
        Alert.alert('Already Reported', 'You have already reported this content. Our team will review it.');
        onClose();
        return;
      }

      await reportsService.reportContent(
        user.id,
        reportedUserId,
        contentType,
        contentId,
        selectedReason,
        description.trim() || undefined
      );

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. Our team will review it and take appropriate action.',
        [{ text: 'OK', onPress: onClose }]
      );

      onSuccess?.();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <View className="flex-row items-center">
              <AlertTriangle size={24} color="#ef4444" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">
                Report Content
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={submitting}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-4 py-4">
            <Text className="text-gray-600 mb-4">
              Help us understand what's wrong with this content. Your report is anonymous
              and will be reviewed by our team.
            </Text>

            {/* Reason Selection */}
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Why are you reporting this?
            </Text>

            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                onPress={() => setSelectedReason(reason.value)}
                disabled={submitting}
                className={`p-4 rounded-xl mb-2 border ${
                  selectedReason === reason.value
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text
                      className={`font-medium ${
                        selectedReason === reason.value ? 'text-red-700' : 'text-gray-900'
                      }`}
                    >
                      {reason.label}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-0.5">
                      {reason.description}
                    </Text>
                  </View>
                  <View
                    className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                      selectedReason === reason.value
                        ? 'border-red-500 bg-red-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedReason === reason.value && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Additional Details */}
            <Text className="text-sm font-semibold text-gray-700 mt-4 mb-2">
              Additional details (optional)
            </Text>
            <TextInput
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base text-gray-900 bg-gray-50"
              placeholder="Provide more context about your report..."
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!submitting}
            />

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !selectedReason}
              className={`w-full py-4 rounded-full mt-6 mb-8 ${
                submitting || !selectedReason ? 'bg-gray-300' : 'bg-red-600'
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold text-base">
                  Submit Report
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
