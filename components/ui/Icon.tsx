import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/design-system';

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 24, color = Colors.text.primary }: IconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}
