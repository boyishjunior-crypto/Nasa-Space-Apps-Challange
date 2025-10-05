// ============================================================================
// Image Detail Screen - Full-featured viewer with annotations and ML
// ============================================================================
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/Icon';
import { Colors, Typography, Spacing, BorderRadius, TouchTarget } from '@/constants/design-system';
import { DeepZoomViewer } from '@/components/ui/DeepZoomViewer';
// Removed Annotations/ML features per request
import { BookmarkService } from '@/src/services/bookmarkService';
import { subscribeToImageAnnotations, subscribeToMLProposals } from '@/supabasecliente';

export default function ImageDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const imageId = params.imageId as string;
  const imageUrl = params.imageUrl as string;
  const nasaItem = params.nasaItem ? JSON.parse(params.nasaItem as string) : null;

  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    loadData();
    setupRealtimeSubscriptions();
  }, [imageId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Check bookmark status
      const bookmarked = await BookmarkService.isBookmarked(imageId);
      setIsBookmarked(bookmarked);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Notes are stored on bookmarks; no realtime needed
    return () => {};
  };

  const handleSaveNotes = async () => {};

  const handleSelection = async () => {};

  const handleAnnotationClick = async () => {};

  const handleToggleBookmark = async () => {
    try {
      if (isBookmarked) {
        await BookmarkService.removeBookmark(imageId);
        setIsBookmarked(false);
        Alert.alert('Success', 'Bookmark removed');
      } else {
        await BookmarkService.addBookmark(imageId);
        setIsBookmarked(true);
        Alert.alert('Success', 'Bookmark added');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update bookmark.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0f172a', '#1e1b4b']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {nasaItem?.data[0]?.title || 'Image Detail'}
        </ThemedText>
        <TouchableOpacity style={styles.bookmarkButton} onPress={handleToggleBookmark}>
          <Icon 
            name={isBookmarked ? "bookmark" : "bookmark-outline"} 
            size={24} 
            color={isBookmarked ? Colors.accent.yellow : Colors.text.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Deep Zoom Viewer */}
      <View style={styles.viewerContainer}>
        <DeepZoomViewer
          imageUrl={imageUrl}
          annotations={[]}
          mlProposals={[]}
          onSelection={handleSelection}
          onAnnotationClick={handleAnnotationClick}
        />
      </View>

      {/* Controls removed in notes-free mode */}

      {/* Info Panel */}
      {nasaItem && (
        <View style={styles.infoPanel}>
          <ThemedText style={styles.infoTitle}>
            {nasaItem.data[0].title}
          </ThemedText>
          <ThemedText style={styles.infoDescription} numberOfLines={3}>
            {nasaItem.data[0].description}
          </ThemedText>
          {/* Notes UI removed */}
          <View style={styles.infoMeta}>
            <View style={styles.infoMetaItem}>
              <Icon name="calendar" size={14} color={Colors.text.tertiary} />
              <ThemedText style={styles.infoMetaText}>
                {nasaItem.data[0].date_created ? 
                  new Date(nasaItem.data[0].date_created).toLocaleDateString() : 
                  'Unknown'}
              </ThemedText>
            </View>
            <View style={styles.infoMetaItem}>
              <Icon name="location" size={14} color={Colors.text.tertiary} />
              <ThemedText style={styles.infoMetaText}>
                {nasaItem.data[0].center || 'NASA'}
              </ThemedText>
            </View>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['5xl'],
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    width: TouchTarget.minimum,
    height: TouchTarget.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.text.primary,
  },
  bookmarkButton: {
    width: TouchTarget.minimum,
    height: TouchTarget.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  controlPanel: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(20, 27, 52, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  controlButton: {
    marginRight: Spacing.md,
  },
  controlButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    minHeight: TouchTarget.minimum,
  },
  controlButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  controlButtonText: {
    color: '#FFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
  },
  controlButtonTextSecondary: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
  },
  infoPanel: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(20, 27, 52, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  infoTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  infoDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  infoMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  infoMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoMetaText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
});
