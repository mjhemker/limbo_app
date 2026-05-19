// App-wide constants

export const APP_NAME = 'Limbo';
export const APP_TAGLINE = 'Daily prompts with your people';

// Colors - V2 NYT-Games-inspired palette
export const COLORS = {
  // Core palette
  background: '#FBFAF7',  // Warm off-white
  card: '#FFFFFF',        // Pure white cards
  ink: '#111111',         // Primary text
  inkSoft: '#6B6760',     // Muted text
  rule: 'rgba(0,0,0,0.06)', // Subtle borders

  // Primary yellow
  primary: '#F7DA21',
  primaryHover: '#DEC41E',
  primaryActive: '#C5AD1A',
  yellow: '#F7DA21',
  yellowPale: '#FBE893',

  // Accent colors
  accent: '#F7DA21',
  accentLight: '#FBE893',
  accentPale: '#FFFDF0',

  // Functional colors
  green: '#6AAA64',
  greenPale: '#E8F1E0',
  purple: '#8E73C9',
  purpleLight: '#B8A4DB',
  blue: '#4F8FE0',
  coral: '#F26E5E',
  coralLight: '#F9A99E',
  sand: '#F2EBDD',
  gold: '#C28F2C',
  teal: '#1A6B5E',
  orange: '#F2A93B',

  // Semantic
  secondary: '#6B6760',
  success: '#6AAA64',
  warning: '#F2A93B',
  danger: '#F26E5E',
  info: '#4F8FE0',
  white: '#ffffff',
  black: '#000000',

  gray: {
    50: '#FBFAF7',
    100: '#F5F4F1',
    200: '#EDECEA',
    300: '#D5D4D2',
    400: '#9ca3af',
    500: '#6B6760',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111111',
  },
  // Circle theme colors
  circleThemes: {
    black: '#000000',
    blue: '#4F8FE0',
    purple: '#8E73C9',
    pink: '#EC4899',
    red: '#F26E5E',
    orange: '#F2A93B',
    green: '#6AAA64',
    teal: '#1A6B5E',
  },
};

// Sizes - V2 Design System
export const SIZES = {
  statusBarHeight: 44,
  tabBarHeight: 50,
  headerHeight: 56,
  // V2 Border Radius Scale
  borderRadius: {
    sm: 14,      // Pills inside cards, small chips
    md: 18,      // Cards, posts, prompt tiles (default)
    lg: 22,      // Hero blocks, screen-edge surfaces, sheets
    full: 9999,  // Pills, buttons, avatars
  },
  // V2 Spacing Scale (8px grid)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 24,
    xl: 40,
    section: 64,
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
