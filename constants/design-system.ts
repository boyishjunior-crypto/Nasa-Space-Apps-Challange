// Modern Design System for NASA App

export const Colors = {
  // Primary Palette - Deep Space Theme
  primary: {
    50: '#EBF5FF',
    100: '#D1E9FF',
    200: '#B3DDFF',
    300: '#84CAFF',
    400: '#53B1FD',
    500: '#2E90FA',
    600: '#1570EF',
    700: '#175CD3',
    800: '#1849A9',
    900: '#194185',
  },
  
  // Background - Dark Space
  background: {
    primary: '#0A0E27',
    secondary: '#141B34',
    tertiary: '#1E2749',
    card: '#1A2238',
    elevated: '#252E4A',
  },
  
  // Text - Improved contrast for WCAG AA compliance
  text: {
    primary: '#FFFFFF',
    secondary: '#E5E7EB',
    tertiary: '#D1D5DB',
    disabled: '#9CA3AF',
    inverse: '#111827',
    placeholder: '#9CA3AF',
  },
  
  // Accent Colors
  accent: {
    purple: '#A855F7',
    pink: '#EC4899',
    orange: '#F97316',
    yellow: '#FBBF24',
    green: '#10B981',
    cyan: '#06B6D4',
  },
  
  // Status
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  
  // Gradients
  gradients: {
    cosmic: ['#667eea', '#764ba2', '#f093fb'] as const,
    nebula: ['#4facfe', '#00f2fe'] as const,
    aurora: ['#a8edea', '#fed6e3'] as const,
    sunset: ['#fa709a', '#fee140'] as const,
    galaxy: ['#2E3192', '#1BFFFF'] as const,
    deepSpace: ['#000428', '#004e92'] as const,
  },
};

export const Typography = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  
  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

// Touch targets - Minimum 48dp for accessibility
export const TouchTarget = {
  minimum: 48,
  comfortable: 56,
};

export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// Standard card radius for consistency
export const CardRadius = BorderRadius['2xl'];

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
  glow: {
    shadowColor: '#2E90FA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
};

export const Animation = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export const Layout = {
  maxWidth: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  containerPadding: 20,
};
