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
import { ArrowLeft, Users, Clock, Layers } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useCreateGame } from '../../hooks/usePartyMode';
import { COLORS } from '../../lib/constants';

export default function CreatePartyScreen() {
  const router = useRouter();
  const createGame = useCreateGame();

  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [totalRounds, setTotalRounds] = useState(5);
  const [roundDuration, setRoundDuration] = useState(60);

  const handleCreateGame = async () => {
    try {
      const game = await createGame.mutateAsync({
        name: gameName.trim() || 'Party Game',
        maxPlayers,
        totalRounds,
        roundDuration,
      });
      router.replace(`/party/${game.id}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create game.');
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
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
          Create Party
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Game Name */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-ink-soft mb-2 uppercase tracking-wide">
            Game Name
          </Text>
          <TextInput
            value={gameName}
            onChangeText={setGameName}
            placeholder="Party Game"
            placeholderTextColor={COLORS.inkSoft}
            className="bg-card rounded-xl px-4 py-4 text-ink text-lg border border-rule"
            maxLength={30}
          />
        </View>

        {/* Max Players */}
        <View className="mb-6">
          <View className="flex-row items-center mb-2">
            <Users size={18} color={COLORS.inkSoft} />
            <Text className="text-sm font-semibold text-ink-soft ml-2 uppercase tracking-wide">
              Max Players
            </Text>
            <Text className="ml-auto text-lg font-bold text-primary">{maxPlayers}</Text>
          </View>
          <View className="bg-card rounded-xl p-4 border border-rule">
            <Slider
              value={maxPlayers}
              onValueChange={(val) => setMaxPlayers(Math.round(val))}
              minimumValue={2}
              maximumValue={20}
              step={1}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.gray[200]}
              thumbTintColor={COLORS.primary}
            />
            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-ink-soft">2</Text>
              <Text className="text-xs text-ink-soft">20</Text>
            </View>
          </View>
        </View>

        {/* Total Rounds */}
        <View className="mb-6">
          <View className="flex-row items-center mb-2">
            <Layers size={18} color={COLORS.inkSoft} />
            <Text className="text-sm font-semibold text-ink-soft ml-2 uppercase tracking-wide">
              Number of Rounds
            </Text>
            <Text className="ml-auto text-lg font-bold text-primary">{totalRounds}</Text>
          </View>
          <View className="bg-card rounded-xl p-4 border border-rule">
            <Slider
              value={totalRounds}
              onValueChange={(val) => setTotalRounds(Math.round(val))}
              minimumValue={1}
              maximumValue={10}
              step={1}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.gray[200]}
              thumbTintColor={COLORS.primary}
            />
            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-ink-soft">1</Text>
              <Text className="text-xs text-ink-soft">10</Text>
            </View>
          </View>
        </View>

        {/* Round Duration */}
        <View className="mb-8">
          <View className="flex-row items-center mb-2">
            <Clock size={18} color={COLORS.inkSoft} />
            <Text className="text-sm font-semibold text-ink-soft ml-2 uppercase tracking-wide">
              Time Per Round
            </Text>
            <Text className="ml-auto text-lg font-bold text-primary">
              {formatDuration(roundDuration)}
            </Text>
          </View>
          <View className="bg-card rounded-xl p-4 border border-rule">
            <Slider
              value={roundDuration}
              onValueChange={(val) => setRoundDuration(Math.round(val / 15) * 15)}
              minimumValue={15}
              maximumValue={180}
              step={15}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.gray[200]}
              thumbTintColor={COLORS.primary}
            />
            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-ink-soft">15s</Text>
              <Text className="text-xs text-ink-soft">3m</Text>
            </View>
          </View>
        </View>

        {/* Quick Presets */}
        <View className="mb-8">
          <Text className="text-sm font-semibold text-ink-soft mb-3 uppercase tracking-wide">
            Quick Presets
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => {
                setMaxPlayers(6);
                setTotalRounds(3);
                setRoundDuration(45);
              }}
              className="flex-1 bg-sand rounded-xl p-4 items-center"
            >
              <Text className="font-bold text-ink">Quick</Text>
              <Text className="text-xs text-ink-soft mt-1">3 rounds, 45s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setMaxPlayers(10);
                setTotalRounds(5);
                setRoundDuration(60);
              }}
              className="flex-1 bg-primary/20 rounded-xl p-4 items-center border-2 border-primary"
            >
              <Text className="font-bold text-ink">Standard</Text>
              <Text className="text-xs text-ink-soft mt-1">5 rounds, 1m</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setMaxPlayers(20);
                setTotalRounds(10);
                setRoundDuration(90);
              }}
              className="flex-1 bg-sand rounded-xl p-4 items-center"
            >
              <Text className="font-bold text-ink">Epic</Text>
              <Text className="text-xs text-ink-soft mt-1">10 rounds, 1.5m</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Create Button */}
      <View className="px-4 pb-6 pt-3 border-t border-rule">
        <TouchableOpacity
          onPress={handleCreateGame}
          disabled={createGame.isPending}
          className="bg-primary rounded-2xl py-4 items-center"
          activeOpacity={0.8}
        >
          {createGame.isPending ? (
            <ActivityIndicator color={COLORS.ink} size="small" />
          ) : (
            <Text className="text-ink text-lg font-bold">Create Game</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
