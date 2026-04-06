# Development Guide

This guide covers best practices and workflows for developing the Limbo mobile app.

## Development Environment

### Required Software
- Node.js 18+ and npm
- Xcode (macOS) for iOS development
- Expo Go app on physical device (optional)
- Visual Studio Code (recommended)

### Recommended VS Code Extensions
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - TypeScript support
- **Tailwind CSS IntelliSense** - NativeWind autocomplete
- **React Native Tools** - Debugging and IntelliSense

## Getting Started

### 1. Clone and Install

```bash
cd /Users/michaelhemker/Documents/limbo-mobile
npm install --legacy-peer-deps
```

**Note:** Use `--legacy-peer-deps` flag due to React version conflicts.

### 2. Environment Setup

Create `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_PROJECT_ID=your_expo_project_id
```

### 3. Start Development Server

```bash
npm start
```

Press `i` to open iOS Simulator.

## Project Architecture

### File Structure

```
app/                    # Expo Router screens
  (tabs)/              # Tab navigation
  auth/                # Auth flow
  compose.tsx          # Response creation
  invite.tsx           # Invite handling
  _layout.tsx          # Root layout

components/            # React components
  common/             # Avatar, ImageLightbox
  media/              # AudioRecorder, VideoPlayer
  ui/                 # Button, Input, Card, etc.

hooks/                 # Custom React hooks
  useProfile.ts       # Profile operations
  useMessages.ts      # Messaging
  useResponses.ts     # Responses
  useFriends.ts       # Friendships
  useCircles.ts       # Circles
  usePrompt.ts        # Prompts
  useReactions.ts     # Reactions
  useNudges.ts        # Nudges

services/              # Business logic
  supabase/           # Supabase services
    profiles.ts
    messages.ts
    responses.ts
    friendships.ts
    circles.ts
    prompts.ts
    reactions.ts
    storage.ts
  api/
    nudges.ts         # Backend API calls
  notifications.ts    # Expo notifications

lib/                   # Utilities
  supabase.ts         # Supabase client
  constants.ts        # App constants
  utils.ts            # Helper functions
  types.ts            # TypeScript types

contexts/              # React contexts
  AuthContext.tsx     # Authentication state
```

### Navigation Structure

Using Expo Router (file-based routing):

```
/(tabs)/
  /feed              → Feed and prompts
  /messages          → Direct messaging
  /circles           → Group chats
  /profile           → User profiles
/auth                → Login/signup
/compose             → Create response
/invite              → Invite landing
```

## Coding Standards

### TypeScript

- Use TypeScript for all new files
- Define interfaces for all props
- Use types from `lib/types.ts`
- Avoid `any` - use `unknown` or specific types

Example:
```typescript
interface ProfileViewProps {
  userId: string;
  onEdit?: () => void;
}

export default function ProfileView({ userId, onEdit }: ProfileViewProps) {
  // ...
}
```

### Styling with NativeWind

Use Tailwind classes via `className`:

```tsx
<View className="flex-1 bg-white p-4">
  <Text className="text-2xl font-bold text-gray-900">
    Hello World
  </Text>
</View>
```

**Color Palette:**
- Primary: `blue-600` (#3b82f6)
- Text: `gray-900` (dark), `gray-600` (medium), `gray-500` (light)
- Borders: `gray-200`, `gray-300`
- Backgrounds: `white`, `gray-50`, `gray-100`

### Components

- Keep components small and focused
- Use composition over inheritance
- Extract reusable UI to `components/ui/`
- Use proper TypeScript types for props

**Good:**
```tsx
// components/ui/Button.tsx
interface ButtonProps {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export default function Button({ children, onPress, variant = 'primary' }: ButtonProps) {
  // ...
}
```

### Hooks

- Use React Query for server state
- Use React hooks for local state
- Keep hooks in `hooks/` directory
- Name hooks with `use` prefix

Example:
```typescript
export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profilesService.getProfile(userId!),
    enabled: !!userId,
  });
}
```

### Services

- Keep business logic in `services/`
- Services return data, not React components
- Use async/await
- Handle errors properly

Example:
```typescript
export const profilesService = {
  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },
};
```

## Common Workflows

### Adding a New Screen

1. Create file in `app/` directory:
   ```bash
   touch app/(tabs)/new-screen.tsx
   ```

2. Use screen template:
   ```tsx
   import { View, Text } from 'react-native';

   export default function NewScreen() {
     return (
       <View className="flex-1 bg-white p-4">
         <Text className="text-2xl font-bold">New Screen</Text>
       </View>
     );
   }
   ```

3. Navigation is automatic (file-based routing)

### Adding a Service

1. Create service file:
   ```bash
   touch services/supabase/my-service.ts
   ```

2. Define service:
   ```typescript
   import { supabase } from '../../lib/supabase';

   export const myService = {
     async getData(id: string) {
       const { data, error } = await supabase
         .from('my_table')
         .select('*')
         .eq('id', id);

       if (error) throw error;
       return data;
     },
   };
   ```

3. Create hook:
   ```typescript
   // hooks/useMyData.ts
   import { useQuery } from '@tanstack/react-query';
   import { myService } from '../services/supabase/my-service';

   export function useMyData(id: string) {
     return useQuery({
       queryKey: ['myData', id],
       queryFn: () => myService.getData(id),
     });
   }
   ```

4. Use in component:
   ```typescript
   const { data, isLoading } = useMyData(userId);
   ```

### Handling File Uploads

Use the `FileUpload` interface:

```typescript
import * as ImagePicker from 'expo-image-picker';

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    const file: FileUpload = {
      uri: result.assets[0].uri,
      type: 'image/jpeg',
      name: 'image.jpg',
    };

    // Use in mutation
    await uploadImage.mutateAsync({ file });
  }
};
```

## Testing

### Manual Testing

Test on physical device for:
- Camera/photo permissions
- Push notifications
- Performance
- Real network conditions

### Key Test Scenarios

**Authentication:**
- [ ] Sign up with new account
- [ ] Log in with existing account
- [ ] Complete profile setup
- [ ] Session persistence after app restart

**Feed:**
- [ ] View today's prompt
- [ ] Create response (text, image, video, audio)
- [ ] Edit response
- [ ] View friends' responses
- [ ] Feed locked before posting

**Messages:**
- [ ] View conversations list
- [ ] Send text message
- [ ] Send image
- [ ] Mark as read
- [ ] Unread count updates

**Circles:**
- [ ] Create circle
- [ ] Add members
- [ ] Post in circle chat
- [ ] Create circle prompt
- [ ] Leave circle

**Profile:**
- [ ] View own profile
- [ ] Edit profile
- [ ] Upload avatar
- [ ] View streak
- [ ] Pin responses
- [ ] Search for friends
- [ ] Send friend request
- [ ] Accept friend request

## Debugging

### React Native Debugger

1. Install React Native Debugger
2. Shake device or press `Cmd+D` in simulator
3. Select "Debug"

### Console Logs

```typescript
console.log('Debug info:', data);
console.error('Error:', error);
console.warn('Warning:', warning);
```

### React Query Devtools

Add to `_layout.tsx`:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Enable devtools in development
{__DEV__ && <ReactQueryDevtools />}
```

### Network Inspector

In iOS Simulator:
- Open Safari
- Develop menu → Simulator → Inspect

## Performance

### Optimization Tips

1. **Images:**
   - Use `expo-image` (already configured)
   - Compress images before upload
   - Use appropriate sizes

2. **Lists:**
   - Use `FlatList` for long lists
   - Set `keyExtractor` prop
   - Use `getItemLayout` if possible

3. **Re-renders:**
   - Use `React.memo` for expensive components
   - Use `useMemo` and `useCallback` appropriately
   - Don't optimize prematurely

4. **Bundle Size:**
   - Check with: `npx expo export --platform ios`
   - Remove unused dependencies

## Git Workflow

### Branch Strategy

```
main                 # Production-ready code
└─ develop          # Integration branch
   ├─ feature/...   # New features
   ├─ fix/...       # Bug fixes
   └─ refactor/...  # Code improvements
```

### Commit Messages

Use conventional commits:
```
feat: add circle chat functionality
fix: resolve message timestamp issue
refactor: simplify auth flow
docs: update deployment guide
chore: update dependencies
```

### Pull Requests

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Create PR to `develop`
5. Code review
6. Merge

## Common Issues

### Build Errors

**Module not found:**
```bash
npm install --legacy-peer-deps
rm -rf node_modules
npm install --legacy-peer-deps
```

**Metro bundler cache:**
```bash
npx expo start --clear
```

### Runtime Errors

**Network requests failing:**
- Check `.env` file exists
- Verify Supabase credentials
- Check network connection

**Images not loading:**
- Verify image URLs are HTTPS
- Check storage permissions
- Try clearing cache

**Notifications not working:**
- Must test on physical device
- Check notification permissions
- Verify push token is saved

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [NativeWind Documentation](https://nativewind.dev)
- [React Query Documentation](https://tanstack.com/query)
- [Supabase Documentation](https://supabase.com/docs)

## Getting Help

- Check existing code for examples
- Read component documentation
- Search GitHub issues
- Ask team members
