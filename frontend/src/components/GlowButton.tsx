import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS } from '../constants/theme';

interface GlowButtonProps {
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  glowColor?: string;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'solid' | 'outline' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconOnly?: boolean;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
  title,
  icon,
  onPress,
  color = COLORS.primary,
  glowColor,
  loading = false,
  disabled = false,
  size = 'medium',
  variant = 'solid',
  style,
  textStyle,
  iconOnly = false,
}) => {
  const actualGlowColor = glowColor || `${color}50`;

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: SPACING.xs,
          paddingHorizontal: iconOnly ? SPACING.xs : SPACING.sm,
          minWidth: iconOnly ? 36 : 80,
          minHeight: 36,
        };
      case 'large':
        return {
          paddingVertical: SPACING.md,
          paddingHorizontal: iconOnly ? SPACING.md : SPACING.xl,
          minWidth: iconOnly ? 56 : 160,
          minHeight: 56,
        };
      default:
        return {
          paddingVertical: SPACING.sm,
          paddingHorizontal: iconOnly ? SPACING.sm : SPACING.lg,
          minWidth: iconOnly ? 48 : 120,
          minHeight: 48,
        };
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: color,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: color,
          borderWidth: 0,
        };
    }
  };

  const getTextColor = () => {
    if (variant === 'solid') {
      return COLORS.background;
    }
    return color;
  };

  const iconSize = size === 'small' ? 18 : size === 'large' ? 28 : 22;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getSizeStyles(),
        getVariantStyles(),
        !disabled && {
          shadowColor: actualGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 8,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={getTextColor()}
              style={!iconOnly && title ? styles.iconMargin : undefined}
            />
          )}
          {!iconOnly && title && (
            <Text
              style={[
                styles.text,
                { color: getTextColor() },
                size === 'small' && styles.textSmall,
                size === 'large' && styles.textLarge,
                textStyle,
              ]}
            >
              {title}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  iconMargin: {
    marginRight: SPACING.xs,
  },
  text: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  textSmall: {
    fontSize: FONTS.sizes.sm,
  },
  textLarge: {
    fontSize: FONTS.sizes.lg,
  },
});
