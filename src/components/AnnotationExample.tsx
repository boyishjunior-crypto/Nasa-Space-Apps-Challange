import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useAppContext } from '../context/AppContext';
import { Annotation } from '../types/nasa';

/**
 * Example component demonstrating how to use annotation CRUD operations
 * 
 * This component shows:
 * - Loading annotations for an image
 * - Creating new annotations
 * - Updating existing annotations
 * - Deleting annotations
 * 
 * Usage:
 * <AnnotationExample nasaId="PIA12345" imageUrl="https://..." />
 */

interface AnnotationExampleProps {
  nasaId: string;
  imageUrl?: string;
}

export default function AnnotationExample({ nasaId, imageUrl }: AnnotationExampleProps) {
  const {
    state,
    loadAnnotations,
    saveAnnotation,
    updateAnnotationInDB,
    deleteAnnotationFromDB,
  } = useAppContext();

  const [loading, setLoading] = useState(false);

  // Load annotations when component mounts or nasaId changes
  useEffect(() => {
    if (nasaId) {
      loadAnnotations(nasaId);
    }
  }, [nasaId]);

  // Example: Create a new text annotation
  const handleCreateTextAnnotation = async () => {
    setLoading(true);
    
    const newAnnotation: Omit<Annotation, 'id'> = {
      type: 'text',
      x: 100,
      y: 100,
      text: 'Example annotation',
      color: '#FF0000',
      fontSize: 16,
    };

    await saveAnnotation(newAnnotation, nasaId, imageUrl);
    setLoading(false);
  };

  // Example: Create a rectangle annotation
  const handleCreateRectangleAnnotation = async () => {
    setLoading(true);
    
    const newAnnotation: Omit<Annotation, 'id'> = {
      type: 'rectangle',
      x: 200,
      y: 200,
      width: 100,
      height: 80,
      color: '#00FF00',
    };

    await saveAnnotation(newAnnotation, nasaId, imageUrl);
    setLoading(false);
  };

  // Example: Create a circle annotation
  const handleCreateCircleAnnotation = async () => {
    setLoading(true);
    
    const newAnnotation: Omit<Annotation, 'id'> = {
      type: 'circle',
      x: 300,
      y: 300,
      width: 50, // radius
      height: 50, // radius
      color: '#0000FF',
    };

    await saveAnnotation(newAnnotation, nasaId, imageUrl);
    setLoading(false);
  };

  // Example: Update an annotation
  const handleUpdateAnnotation = async (annotationId: string) => {
    setLoading(true);
    
    const updates: Partial<Omit<Annotation, 'id'>> = {
      text: 'Updated annotation text',
      color: '#FFFF00',
      x: 150,
      y: 150,
    };

    await updateAnnotationInDB(annotationId, updates);
    setLoading(false);
  };

  // Example: Delete an annotation
  const handleDeleteAnnotation = async (annotationId: string) => {
    setLoading(true);
    await deleteAnnotationFromDB(annotationId);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Annotation CRUD Example</ThemedText>
      <ThemedText style={styles.subtitle}>NASA ID: {nasaId}</ThemedText>

      {/* Create Buttons */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Create Annotations</ThemedText>
        
        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={handleCreateTextAnnotation}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            ➕ Add Text Annotation
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={handleCreateRectangleAnnotation}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            ➕ Add Rectangle Annotation
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={handleCreateCircleAnnotation}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            ➕ Add Circle Annotation
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* List of Annotations */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>
          Current Annotations ({state.imageState.annotations.length})
        </ThemedText>

        <ScrollView style={styles.annotationList}>
          {state.imageState.annotations.length === 0 ? (
            <ThemedText style={styles.emptyText}>
              No annotations yet. Create one above!
            </ThemedText>
          ) : (
            state.imageState.annotations.map((annotation) => (
              <View key={annotation.id} style={styles.annotationItem}>
                <View style={styles.annotationInfo}>
                  <ThemedText style={styles.annotationType}>
                    {annotation.type.toUpperCase()}
                  </ThemedText>
                  <ThemedText style={styles.annotationDetails}>
                    Position: ({Math.round(annotation.x)}, {Math.round(annotation.y)})
                  </ThemedText>
                  {annotation.text && (
                    <ThemedText style={styles.annotationText}>
                      "{annotation.text}"
                    </ThemedText>
                  )}
                  <View
                    style={[
                      styles.colorIndicator,
                      { backgroundColor: annotation.color },
                    ]}
                  />
                </View>

                <View style={styles.annotationActions}>
                  <TouchableOpacity
                    style={[styles.button, styles.updateButton]}
                    onPress={() => handleUpdateAnnotation(annotation.id)}
                    disabled={loading}
                  >
                    <ThemedText style={styles.buttonText}>✏️ Edit</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.deleteButton]}
                    onPress={() => handleDeleteAnnotation(annotation.id)}
                    disabled={loading}
                  >
                    <ThemedText style={styles.buttonText}>🗑️ Delete</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ThemedText style={styles.loadingText}>Processing...</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  updateButton: {
    backgroundColor: '#F59E0B',
    flex: 1,
    marginRight: 4,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    flex: 1,
    marginLeft: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  annotationList: {
    maxHeight: 400,
  },
  annotationItem: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  annotationInfo: {
    marginBottom: 8,
  },
  annotationType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#60A5FA',
    marginBottom: 4,
  },
  annotationDetails: {
    fontSize: 12,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  annotationText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  colorIndicator: {
    width: 40,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  annotationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
