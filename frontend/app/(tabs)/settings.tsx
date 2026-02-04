import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, FONTS, LANGUAGE_CONFIG } from '../../src/constants/theme';
import { HUDWidget } from '../../src/components/HUDWidget';
import { GlowButton } from '../../src/components/GlowButton';
import { LanguageSelector } from '../../src/components/LanguageSelector';
import { useHUDStore } from '../../src/store/hudStore';

export default function SettingsScreen() {
  const {
    nativeLanguage,
    targetLanguage,
    setNativeLanguage,
    setTargetLanguage,
    hudOpacity,
    setHudOpacity,
    autoTranslate,
    setAutoTranslate,
    contextualMemoryEnabled,
    setContextualMemory,
    voiceFeedback,
    setVoiceFeedback,
    hapticFeedback,
    setHapticFeedback,
    saveSettings,
    loadSettings,
    widgets,
    toggleWidget,
  } = useHUDStore();

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings();
      Alert.alert('Saved', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const SettingRow = ({ 
    label, 
    description, 
    children 
  }: { 
    label: string; 
    description?: string; 
    children: React.ReactNode;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      {children}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Ionicons name="settings" size={24} color={COLORS.textSecondary} />
          <Text style={styles.headerTitle}>SETTINGS</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Language Settings */}
        <HUDWidget title="Language Settings" icon="language-outline">
          <View style={styles.languageSection}>
            <LanguageSelector
              selectedLanguage={nativeLanguage}
              onSelect={setNativeLanguage}
              label="Native Language"
            />
            <View style={styles.languageSpacer} />
            <LanguageSelector
              selectedLanguage={targetLanguage}
              onSelect={setTargetLanguage}
              availableLanguages={['es', 'ja', 'de', 'ru']}
              label="Target Language"
            />
          </View>
        </HUDWidget>

        {/* Display Settings */}
        <HUDWidget title="Display Settings" icon="eye-outline">
          <View style={styles.settingsGroup}>
            <SettingRow 
              label="HUD Opacity" 
              description={`${Math.round(hudOpacity * 100)}%`}
            >
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5}
                  maximumValue={1}
                  value={hudOpacity}
                  onValueChange={setHudOpacity}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.primary}
                />
              </View>
            </SettingRow>
          </View>
        </HUDWidget>

        {/* Feature Toggles */}
        <HUDWidget title="Features" icon="toggle-outline">
          <View style={styles.settingsGroup}>
            <SettingRow 
              label="Auto Translate" 
              description="Automatically translate detected speech"
            >
              <Switch
                value={autoTranslate}
                onValueChange={setAutoTranslate}
                trackColor={{ false: COLORS.border, true: COLORS.primaryGlow }}
                thumbColor={autoTranslate ? COLORS.primary : COLORS.textMuted}
              />
            </SettingRow>

            <SettingRow 
              label="Contextual Memory" 
              description="Remember identified objects"
            >
              <Switch
                value={contextualMemoryEnabled}
                onValueChange={setContextualMemory}
                trackColor={{ false: COLORS.border, true: COLORS.accentGlow }}
                thumbColor={contextualMemoryEnabled ? COLORS.accent : COLORS.textMuted}
              />
            </SettingRow>

            <SettingRow 
              label="Voice Feedback" 
              description="Speak translations aloud"
            >
              <Switch
                value={voiceFeedback}
                onValueChange={setVoiceFeedback}
                trackColor={{ false: COLORS.border, true: COLORS.secondaryGlow }}
                thumbColor={voiceFeedback ? COLORS.secondary : COLORS.textMuted}
              />
            </SettingRow>

            <SettingRow 
              label="Haptic Feedback" 
              description="Vibrate on actions"
            >
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{ false: COLORS.border, true: COLORS.warningGlow }}
                thumbColor={hapticFeedback ? COLORS.warning : COLORS.textMuted}
              />
            </SettingRow>
          </View>
        </HUDWidget>

        {/* Widgets */}
        <HUDWidget title="HUD Widgets" icon="grid-outline">
          <View style={styles.widgetsGrid}>
            {widgets.map((widget) => (
              <View key={widget.id} style={styles.widgetToggle}>
                <View style={styles.widgetInfo}>
                  <Ionicons 
                    name={getWidgetIcon(widget.id)} 
                    size={20} 
                    color={widget.enabled ? COLORS.primary : COLORS.textMuted} 
                  />
                  <Text style={[
                    styles.widgetName,
                    !widget.enabled && styles.widgetNameDisabled
                  ]}>
                    {formatWidgetName(widget.id)}
                  </Text>
                </View>
                <Switch
                  value={widget.enabled}
                  onValueChange={() => toggleWidget(widget.id)}
                  trackColor={{ false: COLORS.border, true: COLORS.primaryGlow }}
                  thumbColor={widget.enabled ? COLORS.primary : COLORS.textMuted}
                />
              </View>
            ))}
          </View>
        </HUDWidget>

        {/* Viture Connection */}
        <HUDWidget 
          title="Viture Luma Ultra" 
          icon="glasses-outline"
          iconColor={COLORS.secondary}
        >
          <View style={styles.vitureSection}>
            <View style={styles.vitureStatus}>
              <Ionicons name="information-circle" size={20} color={COLORS.warning} />
              <Text style={styles.vitureText}>
                Native SDK integration required for advanced features like hand tracking and glasses camera access.
              </Text>
            </View>
            <View style={styles.vitureFeatures}>
              <Text style={styles.vitureFeatureTitle}>Current Mode: Display Mirror</Text>
              <Text style={styles.vitureFeatureDesc}>
                The app displays on your Viture glasses via screen mirroring. 
                For full SDK integration with hand tracking, please contact Viture developer support.
              </Text>
            </View>
          </View>
        </HUDWidget>

        {/* About */}
        <HUDWidget title="About" icon="information-circle-outline" iconColor={COLORS.textMuted}>
          <View style={styles.aboutSection}>
            <Text style={styles.appName}>World HUD</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appDescription}>
              An immersive XR heads-up display experience for Viture Luma Ultra glasses.
              Features real-time translation, object recognition, and contextual memory.
            </Text>
            <View style={styles.techStack}>
              <Text style={styles.techLabel}>Powered by:</Text>
              <Text style={styles.techText}>OpenAI GPT-5.2 Vision • Expo • FastAPI</Text>
            </View>
          </View>
        </HUDWidget>

        {/* Save Button */}
        <GlowButton
          title={saving ? 'Saving...' : 'Save Settings'}
          icon="save"
          onPress={handleSave}
          color={COLORS.accent}
          loading={saving}
          size="large"
          style={styles.saveButton}
        />
      </ScrollView>
    </View>
  );
}

const getWidgetIcon = (widgetId: string): keyof typeof Ionicons.glyphMap => {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    time: 'time-outline',
    weather: 'cloudy-outline',
    compass: 'compass-outline',
    battery: 'battery-half-outline',
    translation: 'language-outline',
    object_recognition: 'eye-outline',
    social_cues: 'chatbubbles-outline',
    memory: 'hardware-chip-outline',
  };
  return icons[widgetId] || 'square-outline';
};

const formatWidgetName = (widgetId: string): string => {
  return widgetId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerSafe: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  languageSection: {
    gap: SPACING.md,
  },
  languageSpacer: {
    height: SPACING.sm,
  },
  settingsGroup: {
    gap: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textPrimary,
  },
  settingDescription: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sliderContainer: {
    width: 120,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  widgetsGrid: {
    gap: SPACING.sm,
  },
  widgetToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  widgetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  widgetName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary,
  },
  widgetNameDisabled: {
    color: COLORS.textMuted,
  },
  vitureSection: {
    gap: SPACING.md,
  },
  vitureStatus: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.warningGlow,
    padding: SPACING.md,
    borderRadius: 12,
  },
  vitureText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  vitureFeatures: {
    gap: SPACING.xs,
  },
  vitureFeatureTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
  vitureFeatureDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  aboutSection: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  appName: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  appVersion: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
  },
  appDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  techStack: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  techLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
  },
  techText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.accent,
  },
  saveButton: {
    marginTop: SPACING.lg,
    alignSelf: 'center',
  },
});
