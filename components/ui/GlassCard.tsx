import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/design-system';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'glow';
}

export function GlassCard({ children, style, variant = 'default' }: GlassCardProps) {
  return (
    <View style={[
      styles.container,
      variant === 'elevated' && styles.elevated,
      variant === 'glow' && styles.glow,
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(26, 34, 56, 0.6)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    overflow: 'hidden',
  },
  elevated: {
    ...Shadows.lg,
    backgroundColor: 'rgba(37, 46, 74, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  glow: {
    ...Shadows.glow,
    backgroundColor: 'rgba(46, 144, 250, 0.1)',
    borderColor: 'rgba(46, 144, 250, 0.3)',
  },
});
