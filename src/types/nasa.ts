// NASA Images API Types

export interface NASAImageItem {
  data: Array<{
    center: string;
    date_created: string;
    description: string;
    keywords: string[];
    media_type: string;
    nasa_id: string;
    title: string;
  }>;
  links: Array<{
    href: string;
    rel: string;
    render?: string;
  }>;
}

export interface NASASearchResponse {
  collection: {
    href: string;
    items: NASAImageItem[];
    links: Array<{
      href: string;
      rel: string;
      prompt: string;
    }>;
    metadata: {
      total_hits: number;
    };
    version: string;
  };
}

export interface Annotation {
  id: string;
  type: 'text' | 'rectangle' | 'circle' | 'freehand';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  fontSize?: number;
  points?: Array<{ x: number; y: number }>;
}

export interface ImageState {
  currentImage: NASAImageItem | null;
  annotations: Annotation[];
  zoomLevel: number;
  panX: number;
  panY: number;
}

export interface AppState {
  searchQuery: string;
  searchResults: NASAImageItem[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  pendingSync: number;
  imageState: ImageState;
}




