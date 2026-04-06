import { ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900 ml-3">
          Privacy Policy
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6">
        <Text className="text-2xl font-black text-gray-900 mb-4">
          Privacy Policy
        </Text>

        <Text className="text-sm text-gray-500 mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </Text>

        <View className="gap-6">
          {/* Introduction */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              1. Introduction
            </Text>
            <Text className="text-gray-700 leading-6">
              Welcome to Limbo. We respect your privacy and are committed to protecting your
              personal data. This privacy policy will inform you about how we handle your
              personal data when you use our mobile application.
            </Text>
          </View>

          {/* Data We Collect */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              2. Data We Collect
            </Text>
            <Text className="text-gray-700 leading-6 mb-2">
              We collect and process the following data:
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Account information (username, email, phone number)
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Profile information (display name, avatar, bio)
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Content you create (responses, messages, media)
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Usage data (interactions, preferences, activity)
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Device information (device type, OS version, unique identifiers)
            </Text>
          </View>

          {/* How We Use Your Data */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              3. How We Use Your Data
            </Text>
            <Text className="text-gray-700 leading-6 mb-2">
              We use your data to:
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Provide and maintain our service
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Personalize your experience
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Send you notifications and updates
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Improve our service and develop new features
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Ensure security and prevent fraud
            </Text>
          </View>

          {/* Data Sharing */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              4. Data Sharing
            </Text>
            <Text className="text-gray-700 leading-6">
              We do not sell your personal data. We may share your data with service providers
              who help us operate our service (e.g., cloud hosting, analytics). These providers
              are contractually obligated to protect your data.
            </Text>
          </View>

          {/* Your Rights */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              5. Your Rights
            </Text>
            <Text className="text-gray-700 leading-6 mb-2">
              You have the right to:
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Access your personal data
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Correct inaccurate data
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Delete your account and data
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Export your data
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Opt-out of marketing communications
            </Text>
          </View>

          {/* Data Security */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              6. Data Security
            </Text>
            <Text className="text-gray-700 leading-6">
              We implement appropriate technical and organizational measures to protect your
              personal data against unauthorized access, alteration, disclosure, or destruction.
            </Text>
          </View>

          {/* Contact Us */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              7. Contact Us
            </Text>
            <Text className="text-gray-700 leading-6">
              If you have questions about this privacy policy or your personal data, please
              contact us at privacy@limbo.app
            </Text>
          </View>

          {/* View padding at bottom */}
          <View className="h-6" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
