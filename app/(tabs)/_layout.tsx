import { useRef } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { Tabs, useSegments, usePathname, useRouter } from 'expo-router';
import { Home, MessageCircle, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

// V2 Custom animated tab bar - 3 tabs: Home, Circles, Profile
function CustomTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();

  // Tab configuration: Feed, Circles, Profile (3 tabs - Explore removed)
  const tabs = [
    { name: 'feed', icon: Home },
    { name: 'circles', icon: MessageCircle },
    { name: 'profile', icon: User },
  ];

  // Determine active tab index
  const getActiveIndex = () => {
    if (pathname.startsWith('/feed') || pathname === '/') return 0;
    if (pathname.startsWith('/circles') || pathname.startsWith('/messages')) return 1;
    if (pathname.startsWith('/profile')) return 2;
    return 0;
  };

  const activeIndex = getActiveIndex();

  // Animated scale values for each tab
  const scaleValues = useRef(tabs.map(() => new Animated.Value(1))).current;

  // Animate tab press
  const handleTabPress = (tabName: string, index: number) => {
    // Scale animation
    Animated.sequence([
      Animated.timing(scaleValues[index], {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValues[index], {
        toValue: 1,
        friction: 4,
        tension: 300,
        useNativeDriver: true,
      }),
    ]).start();

    if (tabName === 'profile' && user) {
      router.push(`/(tabs)/profile/${user.id}`);
    } else if (tabName === 'circles') {
      router.push('/(tabs)/circles');
    } else {
      router.push(`/(tabs)/${tabName}`);
    }
  };

  const ICON_SIZE = 22;
  const CIRCLE_SIZE = 40;

  return (
    <View
      className="absolute bottom-0 left-0 right-0 items-center"
      style={{ paddingBottom: insets.bottom || 12 }}
    >
      {/* Sand pill container for 3 tabs - wider with more gap */}
      <View
        className="flex-row items-center justify-between bg-sand rounded-full"
        style={{ paddingHorizontal: 24, paddingVertical: 6, gap: 32, minWidth: 220 }}
      >
        {tabs.map((tab, index) => {
          const isActive = activeIndex === index;
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handleTabPress(tab.name, index)}
              activeOpacity={0.7}
              style={{
                width: CIRCLE_SIZE,
                height: CIRCLE_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Animated.View
                style={{
                  transform: [{ scale: scaleValues[index] }],
                  width: CIRCLE_SIZE,
                  height: CIRCLE_SIZE,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive ? '#1A1A1A' : 'transparent',
                  borderRadius: CIRCLE_SIZE / 2,
                }}
              >
                <Icon
                  size={ICON_SIZE}
                  strokeWidth={2}
                  color={isActive ? '#ffffff' : '#6B6B6B'}
                />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  // Hide tab bar when inside a chat detail screen or specific pages
  const inChatDetail =
    (segments.includes('messages') && segments.length > 2 && segments[segments.length - 1] !== 'index') ||
    (segments.includes('circles') && segments.length > 2 && segments[segments.length - 1] !== 'index');

  return (
    <View className="flex-1 bg-background">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, // Hide default tab bar
        }}
      >
        <Tabs.Screen name="feed" />
        <Tabs.Screen name="circles" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="messages" options={{ href: null }} />
      </Tabs>

      {/* Custom animated tab bar */}
      {!inChatDetail && <CustomTabBar />}
    </View>
  );
}
