import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env, validateEnvironmentConfig } from '../utils/env';

const supabaseUrl = env.supabaseUrl || '';
const supabaseAnonKey = env.supabaseAnonKey || '';

// Validate environment configuration on startup
try {
  const validation = validateEnvironmentConfig();
  if (!validation.isValid) {
    console.error('Environment configuration errors:', validation.errors);
  }
} catch (e) {
  console.error('Failed to validate environment:', e);
}

// Create supabase client with fallback for missing config
let supabase: SupabaseClient;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} catch (e) {
  console.error('Failed to create Supabase client:', e);
  // Create a dummy client that won't crash but won't work
  supabase = createClient('https://placeholder.supabase.co', 'placeholder', {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export { supabase };
