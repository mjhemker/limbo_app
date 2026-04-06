import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Switch,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const { signUp } = useAuth();

  const validatePhoneNumber = (phone: string) => {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  };

  const handleSignup = async () => {
    setErrorMessage('');

    if (!email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      setErrorMessage('Phone number must be in E.164 format (e.g., +14155552671)');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);
      router.push('/auth/profile-setup');
    } catch (error: any) {
      setErrorMessage(error.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center px-8">
          {/* Logo and Title */}
          <View className="items-center mb-10">
            <Text className="text-5xl font-black text-black mb-3">
              Limbo
            </Text>
            <Text className="text-gray-600 text-base">
              Daily prompts with your people
            </Text>
          </View>

          {/* Signup Form */}
          <View className="w-full">
            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Email
              </Text>
              <TextInput
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base text-gray-900"
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Password
              </Text>
              <TextInput
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base text-gray-900"
                placeholder="At least 6 characters"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password-new"
                editable={!loading}
              />
            </View>

            {/* Confirm Password Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </Text>
              <TextInput
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base text-gray-900"
                placeholder="Re-enter password"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="password-new"
                editable={!loading}
              />
            </View>

            {/* Phone Number Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Phone Number (Optional)
              </Text>
              <TextInput
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base text-gray-900"
                placeholder="+14155552671"
                placeholderTextColor="#9ca3af"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!loading}
              />
              <Text className="text-xs text-gray-500 mt-1.5 ml-1">
                For SMS reminders (optional)
              </Text>
            </View>

            {/* SMS Opt-in */}
            {phoneNumber && (
              <View className="flex-row items-center justify-between mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <View className="flex-1 mr-4">
                  <Text className="text-sm font-semibold text-gray-900 mb-1">
                    SMS Notifications
                  </Text>
                  <Text className="text-xs text-gray-600">
                    Daily prompt reminders
                  </Text>
                </View>
                <Switch
                  value={smsOptIn}
                  onValueChange={setSmsOptIn}
                  disabled={loading}
                />
              </View>
            )}

            {/* Error Message */}
            {errorMessage ? (
              <View className="mb-4 p-4 bg-red-50 rounded-2xl">
                <Text className="text-red-700 text-sm text-center">{errorMessage}</Text>
              </View>
            ) : null}

            {/* Sign Up Button */}
            <TouchableOpacity
              className={`w-full py-4 rounded-full mt-2 ${
                loading ? 'bg-black opacity-50' : 'bg-black'
              }`}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text className="text-white text-center font-semibold text-base">
                {loading ? 'Creating account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            {/* Sign In Link */}
            <View className="mt-8">
              <Text className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Text
                  className="font-semibold text-black underline"
                  onPress={() => router.push('/auth/login')}
                >
                  Sign In
                </Text>
              </Text>
            </View>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
