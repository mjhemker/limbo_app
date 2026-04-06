# Deployment Guide

This guide covers the steps to build and deploy the Limbo mobile app to iOS App Store using Expo Application Services (EAS).

## Prerequisites

1. **Apple Developer Account**
   - Enrolled in Apple Developer Program ($99/year)
   - Access to App Store Connect

2. **EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

3. **Expo Account**
   - Sign up at https://expo.dev
   - Create a project or link existing one

4. **Environment Variables**
   - Ensure all production credentials are set
   - Update `.env` with production values

## Initial Setup

### 1. Login to EAS

```bash
eas login
```

### 2. Configure Project

Update `eas.json` with your build profiles (already configured).

Update `app.json` with:
- Correct bundle identifier: `com.limbo.app`
- App Store Connect App ID
- Apple Team ID

### 3. Configure Credentials

```bash
# EAS will automatically manage credentials
eas credentials
```

Choose to let EAS manage:
- Distribution certificate
- Provisioning profile
- Push notification key

## Building

### Development Build

For internal testing with development features:

```bash
eas build --profile development --platform ios
```

### Preview Build

For TestFlight testing without development features:

```bash
eas build --profile preview --platform ios
```

### Production Build

For App Store submission:

```bash
eas build --profile production --platform ios
```

## Submitting to TestFlight

### Automatic Submission

```bash
eas submit --platform ios --latest
```

### Manual Submission

1. Download the `.ipa` file from EAS build
2. Upload to App Store Connect using Transporter app
3. Process will take 5-10 minutes

## App Store Connect Setup

### 1. Create App Listing

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app:
   - **Name:** Limbo
   - **Bundle ID:** com.limbo.app
   - **Language:** English (U.S.)
   - **Category:** Social Networking

### 2. App Information

Fill in required information:
- **Subtitle:** Daily prompts with your people
- **Description:** (See below)
- **Keywords:** prompts, social, friends, daily, chat
- **Support URL:** https://limbo.social/support
- **Privacy Policy URL:** https://limbo.social/privacy

### 3. App Privacy

Answer privacy questionnaire:
- Collects: Contact Info, User Content, Identifiers, Usage Data
- Tracking: No
- Third-party tracking: No

### 4. Screenshots

Required sizes for iPhone:
- 6.7" (iPhone 14 Pro Max): 1290 x 2796
- 6.5" (iPhone 11 Pro Max): 1242 x 2688
- 5.5" (iPhone 8 Plus): 1242 x 2208

Create screenshots showing:
1. Daily prompt and feed
2. Creating a response
3. Friend responses
4. Direct messaging
5. Circle chat

### 5. App Review Information

- **First Name:** Your first name
- **Last Name:** Your last name
- **Phone Number:** Your phone
- **Email:** Your email
- **Demo Account:** Provide test credentials
- **Notes:** Instructions for reviewers

## Version Management

### Incrementing Version

Update `version` in `app.json`:
```json
{
  "expo": {
    "version": "1.0.1"
  }
}
```

For iOS build number, update in `eas.json`:
```json
{
  "build": {
    "production": {
      "ios": {
        "buildNumber": "2"
      }
    }
  }
}
```

### Creating Updates

For over-the-air updates (doesn't require App Store review):

```bash
eas update --branch production --message "Bug fixes"
```

## Monitoring

### Check Build Status

```bash
eas build:list
```

### View Build Logs

```bash
eas build:view [BUILD_ID]
```

### Check Submissions

```bash
eas submit:list
```

## Troubleshooting

### Build Failures

**Missing credentials:**
```bash
eas credentials --platform ios
```

**Invalid bundle identifier:**
- Ensure `bundleIdentifier` in `app.json` matches App Store Connect
- Must be `com.limbo.app`

**Provisioning profile issues:**
```bash
eas credentials --platform ios
# Delete and regenerate provisioning profile
```

### Submission Failures

**Missing compliance:**
- Answer export compliance questions in App Store Connect
- Most apps can select "No" for encryption

**Missing privacy policy:**
- Ensure privacy policy URL is accessible
- Must be HTTPS

**Rejected binary:**
- Review rejection reasons in App Store Connect
- Common issues: missing test credentials, unclear app purpose, privacy violations

## Pre-Launch Checklist

- [ ] All features tested on physical device
- [ ] Push notifications working
- [ ] Deep linking tested (invite URLs)
- [ ] Privacy policy and terms uploaded
- [ ] Support email set up
- [ ] App Store screenshots created (all sizes)
- [ ] App description written
- [ ] Keywords selected
- [ ] Demo account created for reviewers
- [ ] Version number updated
- [ ] Build created with production profile
- [ ] TestFlight testing completed
- [ ] App Review information filled out
- [ ] Pricing and availability set

## Post-Launch

### Analytics

Monitor using:
- App Store Connect (downloads, crashes)
- Expo Insights (runtime metrics)
- Custom analytics (if implemented)

### Updates

For bug fixes and minor features:
1. Fix in codebase
2. Test thoroughly
3. Increment build number
4. Create new build
5. Submit to App Store

For critical bugs:
- Use EAS Update for immediate fixes (if compatible)
- Otherwise expedite App Store review

### Support

Set up support channels:
- Support email: support@limbo.social
- GitHub Issues (if open source)
- In-app feedback mechanism

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)

## App Description Template

### Short Description (30 chars)
```
Daily prompts with friends
```

### Full Description
```
Stay connected with friends through daily prompts and meaningful conversations.

KEY FEATURES

📝 Daily Prompts
Answer thought-provoking prompts every day and see what your friends are thinking.

👥 Friend Responses
Share your thoughts through text, photos, videos, or voice recordings. View your friends' responses after posting yours.

💬 Direct Messaging
Chat with friends about their responses and stay connected.

⭕ Circles
Create group chats with custom prompts for your close friends, family, or interest groups.

🔥 Streaks
Build consistency by posting daily. Track your streak and compete with friends.

👋 Nudges
Encourage friends to share their responses when they haven't posted yet.

📌 Profile
Showcase your favorite responses on your profile. Pin up to 6 responses.

🔔 Notifications
Get notified about new daily prompts, friend responses, and messages.

🔗 Invite Friends
Easily invite friends via QR code or shareable link.

WHY LIMBO?

Limbo helps you have deeper, more meaningful conversations with the people who matter most. Instead of endless scrolling, Limbo gives you one thoughtful prompt each day to respond to and discuss with friends.

Perfect for:
- Keeping in touch with distant friends
- Getting to know people better
- Building daily conversation habits
- Creating lasting memories with friends

Download Limbo and start sharing your thoughts today!
```

## Privacy Policy Template

Create a privacy policy at `https://limbo.social/privacy` covering:
- What data is collected
- How data is used
- How data is stored (Supabase)
- User rights (deletion, export)
- Contact information

## Terms of Service Template

Create terms of service at `https://limbo.social/terms` covering:
- User responsibilities
- Content guidelines
- Account termination
- Liability limitations
- Contact information
