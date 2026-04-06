// Shared TypeScript types and interfaces

// User types
export interface User {
  id: string;
  email: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  phone_number?: string;
  sms_opt_in: boolean;
  expo_push_token?: string;
  streak: number;
  friend_count: number;
  created_at: string;
  updated_at: string;
}

// Profile types
export interface Profile extends User {}

// Prompt types
export interface Prompt {
  id: string;
  text: string;
  active_date: string;
  created_at: string;
  is_optional: boolean;
}

// Response types
export interface Response {
  id: string;
  user_id: string;
  prompt_id: string;
  text_content?: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  audio_url?: string;
  is_visible: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
  prompt?: Prompt;
}

// Message types
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content?: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  audio_url?: string;
  is_read: boolean;
  created_at: string;
  sender?: User;
  receiver?: User;
}

export interface Conversation {
  partner: User;
  lastMessage?: Message;
  unreadCount: number;
}

// Friendship types
export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  user?: User;
  friend?: User;
  sender?: User;
}

// Circle types
export interface Circle {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  creator_id: string;
  created_at: string;
  member_count?: number;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user?: User;
}

export interface CirclePrompt {
  id: string;
  circle_id: string;
  text: string;
  created_by: string;
  created_at: string;
  creator?: User;
}

export interface CircleResponse {
  id: string;
  circle_prompt_id: string;
  user_id: string;
  text_content?: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  created_at: string;
  user?: User;
}

export interface CircleMessage {
  id: string;
  circle_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: User;
}

// Reaction types
export interface Reaction {
  id: string;
  user_id: string;
  response_id?: string;
  message_id?: string;
  emoji: string;
  created_at: string;
  user?: User;
}

// Nudge types
export interface NudgeRequest {
  senderId: string;
  receiverId: string;
}

export interface NudgeResponse {
  success: boolean;
  message: string;
}

// File upload types
export interface FileUpload {
  uri: string;
  type?: string;
  name?: string;
}

// API response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

// Navigation types
export type RootStackParamList = {
  '/(tabs)/feed': undefined;
  '/(tabs)/messages': undefined;
  '/(tabs)/circles': undefined;
  '/(tabs)/profile': undefined;
  '/compose': undefined;
  '/invite': { from: string };
  '/auth/login': undefined;
  '/auth/signup': undefined;
  '/auth/profile-setup': undefined;
};

// Component prop types
export interface BaseComponentProps {
  className?: string;
}

export interface WithChildren {
  children: React.ReactNode;
}

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncFunction<T = void> = () => Promise<T>;
