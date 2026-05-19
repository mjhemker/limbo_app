import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Users, Gamepad2, Clock } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useJoinGame, useMyActiveGames, useMyRecentGames } from '../../hooks/usePartyMode';
import { COLORS } from '../../lib/constants';

export default function PartyHubScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const joinGame = useJoinGame();
  const { data: activeGames, isLoading: loadingActive } = useMyActiveGames();
  const { data: recentGames, isLoading: loadingRecent } = useMyRecentGames(5);

  const handleJoinGame = async () => {
    if (!joinCode.trim() || joinCode.length < 4) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-character game code.');
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinGame.mutateAsync(joinCode.trim());
      if (result.success && result.game_id) {
        router.push(`/party/${result.game_id}`);
      } else {
        Alert.alert('Could not join', result.error || 'Game not found or already started.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join game.');
    } finally {
      setIsJoining(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-rule">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full"
        >
          <ArrowLeft size={24} color={COLORS.ink} />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-ink text-center mr-10">
          Party Mode
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Create Game Card */}
        <TouchableOpacity
          onPress={() => router.push('/party/create')}
          className="bg-primary rounded-2xl p-6 mb-6"
          activeOpacity={0.8}
        >
          <View className="flex-row items-center">
            <View className="w-14 h-14 bg-ink/10 rounded-full items-center justify-center mr-4">
              <Plus size={28} color={COLORS.ink} />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-ink mb-1">Start a Party</Text>
              <Text className="text-ink/70">Create a new game room</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Join Game Section */}
        <View className="bg-card rounded-2xl p-5 mb-6 border border-rule">
          <Text className="text-lg font-bold text-ink mb-4">Join a Game</Text>
          <View className="flex-row gap-3">
            <TextInput
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              placeholder="Enter code"
              placeholderTextColor={COLORS.inkSoft}
              className="flex-1 bg-background rounded-xl px-4 py-3 text-ink text-lg font-semibold tracking-widest text-center border border-rule"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={handleJoinGame}
              disabled={isJoining || joinCode.length < 4}
              className={`px-6 rounded-xl items-center justify-center ${
                joinCode.length >= 4 ? 'bg-ink' : 'bg-gray-300'
              }`}
            >
              {isJoining ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-semibold">Join</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Games */}
        {(loadingActive || (activeGames && activeGames.length > 0)) && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-ink mb-3">Active Games</Text>
            {loadingActive ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              activeGames?.map((game) => (
                <TouchableOpacity
                  key={game.id}
                  onPress={() => router.push(`/party/${game.id}`)}
                  className="bg-green-pale rounded-xl p-4 mb-2 flex-row items-center"
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 bg-green rounded-full items-center justify-center mr-3">
                    <Gamepad2 size={20} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-ink">{game.name}</Text>
                    <Text className="text-sm text-ink-soft">
                      Code: {game.code} • {game.status}
                    </Text>
                  </View>
                  <View className="bg-green px-3 py-1 rounded-full">
                    <Text className="text-white text-xs font-semibold">LIVE</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Recent Games */}
        {(loadingRecent || (recentGames && recentGames.length > 0)) && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-ink mb-3">Recent Games</Text>
            {loadingRecent ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              recentGames
                ?.filter((g) => g.status === 'ended')
                .slice(0, 5)
                .map((game) => (
                  <View
                    key={game.id}
                    className="bg-card rounded-xl p-4 mb-2 flex-row items-center border border-rule"
                  >
                    <View className="w-10 h-10 bg-sand rounded-full items-center justify-center mr-3">
                      <Clock size={20} color={COLORS.inkSoft} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-ink">{game.name}</Text>
                      <Text className="text-sm text-ink-soft">
                        {game.total_rounds} rounds • {formatTimeAgo(game.ended_at || game.created_at)}
                      </Text>
                    </View>
                  </View>
                ))
            )}
          </View>
        )}

        {/* How it works */}
        <View className="bg-sand rounded-2xl p-5">
          <Text className="text-lg font-bold text-ink mb-3">How Party Mode Works</Text>
          <View className="space-y-3">
            <View className="flex-row items-start">
              <Text className="text-primary font-bold mr-3">1.</Text>
              <Text className="flex-1 text-ink-soft">
                Create a room and share the code with friends
              </Text>
            </View>
            <View className="flex-row items-start mt-2">
              <Text className="text-primary font-bold mr-3">2.</Text>
              <Text className="flex-1 text-ink-soft">
                Everyone answers the same prompt within the time limit
              </Text>
            </View>
            <View className="flex-row items-start mt-2">
              <Text className="text-primary font-bold mr-3">3.</Text>
              <Text className="flex-1 text-ink-soft">
                Vote on your favorite responses and see who wins!
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
