import { Tabs, useSegments } from 'expo-router';
import { Home, MessageCircle, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useUnreadCount } from '../../hooks/useMessages';
import { COLORS } from '../../lib/constants';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: unreadCount } = useUnreadCount(user?.id);
  const segments = useSegments();

  // Hide tab bar when inside a chat detail screen
  // segments looks like ['(tabs)', 'messages', '[userId]'] or ['(tabs)', 'circles', '[id]']
  const inChatDetail =
    (segments.includes('messages') && segments.length > 2 && segments[segments.length - 1] !== 'index') ||
    (segments.includes('circles') && segments.length > 2 && segments[segments.length - 1] !== 'index');

  const tabBarStyle = inChatDetail
    ? { display: 'none' as const }
    : {
        backgroundColor: '#ffffff',
        borderTopColor: '#e5e7eb',
        borderTopWidth: 1,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        paddingTop: 8,
        height: insets.bottom > 0 ? 60 + insets.bottom : 60,
      };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <MessageCircle color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
          ),
          tabBarBadge: unreadCount && unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.accent,
            color: '#fff',
            fontSize: 10,
            minWidth: 18,
            height: 18,
          },
        }}
      />
      <Tabs.Screen
        name="circles"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
