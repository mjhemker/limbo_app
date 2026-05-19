import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { notificationsService } from '../services/notifications';
import { router } from 'expo-router';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const notificationCleanupRef = useRef<(() => void) | null>(null);
  const hasRegisteredNotifications = useRef(false);

  // Register for push notifications when user is authenticated
  const registerNotifications = async (userId: string) => {
    if (hasRegisteredNotifications.current) return;
    hasRegisteredNotifications.current = true;

    try {
      // Register for push notifications
      await notificationsService.registerForPushNotifications(userId);

      // Set up notification listeners
      notificationCleanupRef.current = notificationsService.setupNotificationListeners(
        (notification) => {
          console.log('Notification received in foreground:', notification.request.content);
        },
        (response) => {
          // Handle notification tap - navigate based on data
          const data = response.notification.request.content.data;
          console.log('Notification tapped with data:', data);

          // Navigate based on notification type
          switch (data?.type) {
            case 'message':
              if (data.userId) {
                router.push(`/(tabs)/messages/${data.userId}`);
              } else {
                router.push('/(tabs)/messages');
              }
              break;
            case 'daily_prompt':
              router.push('/(tabs)/feed');
              break;
            case 'friend_request':
              router.push('/(tabs)/profile/friends');
              break;
            case 'nudge':
              router.push('/(tabs)/feed');
              break;
            case 'circle_message':
            case 'circle_prompt':
              if (data.circleId) {
                router.push(`/(tabs)/circles/${data.circleId}`);
              } else {
                router.push('/(tabs)/circles');
              }
              break;
            default:
              router.push('/(tabs)/feed');
          }
        }
      );
    } catch (error) {
      console.error('Failed to register notifications:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Register notifications if user is already logged in
      if (session?.user?.id) {
        registerNotifications(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Register notifications on sign in
      if (event === 'SIGNED_IN' && session?.user?.id) {
        registerNotifications(session.user.id);
      }

      // Clean up on sign out
      if (event === 'SIGNED_OUT') {
        hasRegisteredNotifications.current = false;
        notificationCleanupRef.current?.();
        notificationCleanupRef.current = null;
      }
    });

    return () => {
      subscription.unsubscribe();
      notificationCleanupRef.current?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const deleteAccount = async () => {
    if (!user) throw new Error('Not authenticated');

    // Call the Supabase RPC function to delete the user account
    const { error } = await supabase.rpc('delete_user_account');

    if (error) throw error;

    // Sign out after deletion
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user, loading, signIn, signUp, signOut, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
