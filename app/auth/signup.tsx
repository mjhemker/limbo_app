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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
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

    if (!termsAccepted) {
      setErrorMessage('You must agree to the Terms of Service and Privacy Policy');
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
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']} style={{ backgroundColor: '#FBFAF7' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          style={{ flex: 1, backgroundColor: '#FBFAF7' }}
        >
          <View className="px-8" style={{ maxWidth: 500, alignSelf: 'center', width: '100%' }}>
          {/* V2 Logo - limbo. with coral period */}
          <View className="items-center mb-10">
            <Text className="text-5xl font-extrabold text-ink mb-3" style={{ letterSpacing: -2.5 }}>
              limbo<Text className="text-coral">.</Text>
            </Text>
            <Text className="text-ink-soft text-base font-medium">
              Daily prompts with your people
            </Text>
          </View>

          {/* Signup Form - V2 Style */}
          <View className="w-full">
            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>
                Email
              </Text>
              <TextInput
                className="w-full px-4 py-4 bg-sand border border-rule rounded-[14px] text-[15px] text-ink font-medium"
                placeholder="you@example.com"
                placeholderTextColor="#6B6760"
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
              <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>
                Password
              </Text>
              <TextInput
                className="w-full px-4 py-4 bg-sand border border-rule rounded-[14px] text-[15px] text-ink font-medium"
                placeholder="At least 6 characters"
                placeholderTextColor="#6B6760"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password-new"
                editable={!loading}
              />
            </View>

            {/* Confirm Password Input */}
            <View className="mb-4">
              <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>
                Confirm Password
              </Text>
              <TextInput
                className="w-full px-4 py-4 bg-sand border border-rule rounded-[14px] text-[15px] text-ink font-medium"
                placeholder="Re-enter password"
                placeholderTextColor="#6B6760"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="password-new"
                editable={!loading}
              />
            </View>

            {/* Phone Number Input */}
            <View className="mb-4">
              <Text className="text-[13px] font-bold text-ink mb-2" style={{ letterSpacing: -0.1 }}>
                Phone Number (Optional)
              </Text>
              <TextInput
                className="w-full px-4 py-4 bg-sand border border-rule rounded-[14px] text-[15px] text-ink font-medium"
                placeholder="+14155552671"
                placeholderTextColor="#6B6760"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!loading}
              />
              <Text className="text-[11px] text-ink-soft font-medium mt-1.5 ml-1">
                For SMS reminders (optional)
              </Text>
            </View>

            {/* SMS Opt-in */}
            {phoneNumber && (
              <View className="flex-row items-center justify-between mb-4 p-4 bg-sand rounded-[14px] border border-rule">
                <View className="flex-1 mr-4">
                  <Text className="text-[13px] font-bold text-ink mb-1">
                    SMS Notifications
                  </Text>
                  <Text className="text-[11px] text-ink-soft font-medium">
                    Daily prompt reminders
                  </Text>
                </View>
                <Switch
                  value={smsOptIn}
                  onValueChange={setSmsOptIn}
                  disabled={loading}
                  trackColor={{ false: '#F2EBDD', true: '#F7DA21' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}

            {/* Terms Agreement - V2 Style */}
            <TouchableOpacity
              className="flex-row items-start mb-6 p-4 bg-sand rounded-[14px] border border-rule"
              onPress={() => setTermsAccepted(!termsAccepted)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <View
                className={`w-5 h-5 rounded-md border-2 items-center justify-center mr-3 mt-0.5 ${
                  termsAccepted ? 'bg-ink border-ink' : 'border-ink-soft bg-white'
                }`}
              >
                {termsAccepted && (
                  <Text className="text-white text-xs font-bold">✓</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-[13px] text-ink-soft font-medium leading-5">
                  I agree to the{' '}
                  <Text
                    className="font-bold text-ink underline"
                    onPress={() => router.push('/terms')}
                  >
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text
                    className="font-bold text-ink underline"
                    onPress={() => router.push('/privacy')}
                  >
                    Privacy Policy
                  </Text>
                  , including the community guidelines for user-generated content.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Error Message - V2 Style */}
            {errorMessage ? (
              <View className="mb-4 p-4 bg-coral/10 rounded-[14px] border border-coral/20">
                <Text className="text-coral text-[13px] font-bold text-center">{errorMessage}</Text>
              </View>
            ) : null}

            {/* Sign Up Button - V2 Primary */}
            <TouchableOpacity
              className={`w-full py-4 rounded-full mt-2 ${
                loading ? 'bg-ink opacity-50' : 'bg-ink'
              }`}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text className="text-white text-center font-bold text-[14px]">
                {loading ? 'Creating account...' : 'Sign Up →'}
              </Text>
            </TouchableOpacity>

            {/* Sign In Link - V2 Style */}
            <View className="mt-8">
              <Text className="text-center text-[13px] text-ink-soft font-medium">
                Already have an account?{' '}
                <Text
                  className="font-bold text-ink underline"
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
