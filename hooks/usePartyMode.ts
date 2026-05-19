import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  partyModeService,
  GameRoom,
  GameParticipant,
  GameRound,
  GameResponse,
  LeaderboardEntry,
} from '../services/supabase/partyMode';
import type { RealtimeChannel } from '@supabase/supabase-js';

let globalChannelId = 0;

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to all game-related changes for a specific game
 */
export function useGameRealtime(gameId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!gameId) return;

    const id = ++globalChannelId;
    const channel: RealtimeChannel = supabase
      .channel(`game:${gameId}:${id}`)
      // Room changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('Game room updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['game', gameId] });
        }
      )
      // Participant changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_participants',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log('Game participants updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['gameParticipants', gameId] });
          queryClient.invalidateQueries({ queryKey: ['gameLeaderboard', gameId] });
        }
      )
      // Round changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log('Game round updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['gameCurrentRound', gameId] });
          queryClient.invalidateQueries({ queryKey: ['gameRounds', gameId] });
          // Also invalidate responses when round changes
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            queryClient.invalidateQueries({ queryKey: ['roundResponses', payload.new.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, queryClient]);
}

/**
 * Subscribe to response changes for a specific round
 */
export function useRoundResponsesRealtime(roundId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!roundId) return;

    const id = ++globalChannelId;
    const channel: RealtimeChannel = supabase
      .channel(`round-responses:${roundId}:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_responses',
          filter: `round_id=eq.${roundId}`,
        },
        (payload) => {
          console.log('Round response updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['roundResponses', roundId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId, queryClient]);
}

// ============================================
// HEARTBEAT / PRESENCE
// ============================================

/**
 * Send periodic heartbeats to show the user is still connected
 */
export function useGameHeartbeat(gameId?: string, enabled: boolean = true) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!gameId || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Send heartbeat immediately
    partyModeService.updateHeartbeat(gameId);

    // Then every 10 seconds
    intervalRef.current = setInterval(() => {
      partyModeService.updateHeartbeat(gameId);
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Mark as disconnected on cleanup
      partyModeService.markDisconnected(gameId);
    };
  }, [gameId, enabled]);
}

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Get game room details
 */
export function useGame(gameId?: string) {
  useGameRealtime(gameId);

  return useQuery({
    queryKey: ['game', gameId],
    queryFn: () => partyModeService.getGame(gameId!),
    enabled: !!gameId,
    staleTime: 5000,
  });
}

/**
 * Get game by code
 */
export function useGameByCode(code?: string) {
  return useQuery({
    queryKey: ['gameByCode', code],
    queryFn: () => partyModeService.getGameByCode(code!),
    enabled: !!code && code.length >= 4,
    staleTime: 10000,
  });
}

/**
 * Get game participants
 */
export function useGameParticipants(gameId?: string) {
  useGameRealtime(gameId);

  return useQuery({
    queryKey: ['gameParticipants', gameId],
    queryFn: () => partyModeService.getParticipants(gameId!),
    enabled: !!gameId,
    staleTime: 3000,
    refetchInterval: 5000, // Poll for ready status updates
  });
}

/**
 * Get current active round
 */
export function useCurrentRound(gameId?: string) {
  useGameRealtime(gameId);

  return useQuery({
    queryKey: ['gameCurrentRound', gameId],
    queryFn: () => partyModeService.getCurrentRound(gameId!),
    enabled: !!gameId,
    staleTime: 1000,
    refetchInterval: 2000, // Poll frequently for round changes
  });
}

/**
 * Get all rounds for a game
 */
export function useGameRounds(gameId?: string) {
  return useQuery({
    queryKey: ['gameRounds', gameId],
    queryFn: () => partyModeService.getRounds(gameId!),
    enabled: !!gameId,
    staleTime: 10000,
  });
}

/**
 * Get responses for a round
 */
export function useRoundResponses(roundId?: string) {
  useRoundResponsesRealtime(roundId);

  return useQuery({
    queryKey: ['roundResponses', roundId],
    queryFn: () => partyModeService.getRoundResponses(roundId!),
    enabled: !!roundId,
    staleTime: 2000,
    refetchInterval: 3000,
  });
}

/**
 * Get current user's response for a round
 */
export function useMyResponse(roundId?: string, userId?: string) {
  return useQuery({
    queryKey: ['myResponse', roundId, userId],
    queryFn: () => partyModeService.getMyResponse(roundId!, userId!),
    enabled: !!roundId && !!userId,
    staleTime: 5000,
  });
}

/**
 * Get game leaderboard
 */
export function useGameLeaderboard(gameId?: string) {
  return useQuery({
    queryKey: ['gameLeaderboard', gameId],
    queryFn: () => partyModeService.getLeaderboard(gameId!),
    enabled: !!gameId,
    staleTime: 5000,
  });
}

/**
 * Get user's recent games
 */
export function useMyRecentGames(limit: number = 10) {
  return useQuery({
    queryKey: ['myRecentGames', limit],
    queryFn: () => partyModeService.getMyRecentGames(limit),
    staleTime: 30000,
  });
}

/**
 * Get user's active games
 */
export function useMyActiveGames() {
  return useQuery({
    queryKey: ['myActiveGames'],
    queryFn: () => partyModeService.getMyActiveGames(),
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new game
 */
export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      maxPlayers,
      totalRounds,
      roundDuration,
    }: {
      name?: string;
      maxPlayers?: number;
      totalRounds?: number;
      roundDuration?: number;
    }) => partyModeService.createGame(name, maxPlayers, totalRounds, roundDuration),
    onSuccess: (game) => {
      queryClient.invalidateQueries({ queryKey: ['myActiveGames'] });
      queryClient.invalidateQueries({ queryKey: ['myRecentGames'] });
      queryClient.setQueryData(['game', game.id], game);
    },
  });
}

/**
 * Join a game by code
 */
export function useJoinGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => partyModeService.joinGame(code),
    onSuccess: (result) => {
      if (result.success && result.game_id) {
        queryClient.invalidateQueries({ queryKey: ['game', result.game_id] });
        queryClient.invalidateQueries({ queryKey: ['gameParticipants', result.game_id] });
        queryClient.invalidateQueries({ queryKey: ['myActiveGames'] });
      }
    },
  });
}

/**
 * Set player ready status
 */
export function useSetPlayerReady() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, isReady }: { gameId: string; isReady: boolean }) =>
      partyModeService.setPlayerReady(gameId, isReady),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['gameParticipants', gameId] });
    },
  });
}

/**
 * Start a round (host only)
 */
export function useStartRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, promptText }: { gameId: string; promptText?: string }) =>
      partyModeService.startRound(gameId, promptText),
    onSuccess: (round) => {
      queryClient.invalidateQueries({ queryKey: ['game', round.game_id] });
      queryClient.invalidateQueries({ queryKey: ['gameCurrentRound', round.game_id] });
      queryClient.invalidateQueries({ queryKey: ['gameRounds', round.game_id] });
    },
  });
}

/**
 * End round and start voting (host only)
 */
export function useEndRoundStartVoting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roundId: string) => partyModeService.endRoundStartVoting(roundId),
    onSuccess: (round) => {
      queryClient.invalidateQueries({ queryKey: ['game', round.game_id] });
      queryClient.invalidateQueries({ queryKey: ['gameCurrentRound', round.game_id] });
      queryClient.invalidateQueries({ queryKey: ['roundResponses', round.id] });
    },
  });
}

/**
 * End voting and show results (host only)
 */
export function useEndVotingShowResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roundId: string) => partyModeService.endVotingShowResults(roundId),
    onSuccess: (round) => {
      queryClient.invalidateQueries({ queryKey: ['game', round.game_id] });
      queryClient.invalidateQueries({ queryKey: ['gameCurrentRound', round.game_id] });
      queryClient.invalidateQueries({ queryKey: ['roundResponses', round.id] });
      queryClient.invalidateQueries({ queryKey: ['gameParticipants', round.game_id] });
      queryClient.invalidateQueries({ queryKey: ['gameLeaderboard', round.game_id] });
    },
  });
}

/**
 * Submit a response
 */
export function useSubmitGameResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roundId,
      textContent,
      mediaUrl,
      mediaType,
    }: {
      roundId: string;
      textContent?: string;
      mediaUrl?: string;
      mediaType?: 'image' | 'drawing' | 'audio';
    }) => partyModeService.submitResponse(roundId, textContent, mediaUrl, mediaType),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['roundResponses', response.round_id] });
      queryClient.invalidateQueries({ queryKey: ['myResponse', response.round_id] });
    },
  });
}

/**
 * Vote for a response
 */
export function useVoteForResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (responseId: string) => partyModeService.voteForResponse(responseId),
    onSuccess: () => {
      // Responses will be invalidated by realtime
    },
  });
}

/**
 * Remove vote
 */
export function useUnvoteResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (responseId: string) => partyModeService.unvoteResponse(responseId),
    onSuccess: () => {
      // Responses will be invalidated by realtime
    },
  });
}

/**
 * End the game (host only)
 */
export function useEndGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => partyModeService.endGame(gameId),
    onSuccess: (game) => {
      queryClient.invalidateQueries({ queryKey: ['game', game.id] });
      queryClient.invalidateQueries({ queryKey: ['myActiveGames'] });
      queryClient.invalidateQueries({ queryKey: ['myRecentGames'] });
    },
  });
}

/**
 * Leave the game
 */
export function useLeaveGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => partyModeService.leaveGame(gameId),
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      queryClient.invalidateQueries({ queryKey: ['gameParticipants', gameId] });
      queryClient.invalidateQueries({ queryKey: ['myActiveGames'] });
    },
  });
}

// ============================================
// COMPOUND HOOKS
// ============================================

/**
 * All-in-one hook for the game lobby
 */
export function useGameLobby(gameId?: string) {
  const game = useGame(gameId);
  const participants = useGameParticipants(gameId);

  // Enable heartbeat in lobby
  useGameHeartbeat(gameId, game.data?.status === 'lobby');

  const allReady = participants.data?.every((p) => p.is_ready) ?? false;
  const playerCount = participants.data?.length ?? 0;

  return {
    game,
    participants,
    allReady,
    playerCount,
    canStart: allReady && playerCount >= 2,
    isLoading: game.isLoading || participants.isLoading,
    error: game.error || participants.error,
  };
}

/**
 * All-in-one hook for active game play
 */
export function useGamePlay(gameId?: string, userId?: string) {
  const game = useGame(gameId);
  const currentRound = useCurrentRound(gameId);
  const responses = useRoundResponses(currentRound.data?.id);
  const myResponse = useMyResponse(currentRound.data?.id, userId);
  const leaderboard = useGameLeaderboard(gameId);

  // Enable heartbeat during game
  useGameHeartbeat(gameId, game.data?.status !== 'ended');

  const hasSubmitted = !!myResponse.data;
  const submissionCount = responses.data?.length ?? 0;

  return {
    game,
    currentRound,
    responses,
    myResponse,
    leaderboard,
    hasSubmitted,
    submissionCount,
    isLoading: game.isLoading || currentRound.isLoading,
    error: game.error || currentRound.error,
  };
}
