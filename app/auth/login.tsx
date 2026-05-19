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
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32, minHeight: '100%' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          style={{ flex: 1, backgroundColor: '#FBFAF7' }}
        >
          <View className="px-8" style={{ maxWidth: 500, alignSelf: 'center', width: '100%' }}>
            {/* V2 Logo - limbo. with coral period */}
            <View className="items-center mb-12">
              <Text style={{ fontSize: 48, fontWeight: '800', color: '#111111', letterSpacing: -2.5 }}>
                limbo<Text style={{ color: '#F26E5E' }}>.</Text>
              </Text>
              <Text style={{ fontSize: 15, color: '#6B6760', marginTop: 8, fontWeight: '500' }}>
                Sign in to continue
              </Text>
            </View>

            {/* Login Form - V2 Style */}
            <View className="w-full">
              {/* Email Input */}
              <View className="mb-4">
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111111', marginBottom: 8, letterSpacing: -0.1 }}>
                  Email
                </Text>
                <TextInput
                  className="w-full bg-sand border border-rule rounded-[14px]"
                  style={{ paddingHorizontal: 16, paddingVertical: 16, fontSize: 15, color: '#111111', fontWeight: '500' }}
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
              <View className="mb-6">
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111111', marginBottom: 8, letterSpacing: -0.1 }}>
                  Password
                </Text>
                <TextInput
                  className="w-full bg-sand border border-rule rounded-[14px]"
                  style={{ paddingHorizontal: 16, paddingVertical: 16, fontSize: 15, color: '#111111', fontWeight: '500' }}
                  placeholder="••••••••"
                  placeholderTextColor="#6B6760"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  editable={!loading}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
              </View>

              {/* Error Message - V2 Style */}
              {errorMessage ? (
                <View className="mb-4 p-4 bg-coral/10 rounded-[14px] border border-coral/20">
                  <Text style={{ fontSize: 13, color: '#F26E5E', textAlign: 'center', fontWeight: '700' }}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Sign In Button - V2 Primary */}
              <TouchableOpacity
                className="w-full rounded-full mt-2"
                style={{ backgroundColor: '#111111', paddingVertical: 16, opacity: loading ? 0.5 : 1 }}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700', fontSize: 14 }}>
                  {loading ? 'Signing in...' : 'Sign In →'}
                </Text>
              </TouchableOpacity>

              {/* Sign Up Link - V2 Style */}
              <View className="mt-8">
                <Text style={{ textAlign: 'center', fontSize: 13, color: '#6B6760', fontWeight: '500' }}>
                  Don't have an account?{' '}
                  <Text
                    style={{ fontWeight: '700', color: '#111111', textDecorationLine: 'underline' }}
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
