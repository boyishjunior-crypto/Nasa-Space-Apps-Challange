import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/Icon';
import { Colors, Spacing } from '@/constants/design-system';

export function OfflineBanner({ pendingCount, onSync }: { pendingCount: number; onSync: () => void }) {
  return (
    <View style={styles.banner}>
      <Icon name="cloud-offline" size={16} color="#FFF" />
      <ThemedText style={styles.text}>
        Offline - {pendingCount} pending
      </ThemedText>
      <TouchableOpacity onPress={onSync} style={styles.syncButton}>
        <ThemedText style={styles.syncText}>Sync</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.warning,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  text: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  syncButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
  },
  syncText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
