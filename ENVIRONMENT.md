# Environment Configuration

This document explains how to configure and switch between different environments in the Limbo mobile app.

## Supported Environments

- **Development**: Local development with debug features enabled
- **Staging**: Pre-production environment for testing
- **Production**: Live production environment

## Setup

### 1. Create Environment File

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your environment-specific values:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Environment
EXPO_PUBLIC_ENV=development

# API Configuration
EXPO_PUBLIC_API_URL=https://your-project.supabase.co

# Feature Flags
EXPO_PUBLIC_ENABLE_DEBUG=true
EXPO_PUBLIC_ENABLE_ERROR_REPORTING=false
```

### 3. Environment-Specific Configuration

You can create multiple environment files for different setups:

- `.env.development` - Development environment
- `.env.staging` - Staging environment
- `.env.production` - Production environment

## Switching Environments

### During Development

1. Update the `EXPO_PUBLIC_ENV` variable in your `.env` file:
   ```env
   EXPO_PUBLIC_ENV=staging
   ```

2. Restart the development server:
   ```bash
   npm start -- --clear
   ```

### For Builds

Use Expo's environment variables with EAS Build:

```bash
# Development build
eas build --profile development

# Staging build
eas build --profile preview

# Production build
eas build --profile production
```

Configure different environments in `eas.json`:

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_ENV": "development"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_ENV": "staging"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      }
    }
  }
}
```

## Environment Utilities

The app provides utilities for working with environments:

```typescript
import {
  env,
  getCurrentEnvironment,
  isDevelopment,
  isProduction
} from './utils/env';

// Get current configuration
console.log(env.supabaseUrl);
console.log(env.enableDebug);

// Check environment
if (isDevelopment()) {
  console.log('Running in development mode');
}

// Get environment name
const envName = getCurrentEnvironment(); // 'development' | 'staging' | 'production'
```

## Developer Settings

In development builds (`__DEV__`), you can view the current environment configuration:

1. Go to Profile tab
2. Tap "Edit Profile"
3. Scroll to the "Developer" section
4. View current environment and configuration

## Security Notes

1. **Never commit `.env` files to version control**
   - The `.env.example` file is provided as a template
   - Add `.env*` to your `.gitignore`

2. **Production keys**
   - Never use production keys in development
   - Store production secrets in EAS Secrets or your CI/CD system

3. **API Keys**
   - Use environment-specific API keys
   - Rotate keys regularly
   - Use row-level security in Supabase

## Troubleshooting

### Environment variables not updating

1. Clear the Metro bundler cache:
   ```bash
   npm start -- --clear
   ```

2. Restart the development server completely

### Missing environment variables

1. Check that all required variables are set in your `.env` file
2. Ensure variable names start with `EXPO_PUBLIC_`
3. Check the console for validation errors on app startup

### Wrong environment

1. Verify the `EXPO_PUBLIC_ENV` value in your `.env` file
2. Check that you're using the correct build profile
3. View current environment in Developer settings (dev builds only)
