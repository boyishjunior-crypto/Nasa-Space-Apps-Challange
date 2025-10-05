import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/Icon';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
} from '@/constants/design-system';
import { BookmarkService, Bookmark } from '@/src/services/bookmarkService';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { testConnection } from '../../supabasecliente';
function formatNumber(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserBookmarks = async () => {
    setLoading(true);
    try {
      const data = await BookmarkService.getUserBookmarks();
      setBookmarks(data || []);
    } catch (_) {
      setBookmarks([]);
    }
    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserBookmarks();
    }, [])
  );

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/login' as const);
  };

  const { noteCount, imageCount } = useMemo(() => {
    const imageIds = new Set<string>();
    let noteCount = 0;
    bookmarks.forEach(bm => {
      imageIds.add(bm.image_id);
      if ((bm.notes || '').trim().length > 0) {
        noteCount++;
      }
    });
    return { noteCount, imageCount: imageIds.size };
  }, [bookmarks]);

  const stats = [
    {
      icon: 'bookmark' as const,
      label: 'Notes',
      value: noteCount,
      gradient: ['#667eea', '#764ba2'] as const,
    },
    {
      icon: 'images' as const,
      label: 'Images',
      value: imageCount,
      gradient: ['#fa709a', '#fee140'] as const,
    },
  ];

  const recentNotes = useMemo(() => {
    return bookmarks
      .filter(b => (b.notes || '').trim().length > 0)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [bookmarks]);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.userSection}>
          <View style={styles.avatarContainer}>
            <ThemedText style={styles.avatarPlaceholder}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </ThemedText>
          </View>
          <ThemedText style={styles.userName}>
            {user?.email?.split('@')[0] || 'User'}
          </ThemedText>
          <ThemedText style={styles.userEmail}>{user?.email}</ThemedText>
        </View>


        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Recent Activity</ThemedText>
            <Icon name="chevron-forward" size={20} color={Colors.text.secondary} />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.text.primary} />
            </View>
          ) : recentNotes.length > 0 ? (
            <View style={styles.activityCardsContainer}>
              {recentNotes.slice(0, 3).map((bm, index) => {
                const image = (bm as any).images;
                return (
                  <TouchableOpacity
                    key={bm.id}
                    style={styles.activityCard}
                    onPress={() => {
                      if (image?.id) {
                        router.push({
                          pathname: '/image-detail',
                          params: {
                            imageId: image.id,
                            imageUrl: image.high_res_url || image.thumbnail_url,
                            nasaItem: JSON.stringify({
                              data: [{ nasa_id: '', title: image.title }],
                              links: [{ href: image.high_res_url }],
                            }),
                          },
                        });
                      }
                    }}>
                    <View style={styles.activityIconContainer}>
                      <ThemedText style={styles.activityIcon}>📷</ThemedText>
                    </View>
                    <View style={styles.activityTextContainer}>
                      <ThemedText style={styles.activityTitle} numberOfLines={1}>
                        {image?.title || 'Untitled Image'}
                      </ThemedText>
                      <ThemedText style={styles.activitySubtitle} numberOfLines={1}>
                        {(bm.notes || '').trim() || 'No notes'}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyActivity}>
              <ThemedText style={styles.emptyActivityText}>
                No activity yet
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="bookmark-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
            <Icon name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A3D4A',
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['6xl'],
  },
  userSection: {
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8B17F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarPlaceholder: {
    fontSize: 36,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#3A3D4A',
  },
  userName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: Typography.fontSize.base,
    color: 'rgba(255,255,255,0.7)',
  },
  section: {
    marginBottom: Spacing['3xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  activityCardsContainer: {
    gap: Spacing.md,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2C2E38',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  activityIcon: {
    fontSize: 24,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#2C2E38',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: '#8E8E93',
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyActivityText: {
    fontSize: Typography.fontSize.base,
    color: 'rgba(255,255,255,0.5)',
  },
  bottomActions: {
    flexDirection: 'row',
    backgroundColor: '#52555E',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    gap: Spacing.md,
    marginTop: Spacing['3xl'],
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
});
