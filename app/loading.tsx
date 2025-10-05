import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/design-system';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0f172a', '#1e1b4b']}
        style={StyleSheet.absoluteFill}
      />
      <ActivityIndicator size="large" color={Colors.primary[400]} />
      <ThemedText style={styles.text}>Loading NASA Explorer...</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  text: {
    marginTop: Spacing.lg,
    fontSize: 18,
    color: Colors.text.primary,
  },
});
