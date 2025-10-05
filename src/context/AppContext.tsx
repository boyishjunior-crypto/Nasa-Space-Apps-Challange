import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { AppState, NASAImageItem, Annotation, ImageState } from '../types/nasa';
import { AnnotationServiceV2 } from '../services/annotationServiceV2';
import { ImageService } from '../services/imageService';
import { SyncService } from '../services/syncService';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from './AuthContext';

// Action types
type AppAction =
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: NASAImageItem[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_IMAGE'; payload: NASAImageItem | null }
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'UPDATE_ANNOTATION'; payload: Annotation }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'CLEAR_ANNOTATIONS' }
  | { type: 'SET_ANNOTATIONS'; payload: Annotation[] }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_PAN'; payload: { x: number; y: number } }
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_PENDING_SYNC'; payload: number };

// Initial state
const initialState: AppState = {
  searchQuery: '',
  searchResults: [],
  isLoading: false,
  error: null,
  isOnline: true,
  pendingSync: 0,
  imageState: {
    currentImage: null,
    annotations: [],
    zoomLevel: 1,
    panX: 0,
    panY: 0,
  },
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_CURRENT_IMAGE':
      return {
        ...state,
        imageState: {
          ...state.imageState,
          currentImage: action.payload,
        },
      };
    
    case 'ADD_ANNOTATION':
      return {
        ...state,
        imageState: {
          ...state.imageState,
          annotations: [...state.imageState.annotations, action.payload],
        },
      };
    
    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        imageState: {
          ...state.imageState,
          annotations: state.imageState.annotations.map(annotation =>
            annotation.id === action.payload.id ? action.payload : annotation
          ),
        },
      };
    
    case 'DELETE_ANNOTATION':
      return {
        ...state,
        imageState: {
          ...state.imageState,
          annotations: state.imageState.annotations.filter(
            annotation => annotation.id !== action.payload
          ),
        },
      };
    
    case 'CLEAR_ANNOTATIONS':
      return {
        ...state,
        imageState: {
          ...state.imageState,
          annotations: [],
        },
      };
    
    case 'SET_ANNOTATIONS':
      return {
        ...state,
        imageState: {
          ...state.imageState,
          annotations: action.payload,
        },
      };
    
    case 'SET_ZOOM':
      return {
        ...state,
        imageState: {
          ...state.imageState,
          zoomLevel: action.payload,
        },
      };
    
    case 'SET_PAN':
      return {
        ...state,
        imageState: {
          ...state.imageState,
          panX: action.payload.x,
          panY: action.payload.y,
        },
      };

    case 'SET_ONLINE':
      return {
        ...state,
        isOnline: action.payload,
      };

    case 'SET_PENDING_SYNC':
      return {
        ...state,
        pendingSync: action.payload,
      };

    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  loadAnnotations: (nasaId: string) => Promise<void>;
  saveAnnotation: (annotation: Omit<Annotation, 'id'>, nasaId: string, imageUrl?: string) => Promise<void>;
  updateAnnotationInDB: (annotationId: string, updates: Partial<Omit<Annotation, 'id'>>) => Promise<void>;
  deleteAnnotationFromDB: (annotationId: string) => Promise<void>;
  syncNow: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize sync service and monitor network
  useEffect(() => {
    SyncService.initialize();

    const unsubscribe = NetInfo.addEventListener(state => {
      dispatch({ type: 'SET_ONLINE', payload: state.isConnected ?? false });
    });

    const interval = setInterval(async () => {
      const count = await SyncService.getPendingSyncCount();
      dispatch({ type: 'SET_PENDING_SYNC', payload: count });
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Load annotations from Supabase for a specific NASA image
  const loadAnnotations = async (nasaId: string) => {
    try {
      const image = await ImageService.getImageByNasaId(nasaId);
      if (!image) return;

      const annotations = await AnnotationServiceV2.getAnnotationsByImageId(image.id);
      // Convert AnnotationV2 to Annotation format for compatibility
      const convertedAnnotations = annotations.map(ann => ({
        id: ann.id,
        type: ann.annotation_type as any,
        x: ann.bbox?.x || 0,
        y: ann.bbox?.y || 0,
        width: ann.bbox?.w,
        height: ann.bbox?.h,
        text: ann.text,
        color: ann.color,
        fontSize: ann.font_size,
        points: ann.points,
      }));
      dispatch({ type: 'SET_ANNOTATIONS', payload: convertedAnnotations });
    } catch (error) {
      console.error('Error loading annotations:', error);
    }
  };

  // Save a new annotation to Supabase
  const saveAnnotation = async (
    annotation: Omit<Annotation, 'id'>,
    nasaId: string,
    imageUrl?: string
  ) => {
    try {
      const image = await ImageService.getOrCreateImage({ data: [{ nasa_id: nasaId }], links: [{ href: imageUrl || '' }] } as NASAImageItem);

      await AnnotationServiceV2.createAnnotation(
        { data: [{ nasa_id: nasaId }], links: [{ href: imageUrl || '' }] } as NASAImageItem,
        {
          annotation_type: annotation.type,
          text: annotation.text,
          color: annotation.color,
          bbox: { x: annotation.x, y: annotation.y, w: annotation.width || 0, h: annotation.height || 0 },
        }
      );

      // Reload annotations after saving
      await loadAnnotations(nasaId);
    } catch (error) {
      console.error('Error saving annotation:', error);
    }
  };

  // Update an annotation in Supabase
  const updateAnnotationInDB = async (
    annotationId: string,
    updates: Partial<Omit<Annotation, 'id'>>
  ) => {
    try {
      await AnnotationServiceV2.updateAnnotation(annotationId, {
        annotation_type: updates.type,
        text: updates.text,
        color: updates.color,
        font_size: updates.fontSize,
        bbox: updates.width || updates.height ? { x: updates.x || 0, y: updates.y || 0, w: updates.width || 0, h: updates.height || 0 } : undefined,
      });

      // Reload annotations after updating
      const nasaId = state.imageState.currentImage?.data[0].nasa_id;
      if (nasaId) await loadAnnotations(nasaId);
    } catch (error) {
      console.error('Error updating annotation:', error);
    }
  };

  // Delete an annotation from Supabase
  const deleteAnnotationFromDB = async (annotationId: string) => {
    try {
      await AnnotationServiceV2.deleteAnnotation(annotationId);

      // Reload annotations after deleting
      const nasaId = state.imageState.currentImage?.data[0].nasa_id;
      if (nasaId) await loadAnnotations(nasaId);
    } catch (error) {
      console.error('Error deleting annotation:', error);
    }
  };

  const syncNow = async () => {
    await SyncService.syncNow();
    const count = await SyncService.getPendingSyncCount();
    dispatch({ type: 'SET_PENDING_SYNC', payload: count });
  };

  const value = {
    state,
    dispatch,
    loadAnnotations,
    saveAnnotation,
    updateAnnotationInDB,
    deleteAnnotationFromDB,
    syncNow,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Action creators for easier dispatching
export const appActions = {
  setSearchQuery: (query: string): AppAction => ({
    type: 'SET_SEARCH_QUERY',
    payload: query,
  }),
  
  setSearchResults: (results: NASAImageItem[]): AppAction => ({
    type: 'SET_SEARCH_RESULTS',
    payload: results,
  }),
  
  setLoading: (loading: boolean): AppAction => ({
    type: 'SET_LOADING',
    payload: loading,
  }),
  
  setError: (error: string | null): AppAction => ({
    type: 'SET_ERROR',
    payload: error,
  }),
  
  setCurrentImage: (image: NASAImageItem | null): AppAction => ({
    type: 'SET_CURRENT_IMAGE',
    payload: image,
  }),
  
  addAnnotation: (annotation: Annotation): AppAction => ({
    type: 'ADD_ANNOTATION',
    payload: annotation,
  }),
  
  updateAnnotation: (annotation: Annotation): AppAction => ({
    type: 'UPDATE_ANNOTATION',
    payload: annotation,
  }),
  
  deleteAnnotation: (id: string): AppAction => ({
    type: 'DELETE_ANNOTATION',
    payload: id,
  }),
  
  clearAnnotations: (): AppAction => ({
    type: 'CLEAR_ANNOTATIONS',
  }),
  
  setAnnotations: (annotations: Annotation[]): AppAction => ({
    type: 'SET_ANNOTATIONS',
    payload: annotations,
  }),
  
  setZoom: (zoom: number): AppAction => ({
    type: 'SET_ZOOM',
    payload: zoom,
  }),
  
  setPan: (x: number, y: number): AppAction => ({
    type: 'SET_PAN',
    payload: { x, y },
  }),
};
