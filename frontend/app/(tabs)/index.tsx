import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONTS, LANGUAGE_CONFIG } from '../../src/constants/theme';
import { HUDWidget } from '../../src/components/HUDWidget';
import { GlowButton } from '../../src/components/GlowButton';
import { useHUDStore } from '../../src/store/hudStore';
import { checkHealth } from '../../src/utils/api';

const { width } = Dimensions.get('window');

export default function HUDScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const { targetLanguage, nativeLanguage, isListening, setIsListening } = useHUDStore();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    checkServerHealth();
    return () => clearInterval(timer);
  }, []);

  const checkServerHealth = async () => {
    try {
      await checkHealth();
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkServerHealth();
    setRefreshing(false);
  };

  const targetLangConfig = LANGUAGE_CONFIG[targetLanguage];
  const nativeLangConfig = LANGUAGE_CONFIG[nativeLanguage];

  return (
    <View style={styles.container}>
      {/* Header HUD Bar */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.hudHeader}>
          <View style={styles.hudHeaderLeft}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? COLORS.accent : COLORS.danger }]} />
            <Text style={styles.hudTitle}>WORLD HUD</Text>
            <Text style={styles.hudSubtitle}>v1.0</Text>
          </View>
          <View style={styles.hudHeaderRight}>
            <Text style={styles.timeText}>{format(currentTime, 'HH:mm:ss')}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Main Status Card */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardGlow} />
          <View style={styles.mainCardContent}>
            <Text style={styles.mainCardTitle}>READY FOR INPUT</Text>
            <Text style={styles.mainCardSubtitle}>
              {nativeLangConfig.flag} {nativeLangConfig.name} → {targetLangConfig.flag} {targetLangConfig.name}
            </Text>
            
            {/* Quick Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="wifi" size={20} color={isOnline ? COLORS.accent : COLORS.danger} />
                <Text style={styles.statLabel}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="mic" size={20} color={isListening ? COLORS.accent : COLORS.textMuted} />
                <Text style={styles.statLabel}>{isListening ? 'LISTENING' : 'STANDBY'}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="eye" size={20} color={COLORS.primary} />
                <Text style={styles.statLabel}>VISION OK</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Widget Grid */}
        <View style={styles.widgetGrid}>
          {/* Time Widget */}
          <HUDWidget title="Time" icon="time-outline" compact style={styles.widgetSmall}>
            <Text style={styles.widgetValue}>{format(currentTime, 'HH:mm')}</Text>
            <Text style={styles.widgetSubvalue}>{format(currentTime, 'EEE, MMM d')}</Text>
          </HUDWidget>

          {/* Compass Widget */}
          <HUDWidget title="Compass" icon="compass-outline" compact style={styles.widgetSmall}>
            <Text style={styles.widgetValue}>N</Text>
            <Text style={styles.widgetSubvalue}>0°</Text>
          </HUDWidget>

          {/* Battery Widget */}
          <HUDWidget title="Status" icon="battery-half-outline" compact style={styles.widgetSmall}>
            <Text style={styles.widgetValue}>75%</Text>
            <Text style={styles.widgetSubvalue}>4h left</Text>
          </HUDWidget>

          {/* Connection Widget */}
          <HUDWidget title="Network" icon="globe-outline" compact style={styles.widgetSmall}>
            <Text style={[styles.widgetValue, { color: isOnline ? COLORS.accent : COLORS.danger }]}>
              {isOnline ? 'OK' : 'ERR'}
            </Text>
            <Text style={styles.widgetSubvalue}>{isOnline ? 'Connected' : 'No Signal'}</Text>
          </HUDWidget>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.actionButtons}>
            <GlowButton
              title="Translate"
              icon="language-outline"
              onPress={() => {}}
              color={COLORS.primary}
              size="medium"
              style={styles.actionButton}
            />
            <GlowButton
              title="Recognize"
              icon="eye-outline"
              onPress={() => {}}
              color={COLORS.secondary}
              size="medium"
              style={styles.actionButton}
            />
            <GlowButton
              title="Memory"
              icon="brain-outline"
              onPress={() => {}}
              color={COLORS.accent}
              size="medium"
              style={styles.actionButton}
            />
          </View>
        </View>

        {/* Active Language Display */}
        <HUDWidget
          title="Active Translation Mode"
          icon="swap-horizontal-outline"
          glowing
          style={styles.translationWidget}
        >
          <View style={styles.languageRow}>
            <View style={styles.languageBox}>
              <Text style={styles.languageFlag}>{nativeLangConfig.flag}</Text>
              <Text style={[styles.languageName, { color: nativeLangConfig.color }]}>
                {nativeLangConfig.name}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={COLORS.primary} />
            <View style={styles.languageBox}>
              <Text style={styles.languageFlag}>{targetLangConfig.flag}</Text>
              <Text style={[styles.languageName, { color: targetLangConfig.color }]}>
                {targetLangConfig.name}
              </Text>
            </View>
          </View>
        </HUDWidget>

        {/* Viture Connection Status */}
        <HUDWidget
          title="Viture Luma Ultra Status"
          icon="glasses-outline"
          iconColor={COLORS.secondary}
          style={styles.vitureWidget}
        >
          <View style={styles.vitureStatus}>
            <View style={styles.vitureStatusRow}>
              <Text style={styles.vitureLabel}>Display Mode</Text>
              <Text style={styles.vitureValue}>XR Mirror</Text>
            </View>
            <View style={styles.vitureStatusRow}>
              <Text style={styles.vitureLabel}>Hand Tracking</Text>
              <Text style={[styles.vitureValue, { color: COLORS.warning }]}>SDK Required</Text>
            </View>
            <View style={styles.vitureStatusRow}>
              <Text style={styles.vitureLabel}>Camera Feed</Text>
              <Text style={[styles.vitureValue, { color: COLORS.warning }]}>SDK Required</Text>
            </View>
            <Text style={styles.vitureNote}>
              Note: Native Viture SDK integration required for glasses camera/hand tracking.
              Currently using phone camera for object recognition.
            </Text>
          </View>
        </HUDWidget>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerSafe: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  hudHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hudTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    letterSpacing: 2,
  },
  hudSubtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
  },
  hudHeaderRight: {},
  timeText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
    overflow: 'hidden',
    position: 'relative',
  },
  mainCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: COLORS.primaryGlow,
    opacity: 0.2,
  },
  mainCardContent: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  mainCardTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    letterSpacing: 3,
    marginBottom: SPACING.xs,
  },
  mainCardSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  widgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  widgetSmall: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2 - SPACING.md / 2,
  },
  widgetValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  widgetSubvalue: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  quickActions: {
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
  },
  translationWidget: {
    marginTop: SPACING.sm,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  languageBox: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  languageFlag: {
    fontSize: 32,
  },
  languageName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  vitureWidget: {
    marginBottom: SPACING.xl,
  },
  vitureStatus: {
    gap: SPACING.sm,
  },
  vitureStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vitureLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  vitureValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.accent,
  },
  vitureNote: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
});
