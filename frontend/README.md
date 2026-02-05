# World HUD - Viture XR Glasses App

A React Native application for Viture Luma Ultra XR Glasses featuring:
- **Real-time Head Tracking** - Uses the glasses' IMU sensor for orientation data
- **Two-Way Translation** - Translate speech between English and Mexican Spanish, Japanese, German, or Russian
- **Object Recognition** - Camera-based object identification with AI analysis
- **Contextual Memory** - Save and retrieve recognized objects

## Prerequisites

- Node.js 18+ 
- EAS CLI: `npm install -g eas-cli`
- Expo account: `eas login`
- Samsung Galaxy S25+ (or compatible Android device)
- Viture Luma Ultra XR Glasses

## Building the APK (From Termux/Phone)

### IMPORTANT: Fresh Clone Required

Before every build, **delete your existing project folder** and re-clone fresh:

```bash
# Navigate to your projects folder
cd ~/projects

# Remove old folder (if exists)
rm -rf XR

# Fresh clone
git clone [YOUR_REPO_URL] XR
cd XR/frontend
```

### Step 1: Install Dependencies

```bash
# Use --legacy-peer-deps to avoid dependency conflicts
npm install --legacy-peer-deps
```

### Step 2: Login to Expo (if not logged in)

```bash
eas login
```

### Step 3: Build the APK

```bash
# Build for Android (preview profile)
eas build --platform android --profile preview
```

### Step 4: Wait and Download

- The build will be queued on EAS servers
- Build time: ~10-15 minutes
- Download the APK when complete

## Viture SDK Integration

This app includes native C/C++ integration with the Viture SDK. The SDK files are located at:

- **Headers**: `android/app/src/main/cpp/viture/`
- **Native Libraries**: `android/app/src/main/jniLibs/`
- **JNI Bridge**: `android/app/src/main/cpp/viture_jni.cpp`
- **Kotlin Bridge**: `android/app/src/main/java/com/anonymous/frontend/viture/`

### USB Connection

1. Connect Viture glasses to your Samsung S25+ via USB-C
2. Open the World HUD app
3. Grant USB permission when prompted
4. Tap "Connect Glasses" in the app

### Supported Devices

- Viture One
- Viture Pro
- Viture Lite
- Viture Luma
- Viture Luma Pro
- Viture Beast

## Troubleshooting Build Errors

### "ERESOLVE unable to resolve dependency tree"

Use `--legacy-peer-deps`:
```bash
npm install --legacy-peer-deps
```

### "package-lock.json out of sync"

Delete node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### "Waiting for concurrency"

Cancel old builds on expo.dev:
1. Go to expo.dev
2. Navigate to your project
3. Cancel any pending/running builds

### Build Fails on C++ Compilation

Make sure you cloned the latest version. The project uses `react-native-reanimated@4.1.1` which is compatible with the new architecture.

## Project Structure

```
frontend/
├── app/                    # Expo Router screens
│   └── (tabs)/            # Tab navigation
│       ├── index.tsx      # Main HUD screen
│       ├── recognize.tsx  # Object recognition
│       ├── translate.tsx  # Translation feature
│       ├── memory.tsx     # Saved memories
│       └── settings.tsx   # App settings
├── src/
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom hooks (useViture)
│   ├── native/            # Native module wrappers
│   ├── store/             # Zustand state management
│   └── utils/             # API utilities
├── android/               # Native Android code
│   └── app/src/main/
│       ├── cpp/           # C++ source code
│       ├── java/          # Kotlin modules
│       └── jniLibs/       # Precompiled .so libraries
└── plugins/               # Expo config plugins
    └── withVitureSDK.js   # Viture SDK integration
```

## Development

For local development with native code:

```bash
# Generate native project
npx expo prebuild --clean

# Run on connected device
npx expo run:android
```

## License

MIT
