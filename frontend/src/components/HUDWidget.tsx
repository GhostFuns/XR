import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, SHADOWS } from '../constants/theme';

interface HUDWidgetProps {
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  glowing?: boolean;
  compact?: boolean;
  transparent?: boolean;
}

export const HUDWidget: React.FC<HUDWidgetProps> = ({
  title,
  icon,
  iconColor = COLORS.primary,
  children,
  style,
  onPress,
  glowing = false,
  compact = false,
  transparent = false,
}) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.container,
        compact && styles.compact,
        transparent && styles.transparent,
        glowing && styles.glowing,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {(title || icon) && (
        <View style={styles.header}>
          {icon && (
            <Ionicons
              name={icon}
              size={compact ? 16 : 20}
              color={iconColor}
              style={styles.icon}
            />
          )}
          {title && (
            <Text style={[styles.title, compact && styles.titleCompact]}>
              {title}
            </Text>
          )}
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.soft,
  },
  compact: {
    padding: SPACING.sm,
    borderRadius: 12,
  },
  transparent: {
    backgroundColor: COLORS.surfaceGlass,
  },
  glowing: {
    borderColor: COLORS.primaryGlow,
    ...SHADOWS.glow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  icon: {
    marginRight: SPACING.xs,
  },
  title: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titleCompact: {
    fontSize: FONTS.sizes.xs,
  },
  content: {},
});
