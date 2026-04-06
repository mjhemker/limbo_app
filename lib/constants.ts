// App-wide constants

export const APP_NAME = 'Limbo';
export const APP_TAGLINE = 'Daily prompts with your people';

// Colors - Amber/Orange theme matching web app
export const COLORS = {
  // Primary amber theme
  primary: '#FFBF00',
  primaryHover: '#E6AC00',
  primaryActive: '#CC9800',
  // Accent orange
  accent: '#FF7900',
  accentLight: '#F2CF7E',
  accentPale: '#FFF8E1',
  // Semantic
  secondary: '#6b7280',
  success: '#10B981',
  warning: '#F97316',
  danger: '#EF4444',
  info: '#3B82F6',
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  // Circle theme colors
  circleThemes: {
    black: '#000000',
    blue: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899',
    red: '#EF4444',
    orange: '#F97316',
    green: '#10B981',
    teal: '#14B8A6',
  },
};

// Sizes
export const SIZES = {
  statusBarHeight: 44,
  tabBarHeight: 50,
  headerHeight: 56,
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

// Limits
export const LIMITS = {
  maxPinnedResponses: 6,
  maxNudgesPerDay: 3,
  messageRetentionDays: 30,
  maxMessageLength: 1000,
  maxBioLength: 200,
  maxPromptLength: 200,
  maxResponseTextLength: 500,
  usernameMinLength: 3,
  usernameMaxLength: 20,
};

// Validation
export const VALIDATION = {
  usernameRegex: /^[a-z0-9_]{3,20}$/,
  phoneNumberRegex: /^\+[1-9]\d{1,14}$/,
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

// API
export const API = {
  timeout: 30000,
  retryAttempts: 3,
  cacheTime: 5 * 60 * 1000, // 5 minutes
  staleTime: 1 * 60 * 1000, // 1 minute
};

// Deep Linking
export const DEEP_LINKING = {
  scheme: 'limbo',
  prefixes: ['limbo://', 'https://limbo.social'],
  paths: {
    invite: '/invite',
    profile: '/profile/:userId',
    message: '/messages/:userId',
    prompt: '/prompts/:promptId',
  },
};

// Storage Keys
export const STORAGE_KEYS = {
  pendingInvite: 'pending_invite',
  authToken: 'auth_token',
  userId: 'user_id',
  theme: 'theme',
  notifications: 'notifications_enabled',
};

// Error Messages
export const ERROR_MESSAGES = {
  network: 'Network error. Please check your connection.',
  unauthorized: 'Please log in to continue.',
  notFound: 'The requested resource was not found.',
  serverError: 'Server error. Please try again later.',
  unknown: 'An unexpected error occurred.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  postCreated: 'Response posted successfully!',
  postUpdated: 'Response updated successfully!',
  friendRequestSent: 'Friend request sent!',
  friendRequestAccepted: 'Friend request accepted!',
  messageSent: 'Message sent!',
  profileUpdated: 'Profile updated successfully!',
};
