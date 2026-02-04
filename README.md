# World HUD for Viture Luma Ultra XR Glasses

An immersive XR heads-up display experience designed specifically for Viture Luma Ultra glasses with native SDK integration.

## Features

### Core Features
- **2-Way Translation** - Real-time translation between English and Spanish (Mexican), Japanese, German, Russian
- **Object Recognition** - AI-powered object identification using camera
- **Contextual Memory** - Remember and track identified objects with notes and tags
- **Social Cue Assistant** - Cultural tips and conversation prompts

### Native Viture SDK Integration
- **Head Tracking (IMU)** - Real-time 6DoF head orientation data (roll, pitch, yaw)
- **3D Mode Control** - Toggle stereoscopic 3D display mode
- **Display Control** - Manage resolution and display settings
- **Compass Integration** - Head-tracked compass using IMU data

## Project Structure

```
/app
├── backend/                 # FastAPI backend
│   ├── server.py           # API endpoints (translation, recognition, memory, etc.)
│   └── .env                # Environment variables (EMERGENT_LLM_KEY)
│
└── frontend/               # Expo React Native app
    ├── android/            # Native Android project (ejected)
    │   └── app/
    │       ├── libs/       # Viture SDK AAR
    │       └── src/main/java/com/anonymous/frontend/
    │           ├── viture/
    │           │   ├── VitureModule.kt    # Native module
    │           │   └── ViturePackage.kt   # Package registration
    │           └── MainApplication.kt     # App with Viture package
    │
    ├── app/                # Expo Router screens
    │   └── (tabs)/
    │       ├── index.tsx   # Main HUD screen with Viture integration
    │       ├── translate.tsx
    │       ├── recognize.tsx
    │       ├── memory.tsx
    │       └── settings.tsx
    │
    └── src/
        ├── native/
        │   └── VitureSDK.ts    # TypeScript wrapper for native module
        ├── hooks/
        │   └── useViture.ts    # React hook for Viture SDK
        ├── components/         # Reusable UI components
        ├── store/              # Zustand state management
        └── constants/          # Theme and configuration
```

## Building for Android with Viture SDK

### Prerequisites
- Android Studio installed
- Samsung Galaxy S25+ with Android 8+
- Viture Luma Ultra glasses
- USB-C cable to connect glasses

### Build Instructions

1. **Install dependencies:**
   ```bash
   cd frontend
   yarn install
   ```

2. **Build the Android development app:**
   ```bash
   npx expo run:android
   ```
   
   This will:
   - Compile the native Android project with Viture SDK
   - Install the app on your connected phone
   - Start the Metro bundler

3. **Connect Viture Glasses:**
   - Connect your Viture Luma Ultra to your Samsung S25+ via USB-C
   - Open the World HUD app
   - Tap "Connect Glasses" button
   - Grant USB permission when prompted

4. **Using Head Tracking:**
   - Once connected, tap "Enable IMU" to start head tracking
   - The compass will update based on your head orientation
   - Head tracking data (roll, pitch, yaw) displays in the HUD

### API Keys
The app uses **Emergent LLM Key** for AI features - no external API key configuration needed.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/translate` | POST | Translate text between languages |
| `/api/recognize` | POST | Analyze image and identify objects |
| `/api/memory` | GET/POST/PUT/DELETE | Contextual memory CRUD |
| `/api/social-cues` | POST | Get conversation prompts |
| `/api/settings` | GET/PUT | HUD configuration |

## Viture SDK API (Native Module)

```typescript
import { useViture } from './src/hooks/useViture';

const {
  isAvailable,      // Is SDK available (Android only)
  isConnected,      // Are glasses connected
  imuEnabled,       // Is IMU streaming
  mode3D,           // Is 3D mode active
  imuData,          // { roll, pitch, yaw, quaternion... }
  initialize,       // Connect to glasses
  release,          // Disconnect
  toggleIMU,        // Enable/disable head tracking
  toggle3D,         // Enable/disable 3D mode
  resetOrientation, // Reset head orientation reference
} = useViture();
```

## Tech Stack
- **Frontend:** Expo, React Native, TypeScript, Zustand
- **Backend:** FastAPI, MongoDB, Python
- **AI:** OpenAI GPT-5.2 via Emergent LLM Key
- **Native:** Kotlin, Viture XR SDK 1.0.7

## License
MIT
