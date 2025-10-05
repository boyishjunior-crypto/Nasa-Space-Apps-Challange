import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Icon } from '@/components/ui/Icon';
import { Colors as ThemeColors } from '@/constants/theme';
import { Colors, TouchTarget } from '@/constants/design-system';
import { UIFlags } from '@/constants/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const variant = UIFlags.tabBarVariant;
  const bottomOffset = Math.max(insets.bottom, 20) + 20; // Positioned above gesture bar without touching content

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary[400],
        tabBarInactiveTintColor: Colors.text.disabled,
        headerShown: false,
        tabBarShowLabel: variant === 'anchored',
        tabBarButton: HapticTab,
        tabBarStyle:
          variant === 'floating'
            ? {
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: bottomOffset,
                backgroundColor: Colors.background.secondary,
                borderTopColor: 'transparent',
                borderTopWidth: 0,
                borderRadius: 28,
                height: 64,
                paddingBottom: 10,
                paddingTop: 10,
                elevation: 20,
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
              }
            : {
                backgroundColor: Colors.background.secondary,
                borderTopColor: 'rgba(255,255,255,0.1)',
                borderTopWidth: 1,
                height: Platform.OS === 'ios' ? 88 : TouchTarget.comfortable + 8,
                paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                paddingTop: 8,
              },
        tabBarLabelStyle:
          variant === 'anchored'
            ? { fontSize: 12, fontWeight: '600', marginTop: 4 }
            : { display: 'none' },
        tabBarItemStyle: variant === 'anchored' ? { paddingVertical: 4 } : { paddingVertical: 0 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={focused ? 32 : 28}
              name="house.fill"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={focused ? 32 : 28}
              name="paperplane.fill"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={focused ? 32 : 28}
              name="person.fill"
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}