# Limbo - React Native Mobile App

Daily prompts with your people - now on mobile!

## Project Setup

This is a React Native app built with Expo and TypeScript, migrated from the Limbo PWA codebase.

### Tech Stack

- **Framework:** Expo SDK 55+ with Expo Router
- **Language:** TypeScript
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State Management:** @tanstack/react-query
- **Backend:** Supabase (Auth, Database, Storage)
- **Navigation:** Expo Router (file-based routing)
- **Icons:** Lucide React Native

### Prerequisites

- Node.js 18+
- npm or yarn
- iOS Simulator (macOS) or Android Studio (for Android development)
- Expo Go app (for testing on physical devices)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the `.env` file and add your credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_API_URL=your-backend-api-url
```

### 3. Run the App

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

## Project Structure

```
limbo-mobile/
├── app/                    # Expo Router app directory
│   ├── (tabs)/            # Tab navigator screens
│   │   ├── feed/          # Feed tab
│   │   ├── messages/      # Messages tab
│   │   ├── circles/       # Circles tab
│   │   └── profile/       # Profile tab
│   ├── auth/              # Authentication screens
│   ├── compose.tsx        # Full-screen compose modal
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── common/           # Shared components
│   ├── feed/             # Feed-related components
│   ├── messages/         # Message components
│   ├── circles/          # Circle components
│   ├── profile/          # Profile components
│   └── ui/               # UI primitives
├── hooks/                # Custom React hooks
├── services/             # API and service layer
│   ├── supabase/        # Supabase services
│   └── api/             # API calls
├── lib/                  # Utilities and configurations
├── contexts/             # React contexts
└── global.css           # Global Tailwind styles
```

## Features

### Implemented ✅
- ✅ **Phase 1:** Project setup and configuration
- ✅ **Phase 2:** Service layer migration (11 services, 10 hooks)
- ✅ **Phase 3:** Authentication flow (login, signup, profile setup)
- ✅ **Phase 4:** Navigation structure (tab & stack navigation)
- ✅ **Phase 5:** Feed & compose features (daily prompts, responses)
- ✅ **Phase 6:** Prompts system (prompt feed, detail pages)
- ✅ **Phase 7:** Messaging system (conversations, threads, real-time)
- ✅ **Phase 8:** Circles/group chats (list, detail, chat, settings)
- ✅ **Phase 9:** Profile & friends (profiles, edit, friend management)
- ✅ **Phase 10:** Nudges system (nudge friends infrastructure)
- ✅ **Phase 11:** Push notifications (Expo notifications service)
- ✅ **Phase 12:** Invite system & deep linking (QR codes, invite pages)
- ✅ **Phase 13:** Reactions & interactions (emoji reactions)
- ✅ **Phase 14:** Media components (Avatar, ImageLightbox, AudioRecorder, VideoPlayer)
- ✅ **Phase 15:** Common UI components (Button, Input, Card, Badge, LoadingSpinner, etc.)

### In Progress 🔄
- 🔄 **Phase 16:** Testing & Polish (utility functions, constants, types)
- 📋 **Phase 17:** Build & Deployment preparation

### Key Features
- 📝 Daily prompts with text, image, video, and audio responses
- 👥 Friend system with requests and management
- 💬 Direct messaging with media support
- ⭕ Circle (group) chats with custom prompts
- 🔥 Streak tracking and calendar
- 👋 Nudge system to encourage friends
- 📌 Pinned responses on profiles (max 6)
- 🔔 Push notifications via Expo
- 🔗 Deep linking and QR code invites
- 📸 Full media support (photos, videos, audio)

## Development

### Code Style

- TypeScript for type safety
- NativeWind for styling (Tailwind classes)
- File-based routing with Expo Router
- Component-based architecture

### Testing

```bash
# Run type checking
npm run tsc

# Lint code
npm run lint
```

## Deployment

### Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Submit to App Stores

```bash
# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

## Related Repositories

- **Web App:** [limbo2](../limbo2-main) - PWA version of Limbo
- **Backend:** Express server in `limbo2-main/server/`

## License

Proprietary - All rights reserved
