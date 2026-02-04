import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, SPACING, FONTS, LANGUAGE_CONFIG } from '../../src/constants/theme';
import { HUDWidget } from '../../src/components/HUDWidget';
import { GlowButton } from '../../src/components/GlowButton';
import { useHUDStore } from '../../src/store/hudStore';
import { checkHealth } from '../../src/utils/api';
import { useViture } from '../../src/hooks/useViture';

const { width } = Dimensions.get('window');

export default function HUDScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const { targetLanguage, nativeLanguage, isListening, setIsListening } = useHUDStore();
  
  // Viture SDK integration
  const viture = useViture();

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

  const handleVitureConnect = async () => {
    const result = await viture.initialize();
    if (result.success) {
      Alert.alert('Connected', 'Viture Luma Ultra connected successfully!');
    } else {
      Alert.alert('Connection Failed', result.message);
    }
  };

  const handleVitureDisconnect = async () => {
    await viture.release();
    Alert.alert('Disconnected', 'Viture glasses disconnected');
  };

  const targetLangConfig = LANGUAGE_CONFIG[targetLanguage];
  const nativeLangConfig = LANGUAGE_CONFIG[nativeLanguage];

  // Calculate compass heading from yaw
  const getCompassHeading = () => {
    if (viture.imuData) {
      const yaw = viture.imuData.yaw;
      const heading = ((yaw % 360) + 360) % 360;
      if (heading >= 337.5 || heading < 22.5) return 'N';
      if (heading >= 22.5 && heading < 67.5) return 'NE';
      if (heading >= 67.5 && heading < 112.5) return 'E';
      if (heading >= 112.5 && heading < 157.5) return 'SE';
      if (heading >= 157.5 && heading < 202.5) return 'S';
      if (heading >= 202.5 && heading < 247.5) return 'SW';
      if (heading >= 247.5 && heading < 292.5) return 'W';
      return 'NW';
    }
    return 'N';
  };

  const getCompassDegrees = () => {
    if (viture.imuData) {
      return Math.round(((viture.imuData.yaw % 360) + 360) % 360);
    }
    return 0;
  };

  return (
    <View style={styles.container}>
      {/* Header HUD Bar */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.hudHeader}>
          <View style={styles.hudHeaderLeft}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? COLORS.accent : COLORS.danger }]} />
            <Text style={styles.hudTitle}>WORLD HUD</Text>
            <Text style={styles.hudSubtitle}>v2.0</Text>
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
        {/* Viture Connection Status */}
        <HUDWidget
          title="Viture Luma Ultra"
          icon="glasses-outline"
          iconColor={viture.isConnected ? COLORS.accent : COLORS.secondary}
          glowing={viture.isConnected}
          style={styles.vitureConnectionCard}
        >
          <View style={styles.vitureConnectionContent}>
            <View style={styles.vitureStatusRow}>
              <View style={styles.vitureStatusItem}>
                <Ionicons 
                  name={viture.isConnected ? "checkmark-circle" : "close-circle"} 
                  size={24} 
                  color={viture.isConnected ? COLORS.accent : COLORS.danger} 
                />
                <Text style={styles.vitureStatusLabel}>
                  {viture.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </Text>
              </View>
              {viture.isConnected && (
                <>
                  <View style={styles.vitureStatusItem}>
                    <Ionicons 
                      name="speedometer-outline" 
                      size={20} 
                      color={viture.imuEnabled ? COLORS.accent : COLORS.textMuted} 
                    />
                    <Text style={styles.vitureStatusLabel}>
                      IMU {viture.imuEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                  <View style={styles.vitureStatusItem}>
                    <Ionicons 
                      name="cube-outline" 
                      size={20} 
                      color={viture.mode3D ? COLORS.secondary : COLORS.textMuted} 
                    />
                    <Text style={styles.vitureStatusLabel}>
                      3D {viture.mode3D ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.vitureActions}>
              {!viture.isConnected ? (
                <GlowButton
                  title={viture.isInitializing ? "Connecting..." : "Connect Glasses"}
                  icon="link-outline"
                  onPress={handleVitureConnect}
                  color={COLORS.secondary}
                  loading={viture.isInitializing}
                  disabled={!viture.isAvailable}
                />
              ) : (
                <>
                  <GlowButton
                    title={viture.imuEnabled ? "Disable IMU" : "Enable IMU"}
                    icon="speedometer-outline"
                    onPress={viture.toggleIMU}
                    color={viture.imuEnabled ? COLORS.danger : COLORS.accent}
                    variant="outline"
                    size="small"
                  />
                  <GlowButton
                    title={viture.mode3D ? "2D Mode" : "3D Mode"}
                    icon="cube-outline"
                    onPress={viture.toggle3D}
                    color={COLORS.secondary}
                    variant="outline"
                    size="small"
                  />
                  <GlowButton
                    title="Disconnect"
                    icon="unlink-outline"
                    onPress={handleVitureDisconnect}
                    color={COLORS.danger}
                    variant="ghost"
                    size="small"
                  />
                </>
              )}
            </View>

            {!viture.isAvailable && Platform.OS !== 'android' && (
              <Text style={styles.vitureNote}>
                Viture SDK requires Android. Use the Expo Go app on your Samsung S25+ connected to your Viture glasses.
              </Text>
            )}
            {!viture.isAvailable && Platform.OS === 'android' && (
              <Text style={styles.vitureNote}>
                Run `npx expo run:android` to build a development version with native SDK support.
              </Text>
            )}
          </View>
        </HUDWidget>

        {/* Main Status Card */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardGlow} />
          <View style={styles.mainCardContent}>
            <Text style={styles.mainCardTitle}>
              {viture.isConnected ? 'XR MODE ACTIVE' : 'READY FOR INPUT'}
            </Text>
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
                <Ionicons 
                  name="glasses-outline" 
                  size={20} 
                  color={viture.isConnected ? COLORS.accent : COLORS.textMuted} 
                />
                <Text style={styles.statLabel}>
                  {viture.isConnected ? 'XR ON' : 'XR OFF'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* IMU Data Widget - Only shows when connected */}
        {viture.isConnected && viture.imuData && (
          <HUDWidget
            title="Head Tracking Data"
            icon="navigate-outline"
            iconColor={COLORS.primary}
            glowing
            style={styles.imuWidget}
          >
            <View style={styles.imuGrid}>
              <View style={styles.imuItem}>
                <Text style={styles.imuLabel}>ROLL</Text>
                <Text style={styles.imuValue}>{viture.imuData.roll.toFixed(1)}°</Text>
              </View>
              <View style={styles.imuItem}>
                <Text style={styles.imuLabel}>PITCH</Text>
                <Text style={styles.imuValue}>{viture.imuData.pitch.toFixed(1)}°</Text>
              </View>
              <View style={styles.imuItem}>
                <Text style={styles.imuLabel}>YAW</Text>
                <Text style={styles.imuValue}>{viture.imuData.yaw.toFixed(1)}°</Text>
              </View>
            </View>
            <GlowButton
              title="Reset Orientation"
              icon="refresh-outline"
              onPress={viture.resetOrientation}
              color={COLORS.primary}
              variant="outline"
              size="small"
              style={{ marginTop: SPACING.md }}
            />
          </HUDWidget>
        )}

        {/* Widget Grid */}
        <View style={styles.widgetGrid}>
          {/* Time Widget */}
          <HUDWidget title="Time" icon="time-outline" compact style={styles.widgetSmall}>
            <Text style={styles.widgetValue}>{format(currentTime, 'HH:mm')}</Text>
            <Text style={styles.widgetSubvalue}>{format(currentTime, 'EEE, MMM d')}</Text>
          </HUDWidget>

          {/* Compass Widget - Uses IMU data when available */}
          <HUDWidget 
            title="Compass" 
            icon="compass-outline" 
            compact 
            style={styles.widgetSmall}
            glowing={viture.isConnected && viture.imuEnabled}
          >
            <Text style={styles.widgetValue}>{getCompassHeading()}</Text>
            <Text style={styles.widgetSubvalue}>{getCompassDegrees()}°</Text>
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
              icon="file-tray-outline"
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
  vitureConnectionCard: {},
  vitureConnectionContent: {
    gap: SPACING.md,
  },
  vitureStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  vitureStatusItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  vitureStatusLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  vitureActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  vitureNote: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
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
  imuWidget: {},
  imuGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  imuItem: {
    alignItems: 'center',
  },
  imuLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  imuValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
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
});
