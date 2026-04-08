import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)/feed');
    } catch (error: any) {
      const message = error.message || 'Invalid credentials';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-8">
            {/* Logo and Title */}
            <View className="items-center mb-12">
              <Text style={{ fontSize: 48, fontWeight: '900', color: '#000' }}>
                Limbo
              </Text>
              <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 8 }}>
                Sign in to continue
              </Text>
            </View>

            {/* Login Form */}
            <View className="w-full">
              {/* Email Input */}
              <View className="mb-4">
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Email
                </Text>
                <TextInput
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl"
                  style={{ paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#111827' }}
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
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Password
                </Text>
                <TextInput
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl"
                  style={{ paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#111827' }}
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
                  <Text style={{ fontSize: 14, color: '#b91c1c', textAlign: 'center' }}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Sign In Button */}
              <TouchableOpacity
                className="w-full rounded-full mt-2"
                style={{ backgroundColor: '#000', paddingVertical: 16, opacity: loading ? 0.5 : 1 }}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View className="mt-8">
                <Text style={{ textAlign: 'center', fontSize: 14, color: '#6b7280' }}>
                  Don't have an account?{' '}
                  <Text
                    style={{ fontWeight: '600', color: '#000', textDecorationLine: 'underline' }}
                    onPress={() => router.push('/auth/signup')}
                  >
                    Sign Up
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
