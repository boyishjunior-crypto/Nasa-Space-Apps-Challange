import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { Colors, BorderRadius, Shadows, Typography } from '@/constants/design-system';

interface GradientButtonProps {
  onPress: () => void;
  title: string;
  gradient?: string[];
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function GradientButton({
  onPress,
  title,
  gradient = Colors.gradients.cosmic,
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  size = 'md',
}: GradientButtonProps) {
  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 16 },
    md: { paddingVertical: 14, paddingHorizontal: 24 },
    lg: { paddingVertical: 18, paddingHorizontal: 32 },
  };

  const textSizes = {
    sm: Typography.fontSize.sm,
    md: Typography.fontSize.base,
    lg: Typography.fontSize.lg,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <LinearGradient
        colors={disabled ? ['#4B5563', '#374151'] : gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, sizeStyles[size], disabled && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.text.primary} />
        ) : (
          <ThemedText style={[styles.text, { fontSize: textSizes[size] }, textStyle]}>
            {icon && `${icon} `}{title}
          </ThemedText>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    ...Shadows.md,
  },
  gradient: {
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold as any,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
