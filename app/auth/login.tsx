import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    console.log('Attempting login with email:', email);

    try {
      await signIn(email.trim(), password);
      console.log('Login successful');
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.message || 'Invalid credentials';
      setErrorMessage(message);
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
        <View className="flex-1 justify-center px-8">
        {/* Logo and Title */}
        <View className="items-center mb-12">
          <Text className="text-5xl font-black text-black mb-3">
            Limbo
          </Text>
          <Text className="text-gray-600 text-base">
            Sign in to continue
          </Text>
        </View>

        {/* Login Form */}
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
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Password
            </Text>
            <TextInput
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base text-gray-900"
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View className="mb-4 p-4 bg-red-50 rounded-2xl">
              <Text className="text-red-700 text-sm text-center">{errorMessage}</Text>
            </View>
          ) : null}

          {/* Sign In Button */}
          <TouchableOpacity
            className={`w-full py-4 rounded-full mt-2 ${
              loading ? 'bg-black opacity-50' : 'bg-black'
            }`}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text className="text-white text-center font-semibold text-base">
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View className="mt-8">
            <Text className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Text
                className="font-semibold text-black underline"
                onPress={() => router.push('/auth/signup')}
              >
                Sign Up
              </Text>
            </Text>
          </View>
        </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
