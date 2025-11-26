# ProximityChat Mobile App 📱

A location-based real-time chat application for iOS and Android, built with Capacitor.

## Features ✨
- 🌍 **Location-Based Chat** - Talk to people within your chosen radius (50m-5km)
- 📱 **Native Mobile Apps** - iOS and Android versions
- 🔄 **Real-time Messaging** - Automatic message refresh every minute
- ⚙️ **Customizable Settings** - Set your username and chat radius
- 🔒 **Privacy-Focused** - Messages expire after 1 hour
- 🎨 **Beautiful UI** - Modern gradient design with smooth animations

## Development Setup 🛠️

### Prerequisites
- **Node.js** (v14 or higher)
- **npm** or **yarn**

#### For iOS Development:
- **macOS** required
- **Xcode** (latest version from App Store)
- **CocoaPods** (`sudo gem install cocoapods`)

#### For Android Development:
- **Android Studio** (with Android SDK)
- **Java 8+**

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo>
   cd proximity
   npm install
   ```

2. **Build and sync to native platforms:**
   ```bash
   npm run sync
   ```

## Mobile Development 📲

### iOS App

1. **Open iOS project:**
   ```bash
   npm run ios
   ```
   This opens Xcode with your native iOS project.

2. **Configure in Xcode:**
   - Select your development team
   - Set deployment target (iOS 11.0+)
   - Configure signing certificates

3. **Required iOS Permissions:**
   Add these to `ios/App/App/Info.plist`:
   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>ProximityChat needs location access to connect you with nearby users</string>
   ```

4. **Build and Run:**
   - Click ▶️ in Xcode to build and run on simulator/device

### Android App

1. **Open Android project:**
   ```bash
   npm run android
   ```
   This opens Android Studio with your native Android project.

2. **Configure in Android Studio:**
   - Install required SDK versions
   - Setup device/emulator

3. **Required Android Permissions:**
   Already configured in `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   <uses-permission android:name="android.permission.INTERNET" />
   ```

4. **Build and Run:**
   - Click ▶️ in Android Studio or use `./gradlew assembleDebug`

## Development Workflow 🔄

### Making Changes

1. **Edit web code** (HTML/CSS/JS in root directory)
2. **Build and sync:**
   ```bash
   npm run sync
   ```
3. **Test in browser:**
   ```bash
   npm run serve
   # Open http://localhost:8000
   ```
4. **Open native IDEs to test on devices:**
   ```bash
   npm run ios     # Opens Xcode
   npm run android # Opens Android Studio
   ```

### Key Files 📁

- **`index.html`** - Main app UI and logic
- **`capacitor.config.json`** - Native app configuration  
- **`manifest.json`** - PWA manifest for app metadata
- **`package.json`** - Build scripts and dependencies
- **`dist/`** - Built web assets for native apps
- **`ios/`** - Native iOS project (Xcode)
- **`android/`** - Native Android project (Android Studio)

## Deployment 🚀

### iOS App Store

1. **Archive in Xcode:**
   - Select "Generic iOS Device" 
   - Product → Archive
   - Upload to App Store Connect

2. **Requirements:**
   - Apple Developer Account ($99/year)
   - App Store icons (various sizes)
   - App Store description and screenshots

### Google Play Store

1. **Generate signed APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Requirements:**
   - Google Play Developer Account ($25 one-time)
   - Signed APK/AAB
   - Play Store listing with screenshots

## Troubleshooting 🔧

### Common Issues:

**iOS build fails:**
- Install Xcode Command Line Tools: `xcode-select --install`
- Install CocoaPods: `sudo gem install cocoapods`
- Run `pod install` in `ios/App/` directory

**Android build fails:**
- Ensure Android Studio and SDK are installed
- Set ANDROID_HOME environment variable
- Accept all SDK licenses

**Location not working:**
- Test on real device (simulator location is unreliable)
- Check permissions are granted in device settings
- Ensure HTTPS in production (required for geolocation)

**Firebase connection issues:**
- Check internet connectivity
- Verify Firebase URL in code
- Test web version first: `npm run serve`

## Features in Detail 📋

### Location System
- **Grid-based proximity** - Uses coordinate grids for efficient grouping
- **Dynamic precision** - Adjusts grid size based on chat radius
- **Distance failsafe** - Prevents cross-continental message leakage
- **IP location comparison** - Detects VPN usage for debugging

### Message Management  
- **Auto-expiry** - Messages older than 1 hour are filtered out
- **Real-time sync** - 60-second auto-refresh cycle
- **Duplicate prevention** - Message ID system prevents duplicates
- **Local storage** - Username and radius preferences saved

### Mobile Optimizations
- **Safe area support** - Handles iPhone notches and Android navigation
- **Touch-friendly** - Optimized button sizes and spacing
- **Native feel** - Platform-specific status bar and splash screen
- **Offline resilience** - Graceful error handling for network issues

## Contributing 🤝

1. Fork the repository
2. Create your feature branch
3. Make changes to web code (`index.html`, etc.)
4. Test on both web and mobile platforms
5. Submit a pull request

## License 📄

© 2025 Vignesh Jeyaraman. All rights reserved.

---

**Need Help?** 
- Check [Capacitor Documentation](https://capacitorjs.com/docs)
- Open an issue in this repository
- Contact: [LinkedIn](https://www.linkedin.com/in/vignesh94/)