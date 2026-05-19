import { supabase } from '../../lib/supabase';

// ============================================
// TYPES
// ============================================

export type GameRoomStatus = 'lobby' | 'playing' | 'voting' | 'results' | 'ended';
export type GameRoundStatus = 'waiting' | 'active' | 'voting' | 'results' | 'complete';

export interface GameRoom {
  id: string;
  host_id: string;
  name: string;
  code: string;
  status: GameRoomStatus;
  max_players: number;
  current_round: number;
  total_rounds: number;
  round_duration_seconds: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  // Joined data
  host?: Profile;
}

export interface GameParticipant {
  id: string;
  game_id: string;
  user_id: string;
  score: number;
  is_ready: boolean;
  is_connected: boolean;
  joined_at: string;
  last_seen_at: string;
  // Joined data
  user?: Profile;
}

export interface GameRound {
  id: string;
  game_id: string;
  round_number: number;
  prompt_id?: string;
  prompt_text: string;
  prompt_type: 'general' | 'debate' | 'draw';
  status: GameRoundStatus;
  started_at?: string;
  voting_started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface GameResponse {
  id: string;
  round_id: string;
  user_id: string;
  text_content?: string;
  media_url?: string;
  media_type?: 'image' | 'drawing' | 'audio';
  votes: number;
  submitted_at: string;
  updated_at: string;
  // Joined data
  user?: Profile;
}

export interface GameVote {
  id: string;
  response_id: string;
  voter_id: string;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  score: number;
  rank: number;
}

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

// ============================================
// SERVICE
// ============================================

export const partyModeService = {
  // ----------------------------------------
  // ROOM MANAGEMENT
  // ----------------------------------------

  /**
   * Create a new game room
   */
  async createGame(
    name: string = 'Party Game',
    maxPlayers: number = 10,
    totalRounds: number = 5,
    roundDuration: number = 60
  ): Promise<GameRoom> {
    const { data, error } = await supabase.rpc('create_game_room', {
      p_name: name,
      p_max_players: maxPlayers,
      p_total_rounds: totalRounds,
      p_round_duration: roundDuration,
    });

    if (error) {
      console.error('Create game room error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Join a game by room code
   */
  async joinGame(code: string): Promise<{ success: boolean; game_id?: string; participant_id?: string; error?: string }> {
    const { data, error } = await supabase.rpc('join_game_room', {
      p_code: code.toUpperCase().trim(),
    });

    if (error) {
      console.error('Join game room error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get game room by ID
   */
  async getGame(gameId: string): Promise<GameRoom | null> {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*, host:profiles!game_rooms_host_id_fkey(*)')
      .eq('id', gameId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Get game error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get game room by code
   */
  async getGameByCode(code: string): Promise<GameRoom | null> {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*, host:profiles!game_rooms_host_id_fkey(*)')
      .eq('code', code.toUpperCase().trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Get game by code error:', error);
      throw error;
    }

    return data;
  },

  /**
   * End the game (host only)
   */
  async endGame(gameId: string): Promise<GameRoom> {
    const { data, error } = await supabase.rpc('end_game', {
      p_game_id: gameId,
    });

    if (error) {
      console.error('End game error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Leave the game
   */
  async leaveGame(gameId: string): Promise<{ success: boolean }> {
    const { data, error } = await supabase.rpc('leave_game', {
      p_game_id: gameId,
    });

    if (error) {
      console.error('Leave game error:', error);
      throw error;
    }

    return data;
  },

  // ----------------------------------------
  // PARTICIPANTS
  // ----------------------------------------

  /**
   * Get all participants in a game
   */
  async getParticipants(gameId: string): Promise<GameParticipant[]> {
    const { data, error } = await supabase
      .from('game_participants')
      .select('*, user:profiles(*)')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Get participants error:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Set player ready status
   */
  async setPlayerReady(gameId: string, isReady: boolean): Promise<GameParticipant> {
    const { data, error } = await supabase.rpc('set_player_ready', {
      p_game_id: gameId,
      p_is_ready: isReady,
    });

    if (error) {
      console.error('Set player ready error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update heartbeat (for presence tracking)
   */
  async updateHeartbeat(gameId: string): Promise<void> {
    const { error } = await supabase.rpc('update_participant_heartbeat', {
      p_game_id: gameId,
    });

    if (error) {
      console.error('Update heartbeat error:', error);
      // Don't throw - heartbeat failures shouldn't break the game
    }
  },

  /**
   * Mark as disconnected
   */
  async markDisconnected(gameId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_participant_disconnected', {
      p_game_id: gameId,
    });

    if (error) {
      console.error('Mark disconnected error:', error);
    }
  },

  // ----------------------------------------
  // ROUNDS
  // ----------------------------------------

  /**
   * Start the next round (host only)
   */
  async startRound(gameId: string, promptText?: string): Promise<GameRound> {
    const { data, error } = await supabase.rpc('start_game_round', {
      p_game_id: gameId,
      p_prompt_text: promptText || null,
    });

    if (error) {
      console.error('Start round error:', error);
      throw error;
    }

    return data;
  },

  /**
   * End round and start voting (host only)
   */
  async endRoundStartVoting(roundId: string): Promise<GameRound> {
    const { data, error } = await supabase.rpc('end_round_start_voting', {
      p_round_id: roundId,
    });

    if (error) {
      console.error('End round start voting error:', error);
      throw error;
    }

    return data;
  },

  /**
   * End voting and show results (host only)
   */
  async endVotingShowResults(roundId: string): Promise<GameRound> {
    const { data, error } = await supabase.rpc('end_voting_show_results', {
      p_round_id: roundId,
    });

    if (error) {
      console.error('End voting show results error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get current active round for a game
   */
  async getCurrentRound(gameId: string): Promise<GameRound | null> {
    const { data, error } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_id', gameId)
      .in('status', ['active', 'voting', 'results'])
      .order('round_number', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Get current round error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get all rounds for a game
   */
  async getRounds(gameId: string): Promise<GameRound[]> {
    const { data, error } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_id', gameId)
      .order('round_number', { ascending: true });

    if (error) {
      console.error('Get rounds error:', error);
      throw error;
    }

    return data || [];
  },

  // ----------------------------------------
  // RESPONSES
  // ----------------------------------------

  /**
   * Submit a response to the current round
   */
  async submitResponse(
    roundId: string,
    textContent?: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'drawing' | 'audio'
  ): Promise<GameResponse> {
    const { data, error } = await supabase.rpc('submit_game_response', {
      p_round_id: roundId,
      p_text_content: textContent || null,
      p_media_url: mediaUrl || null,
      p_media_type: mediaType || null,
    });

    if (error) {
      console.error('Submit response error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get all responses for a round
   */
  async getRoundResponses(roundId: string): Promise<GameResponse[]> {
    const { data, error } = await supabase
      .from('game_responses')
      .select('*, user:profiles(*)')
      .eq('round_id', roundId)
      .order('votes', { ascending: false })
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error('Get round responses error:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get current user's response for a round
   */
  async getMyResponse(roundId: string, userId: string): Promise<GameResponse | null> {
    const { data, error } = await supabase
      .from('game_responses')
      .select('*')
      .eq('round_id', roundId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Get my response error:', error);
      throw error;
    }

    return data;
  },

  // ----------------------------------------
  // VOTING
  // ----------------------------------------

  /**
   * Vote for a response
   */
  async voteForResponse(responseId: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('vote_for_response', {
      p_response_id: responseId,
    });

    if (error) {
      console.error('Vote for response error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Remove vote from a response
   */
  async unvoteResponse(responseId: string): Promise<{ success: boolean }> {
    const { data, error } = await supabase.rpc('unvote_response', {
      p_response_id: responseId,
    });

    if (error) {
      console.error('Unvote response error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get votes cast by a user in a round
   */
  async getMyVotes(roundId: string, userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('game_votes')
      .select('response_id, game_responses!inner(round_id)')
      .eq('voter_id', userId)
      .eq('game_responses.round_id', roundId);

    if (error) {
      console.error('Get my votes error:', error);
      throw error;
    }

    return (data || []).map((v: any) => v.response_id);
  },

  // ----------------------------------------
  // LEADERBOARD
  // ----------------------------------------

  /**
   * Get game leaderboard
   */
  async getLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase.rpc('get_game_leaderboard', {
      p_game_id: gameId,
    });

    if (error) {
      console.error('Get leaderboard error:', error);
      throw error;
    }

    return data || [];
  },

  // ----------------------------------------
  // USER'S GAMES
  // ----------------------------------------

  /**
   * Get recent games for current user
   */
  async getMyRecentGames(limit: number = 10): Promise<GameRoom[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('game_participants')
      .select('game:game_rooms(*, host:profiles!game_rooms_host_id_fkey(*))')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get my recent games error:', error);
      throw error;
    }

    return (data || []).map((p: any) => p.game).filter(Boolean);
  },

  /**
   * Get active games user is participating in
   */
  async getMyActiveGames(): Promise<GameRoom[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('game_participants')
      .select('game:game_rooms(*, host:profiles!game_rooms_host_id_fkey(*))')
      .eq('user_id', user.id)
      .in('game.status', ['lobby', 'playing', 'voting', 'results']);

    if (error) {
      console.error('Get my active games error:', error);
      throw error;
    }

    return (data || []).map((p: any) => p.game).filter((g: any) => g && g.status !== 'ended');
  },
};
