import { ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900 ml-3">
          Terms of Service
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6">
        <Text className="text-2xl font-black text-gray-900 mb-4">
          Terms of Service
        </Text>

        <Text className="text-sm text-gray-500 mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </Text>

        <View className="gap-6">
          {/* Acceptance of Terms */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              1. Acceptance of Terms
            </Text>
            <Text className="text-gray-700 leading-6">
              By accessing and using Limbo, you accept and agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use our service.
            </Text>
          </View>

          {/* Description of Service */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              2. Description of Service
            </Text>
            <Text className="text-gray-700 leading-6">
              Limbo is a social platform that allows users to respond to daily prompts, share
              content with friends, participate in circles, and engage in debates. We reserve
              the right to modify or discontinue the service at any time.
            </Text>
          </View>

          {/* User Accounts */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              3. User Accounts
            </Text>
            <Text className="text-gray-700 leading-6 mb-2">
              To use Limbo, you must:
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Be at least 13 years old
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Provide accurate and complete information
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Maintain the security of your account
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Not impersonate others or create fake accounts
            </Text>
          </View>

          {/* User Content */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              4. User Content
            </Text>
            <Text className="text-gray-700 leading-6">
              You retain ownership of content you post on Limbo. By posting content, you grant
              us a worldwide, non-exclusive license to use, display, and distribute your
              content in connection with the service. You are responsible for your content and
              must not post illegal, harmful, or offensive material.
            </Text>
          </View>

          {/* Prohibited Conduct */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              5. Prohibited Conduct
            </Text>
            <Text className="text-gray-700 leading-6 mb-2">
              You may not:
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Violate any laws or regulations
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Harass, bully, or threaten other users
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Post spam, malware, or harmful content
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Attempt to access unauthorized areas
            </Text>
            <Text className="text-gray-700 leading-6 ml-4">
              • Use automated tools without permission
            </Text>
          </View>

          {/* Intellectual Property */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              6. Intellectual Property
            </Text>
            <Text className="text-gray-700 leading-6">
              Limbo and its original content, features, and functionality are owned by us and
              are protected by copyright, trademark, and other laws. You may not copy,
              modify, or distribute our content without permission.
            </Text>
          </View>

          {/* Termination */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              7. Termination
            </Text>
            <Text className="text-gray-700 leading-6">
              We may terminate or suspend your account at any time for violations of these
              terms or for any other reason. You may delete your account at any time from
              your profile settings.
            </Text>
          </View>

          {/* Disclaimer */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              8. Disclaimer
            </Text>
            <Text className="text-gray-700 leading-6">
              Limbo is provided "as is" without warranties of any kind. We do not guarantee
              that the service will be uninterrupted, secure, or error-free.
            </Text>
          </View>

          {/* Limitation of Liability */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              9. Limitation of Liability
            </Text>
            <Text className="text-gray-700 leading-6">
              We are not liable for any indirect, incidental, special, or consequential
              damages arising from your use of Limbo.
            </Text>
          </View>

          {/* Changes to Terms */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              10. Changes to Terms
            </Text>
            <Text className="text-gray-700 leading-6">
              We may update these terms from time to time. Continued use of Limbo after
              changes constitutes acceptance of the new terms.
            </Text>
          </View>

          {/* Contact */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              11. Contact
            </Text>
            <Text className="text-gray-700 leading-6">
              If you have questions about these terms, please contact us at legal@limbo.app
            </Text>
          </View>

          {/* View padding at bottom */}
          <View className="h-6" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
