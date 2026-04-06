# Pre-Launch Checklist

Use this checklist before submitting to the App Store.

## Development Complete

### Core Features
- [x] Authentication (login, signup, profile setup)
- [x] Daily prompts feed
- [x] Response creation (text, image, video, audio)
- [x] Direct messaging
- [x] Circles (group chats)
- [x] Profile management
- [x] Friend system
- [x] Nudges
- [x] Push notifications
- [x] Invite system with deep linking
- [x] Reactions
- [x] Streak tracking

### UI/UX
- [x] All screens implemented
- [x] Consistent styling with NativeWind
- [x] Loading states
- [x] Error states
- [x] Empty states
- [x] Pull-to-refresh
- [x] Keyboard handling
- [x] Safe area handling

### Media
- [x] Image upload/display
- [x] Video upload/playback
- [x] Audio recording/playback
- [x] Camera integration
- [x] Image lightbox
- [x] Avatar display

## Testing

### Functional Testing
- [ ] Test all authentication flows
- [ ] Test feed and response creation
- [ ] Test all media types (image, video, audio)
- [ ] Test messaging (send, receive, read status)
- [ ] Test circles (create, join, chat, prompts)
- [ ] Test profile editing
- [ ] Test friend requests (send, accept, decline)
- [ ] Test nudges (send, receive)
- [ ] Test reactions on responses
- [ ] Test deep linking (invite URLs)
- [ ] Test QR code generation

### Edge Cases
- [ ] No internet connection
- [ ] Slow network
- [ ] Empty states (no friends, no messages, etc.)
- [ ] Long text content
- [ ] Special characters in usernames
- [ ] Multiple rapid taps
- [ ] Background app refresh
- [ ] Low storage
- [ ] Expired sessions

### Permissions
- [ ] Camera permission request
- [ ] Photo library permission request
- [ ] Microphone permission request
- [ ] Notification permission request
- [ ] All permissions have clear descriptions

### Device Testing
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (notch)
- [ ] iPhone 14 Pro Max (large screen)
- [ ] iPad (if supporting tablets)
- [ ] iOS 16.0 minimum
- [ ] Dark mode (if supported)

## Performance

- [ ] App launches in < 3 seconds
- [ ] Images load quickly
- [ ] Scrolling is smooth (60 FPS)
- [ ] No memory leaks
- [ ] Bundle size < 50MB
- [ ] Offline functionality (cached data)

## Security

- [ ] Passwords never logged
- [ ] API keys in environment variables
- [ ] HTTPS for all requests
- [ ] User data encrypted at rest (Supabase)
- [ ] Proper authentication checks
- [ ] No sensitive data in logs

## Content

### App Store Listing
- [ ] App name: "Limbo"
- [ ] Subtitle: "Daily prompts with your people"
- [ ] Description written
- [ ] Keywords selected
- [ ] Screenshots created (all required sizes)
- [ ] Preview video (optional but recommended)
- [ ] App icon (1024x1024)
- [ ] Category: Social Networking
- [ ] Age rating: 12+ (or 17+ if user-generated content)

### Legal
- [ ] Privacy policy published at https://limbo.social/privacy
- [ ] Terms of service published at https://limbo.social/terms
- [ ] Support email set up: support@limbo.social
- [ ] Copyright information updated
- [ ] Data collection disclosed in App Privacy

### App Review
- [ ] Demo account created with sample data
- [ ] Review notes written
- [ ] Contact information provided
- [ ] Export compliance answered
- [ ] Content rights confirmed

## Configuration

### App Configuration
- [ ] Bundle identifier: com.limbo.app
- [ ] Version: 1.0.0
- [ ] Build number: 1
- [ ] Display name: Limbo
- [ ] Minimum iOS version: 16.0
- [ ] Supported orientations: Portrait only
- [ ] Requires full screen: Yes

### Permissions in Info.plist
- [ ] NSCameraUsageDescription
- [ ] NSPhotoLibraryUsageDescription
- [ ] NSMicrophoneUsageDescription
- [ ] NSPhotoLibraryAddUsageDescription

### Deep Linking
- [ ] URL scheme: limbo://
- [ ] Universal links: https://limbo.social
- [ ] Associated domains configured
- [ ] Invite links tested

### Push Notifications
- [ ] Expo push notification configured
- [ ] Push token registered on signup
- [ ] Daily prompt notifications working
- [ ] Nudge notifications working
- [ ] Notification icons/sounds configured

## Build & Submit

### EAS Build
- [ ] eas.json configured
- [ ] Production build profile created
- [ ] Environment variables set
- [ ] Build succeeds without errors
- [ ] .ipa file downloads successfully

### App Store Connect
- [ ] App created in App Store Connect
- [ ] Bundle ID matches: com.limbo.app
- [ ] All metadata filled out
- [ ] Screenshots uploaded (all sizes)
- [ ] Build uploaded to TestFlight
- [ ] TestFlight testing completed
- [ ] Build selected for App Review
- [ ] Pricing set (Free)
- [ ] Availability configured

## Post-Submission

### Monitoring
- [ ] TestFlight analytics reviewed
- [ ] Crash reports checked
- [ ] User feedback reviewed
- [ ] Performance metrics acceptable

### Support
- [ ] Support email monitored
- [ ] FAQ page created
- [ ] Response templates prepared
- [ ] Team trained on common issues

### Marketing
- [ ] Social media accounts created
- [ ] Landing page live
- [ ] App Store description optimized
- [ ] Launch announcement prepared

## Version 1.0.0 Specific

### Must-Have Features
- [x] Daily prompts
- [x] Response creation
- [x] Friend feed
- [x] Direct messaging
- [x] Push notifications
- [x] Profile system
- [x] Friend requests
- [x] Invite system

### Known Issues
- [ ] Document any known bugs
- [ ] Create GitHub issues for future fixes
- [ ] Prioritize for v1.0.1

### Future Enhancements (v1.1+)
- [ ] Android support
- [ ] Supabase Realtime (instead of polling)
- [ ] Advanced search
- [ ] Hashtags
- [ ] Trending prompts
- [ ] Analytics dashboard
- [ ] Export user data
- [ ] Custom prompt creation

## Final Sign-Off

- [ ] Development team approval
- [ ] QA testing complete
- [ ] Product owner approval
- [ ] Legal review complete
- [ ] Ready for App Store submission

---

## Submission Date

**Planned:** __________

**Actual:** __________

## Approval Date

**Expected:** __________ (typically 1-3 days)

**Actual:** __________

## Notes

_Add any additional notes or observations here_
