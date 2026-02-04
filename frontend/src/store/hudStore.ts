import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageCode } from '../constants/theme';

interface HUDWidget {
  id: string;
  enabled: boolean;
  position: { x: number; y: number };
}

interface HUDState {
  // Language settings
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  availableTargetLanguages: LanguageCode[];
  
  // HUD settings
  hudOpacity: number;
  theme: 'dark_cyber' | 'minimal' | 'high_contrast';
  fontSize: 'small' | 'medium' | 'large';
  
  // Widgets
  widgets: HUDWidget[];
  
  // Features
  autoTranslate: boolean;
  contextualMemoryEnabled: boolean;
  voiceFeedback: boolean;
  hapticFeedback: boolean;
  
  // Real-time data
  isListening: boolean;
  isProcessing: boolean;
  lastTranslation: string | null;
  lastRecognition: any | null;
  
  // Connection
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  
  // Actions
  setNativeLanguage: (lang: LanguageCode) => void;
  setTargetLanguage: (lang: LanguageCode) => void;
  setHudOpacity: (opacity: number) => void;
  setTheme: (theme: 'dark_cyber' | 'minimal' | 'high_contrast') => void;
  toggleWidget: (widgetId: string) => void;
  setAutoTranslate: (enabled: boolean) => void;
  setContextualMemory: (enabled: boolean) => void;
  setVoiceFeedback: (enabled: boolean) => void;
  setHapticFeedback: (enabled: boolean) => void;
  setIsListening: (listening: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  setLastTranslation: (translation: string | null) => void;
  setLastRecognition: (recognition: any | null) => void;
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

const DEFAULT_WIDGETS: HUDWidget[] = [
  { id: 'time', enabled: true, position: { x: 0, y: 0 } },
  { id: 'weather', enabled: true, position: { x: 1, y: 0 } },
  { id: 'compass', enabled: true, position: { x: 2, y: 0 } },
  { id: 'battery', enabled: true, position: { x: 3, y: 0 } },
  { id: 'translation', enabled: true, position: { x: 0, y: 1 } },
  { id: 'object_recognition', enabled: true, position: { x: 0, y: 2 } },
  { id: 'social_cues', enabled: true, position: { x: 1, y: 2 } },
  { id: 'memory', enabled: true, position: { x: 2, y: 2 } },
];

export const useHUDStore = create<HUDState>((set, get) => ({
  // Initial state
  nativeLanguage: 'en',
  targetLanguage: 'es',
  availableTargetLanguages: ['es', 'ja', 'de', 'ru'],
  hudOpacity: 0.85,
  theme: 'dark_cyber',
  fontSize: 'medium',
  widgets: DEFAULT_WIDGETS,
  autoTranslate: true,
  contextualMemoryEnabled: true,
  voiceFeedback: true,
  hapticFeedback: true,
  isListening: false,
  isProcessing: false,
  lastTranslation: null,
  lastRecognition: null,
  isConnected: false,
  connectionStatus: 'disconnected',
  
  // Actions
  setNativeLanguage: (lang) => set({ nativeLanguage: lang }),
  setTargetLanguage: (lang) => set({ targetLanguage: lang }),
  setHudOpacity: (opacity) => set({ hudOpacity: opacity }),
  setTheme: (theme) => set({ theme }),
  toggleWidget: (widgetId) => set((state) => ({
    widgets: state.widgets.map((w) =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    ),
  })),
  setAutoTranslate: (enabled) => set({ autoTranslate: enabled }),
  setContextualMemory: (enabled) => set({ contextualMemoryEnabled: enabled }),
  setVoiceFeedback: (enabled) => set({ voiceFeedback: enabled }),
  setHapticFeedback: (enabled) => set({ hapticFeedback: enabled }),
  setIsListening: (listening) => set({ isListening: listening }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setLastTranslation: (translation) => set({ lastTranslation: translation }),
  setLastRecognition: (recognition) => set({ lastRecognition: recognition }),
  setConnectionStatus: (status) => set({ 
    connectionStatus: status,
    isConnected: status === 'connected'
  }),
  
  loadSettings: async () => {
    try {
      const settings = await AsyncStorage.getItem('hud_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        set(parsed);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },
  
  saveSettings: async () => {
    try {
      const state = get();
      const settingsToSave = {
        nativeLanguage: state.nativeLanguage,
        targetLanguage: state.targetLanguage,
        hudOpacity: state.hudOpacity,
        theme: state.theme,
        fontSize: state.fontSize,
        widgets: state.widgets,
        autoTranslate: state.autoTranslate,
        contextualMemoryEnabled: state.contextualMemoryEnabled,
        voiceFeedback: state.voiceFeedback,
        hapticFeedback: state.hapticFeedback,
      };
      await AsyncStorage.setItem('hud_settings', JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },
}));
