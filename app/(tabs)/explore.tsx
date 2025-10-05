import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, TextInput, ActivityIndicator, Modal, TouchableOpacity, ImageBackground, Alert, ScrollView, Keyboard } from 'react-native';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NASAApiService } from '@/src/services/nasaApi';
import { NASAImageItem } from '@/src/types/nasa';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/Icon';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/design-system';
import { FlashList } from '@shopify/flash-list';
// Removed annotation creation; using bookmarks notes instead
import { ImageService } from '@/src/services/imageService';
import { BookmarkService } from '@/src/services/bookmarkService';
import { useAppContext } from '@/src/context/AppContext';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useRouter } from 'expo-router';

// Add a height property to the image item for the staggered grid
type ImageItemWithHeight = NASAImageItem & { height: number };

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [images, setImages] = useState<ImageItemWithHeight[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageItemWithHeight | null>(null);
  const [annotation, setAnnotation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const { state: { isOnline, pendingSync }, syncNow } = useAppContext();
  const autoSaveTimeout = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadImages(true);
  }, [searchQuery]);

  // When a new image is selected, preload any existing note for it
  useEffect(() => {
    const loadExistingNote = async () => {
      if (!selectedImage) return;
      try {
        const imageRecord = await ImageService.getOrCreateImage(selectedImage);
        const bookmarks = await BookmarkService.getUserBookmarks();
        const existing = bookmarks.find(b => b.image_id === imageRecord.id);
        if (existing?.notes) {
          setAnnotation(existing.notes);
          setHasUnsavedChanges(false);
        } else {
          setAnnotation('');
          setHasUnsavedChanges(false);
        }
      } catch (_) {
        // Ignore preload errors; user can still write and save
      }
    };
    loadExistingNote();
  }, [selectedImage]);

  const loadImages = async (isNewSearch = false) => {
    setLoading(true);
    const currentPage = isNewSearch ? 1 : page;
    try {
      const data = await NASAApiService.searchImages({
        q: searchQuery || 'galaxy',
        media_type: 'image',
        page: currentPage,
      });

      const itemsWithHeight = data.collection.items.map((item) => ({
        ...item,
        height: Math.floor(Math.random() * 100) + 200, // Random height for staggered effect
      }));

      if (isNewSearch) {
        setImages(itemsWithHeight);
      } else {
        setImages((prev) => [...prev, ...itemsWithHeight]);
      }
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading) {
      setPage((prev) => prev + 1);
      loadImages();
    }
  };

  const handleImagePress = (image: ImageItemWithHeight) => {
    // Open notes modal directly on tap (per request)
    setSelectedImage(image);
    setModalVisible(true);
  };

  const handleSaveAnnotation = async () => {
    if (!selectedImage || !annotation.trim()) return;

    setIsSaving(true);
    try {
      // First, get or create the image in Supabase
      const image = await ImageService.getOrCreateImage(selectedImage);
      const isBookmarked = await BookmarkService.isBookmarked(image.id);
      if (!isBookmarked) {
        await BookmarkService.addBookmark(image.id, annotation.trim());
      } else {
        await BookmarkService.updateBookmarkNotes(image.id, annotation.trim());
      }

      setHasUnsavedChanges(false);
      Alert.alert('Success', 'Your observation has been saved.');
      setAnnotation('');
      setModalVisible(false);
      setSelectedImage(null);
    } catch (error) {
      console.error('Error saving annotation:', error);
      Alert.alert('Error', 'Failed to save observation. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnnotationChange = (text: string) => {
    // Disable auto-save; user must tap Save
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = null;
    }
    setAnnotation(text);
    setHasUnsavedChanges(true);
  };

  const handleCloseModal = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved observations. Do you want to save before closing?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => {
            setAnnotation('');
            setHasUnsavedChanges(false);
            setModalVisible(false);
            setSelectedImage(null);
          }},
          { text: 'Save', onPress: handleSaveAnnotation },
        ]
      );
    } else {
      setModalVisible(false);
      setSelectedImage(null);
    }
  };

  const onPinchEvent = useCallback((event: any) => {
    scale.value = event.nativeEvent.scale;
  }, []);

  const onPanEvent = useCallback((event: any) => {
    translateX.value = event.nativeEvent.translationX;
    translateY.value = event.nativeEvent.translationY;
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(scale.value) },
        { translateX: withSpring(translateX.value) },
        { translateY: withSpring(translateY.value) },
      ],
    };
  });

  const renderItem = useCallback(({ item }: { item: ImageItemWithHeight }) => {
    const imageUrl = item.links?.[0]?.href || 'https://via.placeholder.com/150';
    return (
      <TouchableOpacity
        style={{ margin: 4 }}
        onPress={() => handleImagePress(item)}
      >
        <ImageBackground
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: item.height, borderRadius: 12, overflow: 'hidden' }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageOverlay}
          >
            <ThemedText style={styles.imageTitle} numberOfLines={2}>
              {item.data[0].title}
            </ThemedText>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  }, []);

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0f172a', '#1e1b4b']}
        style={StyleSheet.absoluteFill}
      />

      {!isOnline && <OfflineBanner pendingCount={pendingSync} onSync={syncNow} />}

      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Cosmic Canvas</ThemedText>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={Colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search galaxies, nebulas, stars..."
          placeholderTextColor={Colors.text.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => loadImages(true)}
        />
      </View>

      <FlashList
        masonry
        data={images}
        renderItem={renderItem}
        keyExtractor={(item: ImageItemWithHeight, index: number) => `${item.data[0].nasa_id}-${index}`}
        numColumns={2}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="large" color={Colors.primary[400]} style={styles.loader} /> : null}
      />

      {selectedImage && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <ImageBackground
              source={{ uri: selectedImage.links[0].href }}
              style={styles.modalImage}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
                style={styles.modalOverlay}
              >
                <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
                  <Icon name="close" size={32} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.modalHeader}>
                  <ScrollView style={styles.metadataScroll} showsVerticalScrollIndicator={false}>
                    <ThemedText style={styles.modalTitle}>{selectedImage.data[0].title}</ThemedText>
                    <ThemedText style={styles.modalDescription}>{selectedImage.data[0].description}</ThemedText>
                    <View style={styles.metadataRow}>
                      <ThemedText style={styles.metadataLabel}>NASA ID:</ThemedText>
                      <ThemedText style={styles.metadataValue}>{selectedImage.data[0].nasa_id}</ThemedText>
                    </View>
                    {selectedImage.data[0].date_created && (
                      <View style={styles.metadataRow}>
                        <ThemedText style={styles.metadataLabel}>Date:</ThemedText>
                        <ThemedText style={styles.metadataValue}>
                          {new Date(selectedImage.data[0].date_created).toLocaleDateString()}
                        </ThemedText>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </LinearGradient>
            </ImageBackground>
            <View style={styles.annotationContainer}>
              <View style={styles.annotationHeader}>
                <ThemedText style={styles.annotationTitle}>Add Observation</ThemedText>
                {hasUnsavedChanges && (
                  <View style={styles.unsavedIndicator}>
                    <ThemedText style={styles.unsavedText}>Unsaved</ThemedText>
                  </View>
                )}
              </View>
              <TextInput
                style={styles.annotationInput}
                placeholder="Describe brightness, color, morphology, and notable features..."
                placeholderTextColor={Colors.text.placeholder}
                value={annotation}
                onChangeText={handleAnnotationChange}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity 
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
                onPress={handleSaveAnnotation}
                disabled={isSaving || !annotation.trim()}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <ThemedText style={styles.saveButtonText}>Save Observation</ThemedText>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: Colors.background.secondary, marginTop: Spacing.sm }]}
                onPress={async () => {
                  if (!selectedImage) return;
                  try {
                    const record = await ImageService.getOrCreateImage(selectedImage);
                    const imageUrl = selectedImage.links?.[0]?.href || '';
                    router.push({
                      pathname: '/image-detail',
                      params: {
                        imageId: record.id,
                        imageUrl,
                        nasaItem: JSON.stringify(selectedImage),
                      },
                    } as const);
                  } catch (_) {}
                }}
              >
                <ThemedText style={styles.saveButtonText}>Open Viewer</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing['6xl'],
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.extrabold as any,
    color: Colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
  },
  imageOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  imageTitle: {
    color: '#FFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold as any,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  loader: {
    marginVertical: Spacing.lg,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },
  modalImage: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.xl,
    paddingTop: Spacing['5xl'],
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  modalHeader: {},
  modalTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFF',
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  modalDescription: {
    fontSize: Typography.fontSize.base,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  metadataScroll: {
    maxHeight: 150,
  },
  metadataRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  metadataLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.text.secondary,
  },
  metadataValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    flex: 1,
  },
  annotationContainer: {
    padding: Spacing.xl,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  annotationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  annotationTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.text.primary,
  },
  unsavedIndicator: {
    backgroundColor: Colors.status.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  unsavedText: {
    fontSize: Typography.fontSize.xs,
    color: '#000',
    fontWeight: Typography.fontWeight.semibold as any,
  },
  annotationInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  saveButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.text.disabled,
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
  },
});
