import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Copy,
  Share2,
  Users,
  Check,
  Crown,
  Clock,
  Send,
  Trophy,
  Medal,
  ThumbsUp,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import {
  useGame,
  useGameParticipants,
  useCurrentRound,
  useRoundResponses,
  useGameLeaderboard,
  useSetPlayerReady,
  useStartRound,
  useEndRoundStartVoting,
  useEndVotingShowResults,
  useSubmitGameResponse,
  useVoteForResponse,
  useEndGame,
  useLeaveGame,
  useGameHeartbeat,
} from '../../hooks/usePartyMode';
import { COLORS } from '../../lib/constants';
import { Image } from 'expo-image';

export default function GameScreen() {
  const router = useRouter();
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { user } = useAuth();

  const { data: game, isLoading: loadingGame, error: gameError } = useGame(gameId);
  const { data: participants } = useGameParticipants(gameId);
  const { data: currentRound } = useCurrentRound(gameId);
  const { data: responses } = useRoundResponses(currentRound?.id);
  const { data: leaderboard } = useGameLeaderboard(gameId);

  const setReady = useSetPlayerReady();
  const startRound = useStartRound();
  const endRoundVoting = useEndRoundStartVoting();
  const endVotingResults = useEndVotingShowResults();
  const submitResponse = useSubmitGameResponse();
  const voteForResponse = useVoteForResponse();
  const endGame = useEndGame();
  const leaveGame = useLeaveGame();

  // Enable heartbeat
  useGameHeartbeat(gameId, game?.status !== 'ended');

  const isHost = game?.host_id === user?.id;
  const myParticipant = participants?.find((p) => p.user_id === user?.id);
  const myResponse = responses?.find((r) => r.user_id === user?.id);
  const allReady = participants?.every((p) => p.is_ready) ?? false;
  const canStart = allReady && (participants?.length ?? 0) >= 2;

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (currentRound?.status === 'active' && currentRound.started_at && game?.round_duration_seconds) {
      const startTime = new Date(currentRound.started_at).getTime();
      const duration = game.round_duration_seconds * 1000;

      const updateTimer = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0 && isHost) {
          // Auto-end round when time is up
          endRoundVoting.mutate(currentRound.id);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [currentRound, game]);

  const handleCopyCode = async () => {
    if (game?.code) {
      await Clipboard.setStringAsync(game.code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Game code copied to clipboard.');
    }
  };

  const handleShare = async () => {
    if (game?.code) {
      try {
        await Share.share({
          message: `Join my Limbo party game! Code: ${game.code}`,
        });
      } catch (e) {
        // Ignore
      }
    }
  };

  const handleToggleReady = () => {
    if (myParticipant && gameId) {
      setReady.mutate({ gameId, isReady: !myParticipant.is_ready });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleStartGame = () => {
    if (gameId) {
      startRound.mutate({ gameId });
    }
  };

  const handleLeaveGame = () => {
    Alert.alert('Leave Game', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (gameId) {
            await leaveGame.mutateAsync(gameId);
            router.replace('/party');
          }
        },
      },
    ]);
  };

  if (loadingGame) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-ink-soft mt-4">Loading game...</Text>
      </SafeAreaView>
    );
  }

  if (gameError || !game) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-xl font-bold text-ink mb-2">Game Not Found</Text>
        <Text className="text-ink-soft text-center mb-6">
          This game may have ended or the code is invalid.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/party')}
          className="bg-primary px-6 py-3 rounded-xl"
        >
          <Text className="font-semibold text-ink">Back to Party Hub</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Render based on game status
  if (game.status === 'lobby') {
    return <LobbyView />;
  }

  if (game.status === 'ended') {
    return <FinalResultsView />;
  }

  // Playing, voting, or showing results
  return <GamePlayView />;

  // ============================================
  // LOBBY VIEW
  // ============================================
  function LobbyView() {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-rule">
          <TouchableOpacity
            onPress={handleLeaveGame}
            className="w-10 h-10 items-center justify-center rounded-full"
          >
            <ArrowLeft size={24} color={COLORS.ink} />
          </TouchableOpacity>
          <Text className="flex-1 text-xl font-bold text-ink text-center" numberOfLines={1}>
            {game.name}
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 px-4 py-6">
          {/* Game Code Card */}
          <View className="bg-primary rounded-2xl p-6 mb-6 items-center">
            <Text className="text-ink/70 text-sm mb-2">GAME CODE</Text>
            <Text className="text-4xl font-black text-ink tracking-widest mb-4">
              {game.code}
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCopyCode}
                className="flex-row items-center bg-ink/10 px-4 py-2 rounded-full"
              >
                <Copy size={16} color={COLORS.ink} />
                <Text className="ml-2 font-semibold text-ink">Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShare}
                className="flex-row items-center bg-ink/10 px-4 py-2 rounded-full"
              >
                <Share2 size={16} color={COLORS.ink} />
                <Text className="ml-2 font-semibold text-ink">Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Players */}
          <View className="bg-card rounded-2xl p-5 border border-rule mb-6">
            <View className="flex-row items-center mb-4">
              <Users size={20} color={COLORS.ink} />
              <Text className="text-lg font-bold text-ink ml-2">
                Players ({participants?.length || 0}/{game.max_players})
              </Text>
            </View>
            {participants?.map((p) => (
              <View
                key={p.id}
                className="flex-row items-center py-3 border-b border-rule last:border-b-0"
              >
                <View className="w-10 h-10 bg-sand rounded-full items-center justify-center mr-3">
                  {p.user?.avatar_url ? (
                    <Image
                      source={{ uri: p.user.avatar_url }}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <Text className="text-ink font-bold">
                      {(p.user?.display_name || p.user?.username || '?')[0].toUpperCase()}
                    </Text>
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="font-semibold text-ink">
                      {p.user?.display_name || p.user?.username}
                    </Text>
                    {p.user_id === game.host_id && (
                      <Crown size={14} color={COLORS.primary} className="ml-1" />
                    )}
                  </View>
                  {p.user_id === user?.id && (
                    <Text className="text-xs text-ink-soft">You</Text>
                  )}
                </View>
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    p.is_ready ? 'bg-green' : 'bg-gray-200'
                  }`}
                >
                  {p.is_ready && <Check size={18} color="#fff" />}
                </View>
              </View>
            ))}
          </View>

          {/* Game Settings */}
          <View className="bg-sand rounded-2xl p-5">
            <Text className="text-sm font-semibold text-ink-soft mb-3 uppercase tracking-wide">
              Game Settings
            </Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-ink-soft">Rounds</Text>
              <Text className="font-semibold text-ink">{game.total_rounds}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-ink-soft">Time per round</Text>
              <Text className="font-semibold text-ink">{game.round_duration_seconds}s</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View className="px-4 pb-6 pt-3 border-t border-rule">
          {isHost ? (
            <TouchableOpacity
              onPress={handleStartGame}
              disabled={!canStart || startRound.isPending}
              className={`py-4 rounded-2xl items-center ${
                canStart ? 'bg-green' : 'bg-gray-300'
              }`}
            >
              {startRound.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-lg font-bold">
                  {canStart ? 'Start Game' : 'Waiting for players...'}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleToggleReady}
              disabled={setReady.isPending}
              className={`py-4 rounded-2xl items-center ${
                myParticipant?.is_ready ? 'bg-green' : 'bg-primary'
              }`}
            >
              {setReady.isPending ? (
                <ActivityIndicator color={myParticipant?.is_ready ? '#fff' : COLORS.ink} />
              ) : (
                <Text
                  className={`text-lg font-bold ${
                    myParticipant?.is_ready ? 'text-white' : 'text-ink'
                  }`}
                >
                  {myParticipant?.is_ready ? "Ready!" : "I'm Ready"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ============================================
  // GAME PLAY VIEW (Playing, Voting, Results)
  // ============================================
  function GamePlayView() {
    const [responseText, setResponseText] = useState('');
    const [votedFor, setVotedFor] = useState<string | null>(null);

    const handleSubmitResponse = async () => {
      if (!currentRound?.id || !responseText.trim()) return;

      try {
        await submitResponse.mutateAsync({
          roundId: currentRound.id,
          textContent: responseText.trim(),
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        Alert.alert('Error', 'Failed to submit response.');
      }
    };

    const handleVote = async (responseId: string) => {
      if (votedFor === responseId) return;
      setVotedFor(responseId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await voteForResponse.mutateAsync(responseId);
    };

    const handleNextRound = () => {
      if (gameId && game.current_round < game.total_rounds) {
        startRound.mutate({ gameId });
      } else if (gameId) {
        endGame.mutate(gameId);
      }
    };

    const handleEndRound = () => {
      if (currentRound?.id) {
        endRoundVoting.mutate(currentRound.id);
      }
    };

    const handleEndVoting = () => {
      if (currentRound?.id) {
        endVotingResults.mutate(currentRound.id);
      }
    };

    return (
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-rule">
          <View className="flex-row items-center">
            <Text className="text-ink-soft">Round</Text>
            <Text className="text-xl font-bold text-ink ml-2">
              {game.current_round}/{game.total_rounds}
            </Text>
          </View>
          <View className="flex-1" />
          {currentRound?.status === 'active' && timeLeft !== null && (
            <View
              className={`flex-row items-center px-3 py-1 rounded-full ${
                timeLeft <= 10 ? 'bg-coral' : 'bg-sand'
              }`}
            >
              <Clock size={16} color={timeLeft <= 10 ? '#fff' : COLORS.ink} />
              <Text
                className={`ml-1 font-bold ${
                  timeLeft <= 10 ? 'text-white' : 'text-ink'
                }`}
              >
                {timeLeft}s
              </Text>
            </View>
          )}
          {currentRound?.status === 'voting' && (
            <View className="bg-purple px-3 py-1 rounded-full">
              <Text className="text-white font-semibold">VOTING</Text>
            </View>
          )}
          {currentRound?.status === 'results' && (
            <View className="bg-green px-3 py-1 rounded-full">
              <Text className="text-white font-semibold">RESULTS</Text>
            </View>
          )}
        </View>

        {/* Prompt */}
        <View className="bg-primary px-4 py-6">
          <Text className="text-2xl font-bold text-ink text-center">
            {currentRound?.prompt_text || 'Loading prompt...'}
          </Text>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          {/* ACTIVE ROUND - Show input or submitted response */}
          {currentRound?.status === 'active' && (
            <>
              {myResponse ? (
                <View className="bg-green-pale rounded-2xl p-5 border-2 border-green mb-4">
                  <View className="flex-row items-center mb-2">
                    <Check size={20} color={COLORS.green} />
                    <Text className="ml-2 font-semibold text-green">Submitted!</Text>
                  </View>
                  <Text className="text-ink">{myResponse.text_content}</Text>
                </View>
              ) : (
                <View className="bg-card rounded-2xl p-4 border border-rule mb-4">
                  <TextInput
                    value={responseText}
                    onChangeText={setResponseText}
                    placeholder="Type your answer..."
                    placeholderTextColor={COLORS.inkSoft}
                    multiline
                    className="text-ink text-lg min-h-[100px]"
                    maxLength={500}
                  />
                  <View className="flex-row justify-between items-center mt-3">
                    <Text className="text-xs text-ink-soft">
                      {responseText.length}/500
                    </Text>
                    <TouchableOpacity
                      onPress={handleSubmitResponse}
                      disabled={!responseText.trim() || submitResponse.isPending}
                      className={`flex-row items-center px-5 py-2 rounded-full ${
                        responseText.trim() ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      {submitResponse.isPending ? (
                        <ActivityIndicator size="small" color={COLORS.ink} />
                      ) : (
                        <>
                          <Send size={18} color={COLORS.ink} />
                          <Text className="ml-2 font-semibold text-ink">Submit</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Submission status */}
              <View className="bg-sand rounded-xl p-4">
                <Text className="text-ink-soft text-center">
                  {responses?.length || 0} of {participants?.length || 0} submitted
                </Text>
              </View>
            </>
          )}

          {/* VOTING - Show all responses */}
          {currentRound?.status === 'voting' && (
            <View>
              <Text className="text-lg font-bold text-ink mb-4">
                Vote for your favorite!
              </Text>
              {responses
                ?.filter((r) => r.user_id !== user?.id)
                .map((response) => (
                  <Pressable
                    key={response.id}
                    onPress={() => handleVote(response.id)}
                    className={`bg-card rounded-2xl p-4 mb-3 border-2 ${
                      votedFor === response.id ? 'border-purple' : 'border-rule'
                    }`}
                  >
                    <Text className="text-ink text-lg">{response.text_content}</Text>
                    {votedFor === response.id && (
                      <View className="absolute top-3 right-3 bg-purple rounded-full p-1">
                        <ThumbsUp size={16} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                ))}
              {myResponse && (
                <View className="bg-ink/5 rounded-2xl p-4 mt-2">
                  <Text className="text-xs text-ink-soft mb-1">Your answer:</Text>
                  <Text className="text-ink">{myResponse.text_content}</Text>
                </View>
              )}
            </View>
          )}

          {/* RESULTS - Show results with votes */}
          {currentRound?.status === 'results' && (
            <View>
              <Text className="text-lg font-bold text-ink mb-4">Round Results</Text>
              {responses
                ?.sort((a, b) => b.votes - a.votes)
                .map((response, index) => (
                  <View
                    key={response.id}
                    className={`rounded-2xl p-4 mb-3 ${
                      index === 0 ? 'bg-primary' : 'bg-card border border-rule'
                    }`}
                  >
                    <View className="flex-row items-center mb-2">
                      {index === 0 && <Trophy size={20} color={COLORS.ink} />}
                      {index === 1 && <Medal size={20} color="#94a3b8" />}
                      {index === 2 && <Medal size={20} color="#d97706" />}
                      <Text className="font-bold text-ink ml-2">
                        {response.user?.display_name || response.user?.username}
                      </Text>
                      <View className="ml-auto flex-row items-center">
                        <ThumbsUp size={16} color={COLORS.inkSoft} />
                        <Text className="ml-1 font-bold text-ink">{response.votes}</Text>
                      </View>
                    </View>
                    <Text className="text-ink">{response.text_content}</Text>
                  </View>
                ))}
            </View>
          )}
        </ScrollView>

        {/* Host Controls */}
        {isHost && (
          <View className="px-4 pb-6 pt-3 border-t border-rule">
            {currentRound?.status === 'active' && (
              <TouchableOpacity
                onPress={handleEndRound}
                disabled={endRoundVoting.isPending}
                className="bg-purple py-4 rounded-2xl items-center"
              >
                {endRoundVoting.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-lg font-bold">End Round &rarr; Voting</Text>
                )}
              </TouchableOpacity>
            )}
            {currentRound?.status === 'voting' && (
              <TouchableOpacity
                onPress={handleEndVoting}
                disabled={endVotingResults.isPending}
                className="bg-green py-4 rounded-2xl items-center"
              >
                {endVotingResults.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-lg font-bold">Show Results</Text>
                )}
              </TouchableOpacity>
            )}
            {currentRound?.status === 'results' && (
              <TouchableOpacity
                onPress={handleNextRound}
                disabled={startRound.isPending || endGame.isPending}
                className="bg-primary py-4 rounded-2xl items-center"
              >
                {startRound.isPending || endGame.isPending ? (
                  <ActivityIndicator color={COLORS.ink} />
                ) : (
                  <Text className="text-ink text-lg font-bold">
                    {game.current_round < game.total_rounds ? 'Next Round' : 'Finish Game'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ============================================
  // FINAL RESULTS VIEW
  // ============================================
  function FinalResultsView() {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView className="flex-1 px-4 py-6">
          {/* Winner Announcement */}
          <View className="items-center mb-8">
            <Trophy size={48} color={COLORS.primary} />
            <Text className="text-3xl font-black text-ink mt-4">Game Over!</Text>
          </View>

          {/* Podium */}
          {leaderboard && leaderboard.length > 0 && (
            <View className="flex-row justify-center items-end mb-8 px-4">
              {/* 2nd Place */}
              {leaderboard[1] && (
                <View className="items-center mx-2">
                  <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-2">
                    {leaderboard[1].avatar_url ? (
                      <Image
                        source={{ uri: leaderboard[1].avatar_url }}
                        className="w-16 h-16 rounded-full"
                      />
                    ) : (
                      <Text className="text-2xl font-bold text-ink">2</Text>
                    )}
                  </View>
                  <Text className="font-semibold text-ink text-center" numberOfLines={1}>
                    {leaderboard[1].display_name || leaderboard[1].username}
                  </Text>
                  <Text className="text-ink-soft">{leaderboard[1].score} pts</Text>
                </View>
              )}

              {/* 1st Place */}
              {leaderboard[0] && (
                <View className="items-center mx-2 -mt-8">
                  <Crown size={32} color={COLORS.primary} className="mb-2" />
                  <View className="w-20 h-20 bg-primary rounded-full items-center justify-center mb-2 border-4 border-yellow-pale">
                    {leaderboard[0].avatar_url ? (
                      <Image
                        source={{ uri: leaderboard[0].avatar_url }}
                        className="w-20 h-20 rounded-full"
                      />
                    ) : (
                      <Text className="text-3xl font-bold text-ink">1</Text>
                    )}
                  </View>
                  <Text className="font-bold text-ink text-center text-lg" numberOfLines={1}>
                    {leaderboard[0].display_name || leaderboard[0].username}
                  </Text>
                  <Text className="text-primary font-bold">{leaderboard[0].score} pts</Text>
                </View>
              )}

              {/* 3rd Place */}
              {leaderboard[2] && (
                <View className="items-center mx-2">
                  <View className="w-16 h-16 bg-orange/20 rounded-full items-center justify-center mb-2">
                    {leaderboard[2].avatar_url ? (
                      <Image
                        source={{ uri: leaderboard[2].avatar_url }}
                        className="w-16 h-16 rounded-full"
                      />
                    ) : (
                      <Text className="text-2xl font-bold text-ink">3</Text>
                    )}
                  </View>
                  <Text className="font-semibold text-ink text-center" numberOfLines={1}>
                    {leaderboard[2].display_name || leaderboard[2].username}
                  </Text>
                  <Text className="text-ink-soft">{leaderboard[2].score} pts</Text>
                </View>
              )}
            </View>
          )}

          {/* Full Leaderboard */}
          <View className="bg-card rounded-2xl p-4 border border-rule">
            <Text className="text-lg font-bold text-ink mb-4">Final Standings</Text>
            {leaderboard?.map((entry, index) => (
              <View
                key={entry.user_id}
                className="flex-row items-center py-3 border-b border-rule last:border-b-0"
              >
                <Text className="w-8 text-lg font-bold text-ink-soft">#{index + 1}</Text>
                <View className="w-10 h-10 bg-sand rounded-full items-center justify-center mr-3">
                  {entry.avatar_url ? (
                    <Image
                      source={{ uri: entry.avatar_url }}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <Text className="font-bold text-ink">
                      {(entry.display_name || entry.username)[0].toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text className="flex-1 font-semibold text-ink">
                  {entry.display_name || entry.username}
                </Text>
                <Text className="font-bold text-primary">{entry.score}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Actions */}
        <View className="px-4 pb-6 pt-3 border-t border-rule gap-3">
          <TouchableOpacity
            onPress={() => router.replace('/party/create')}
            className="bg-primary py-4 rounded-2xl items-center"
          >
            <Text className="text-ink text-lg font-bold">Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace('/party')}
            className="py-3 items-center"
          >
            <Text className="text-ink-soft font-semibold">Back to Party Hub</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}
