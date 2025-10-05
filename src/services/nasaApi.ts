import axios from 'axios';
import { NASASearchResponse, NASAImageItem } from '../types/nasa';

const NASA_API_BASE = 'https://images-api.nasa.gov';

// Cache for API responses to avoid rate limiting
const cache = new Map<string, NASASearchResponse>();

export class NASAApiService {
  /**
   * Search for images using NASA's Images API
   */
  static async searchImages(params: { q: string; media_type: string; page: number }): Promise<NASASearchResponse> {
    const cacheKey = `${params.q}-${params.page}`;
    
    // Check cache first
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }

    try {
      const response = await axios.get<NASASearchResponse>(`${NASA_API_BASE}/search`, {
        params: {
          ...params,
          page_size: 20
        },
        timeout: 10000 // 10 second timeout
      });

      // Cache the response for 5 minutes
      cache.set(cacheKey, response.data);
      setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);

      return response.data;
    } catch (error) {
      console.error('NASA API search error:', error);
      
      // Fallback to demo images for development/testing
      const demoItems = this.getDemoImages(params.q);
      if (demoItems.length > 0) {
        return { collection: { items: demoItems, metadata: { total_hits: demoItems.length }, links: [], href: '', version: '' } };
      }
      
      throw new Error('Failed to search NASA images. Please try again.');
    }
  }

  /**
   * Get image metadata by NASA ID
   */
  static async getImageMetadata(nasaId: string): Promise<NASAImageItem | null> {
    try {
      const response = await axios.get<NASAImageItem>(`${NASA_API_BASE}/asset/${nasaId}`);
      return response.data;
    } catch (error) {
      console.error('NASA API metadata error:', error);
      return null;
    }
  }

  /**
   * Get the highest resolution image URL from an image item
   */
  static getHighResImageUrl(imageItem: NASAImageItem): string | null {
    if (!imageItem.links || imageItem.links.length === 0) {
      return null;
    }

    // Look for the highest resolution image
    const imageLinks = imageItem.links.filter(link => 
      link.rel === 'preview' || link.render === 'image'
    );

    if (imageLinks.length === 0) {
      return null;
    }

    // Return the first available image URL
    return imageLinks[0].href;
  }

  /**
   * Get image thumbnail URL
   */
  static getThumbnailUrl(imageItem: NASAImageItem): string | null {
    if (!imageItem.links || imageItem.links.length === 0) {
      return null;
    }

    const thumbnailLink = imageItem.links.find(link => 
      link.rel === 'preview' && link.href.includes('thumb')
    );

    return thumbnailLink?.href || this.getHighResImageUrl(imageItem);
  }

  /**
   * Demo images for fallback
   */
  static getDemoImages(query: string): NASAImageItem[] {
    const demoImages = [
      {
        data: [{
          center: 'JPL',
          date_created: '2020-01-01T00:00:00Z',
          description: 'Mars Rover Curiosity exploring the Martian surface',
          keywords: ['Mars', 'rover', 'curiosity'],
          media_type: 'image',
          nasa_id: 'PIA03632',
          title: 'Mars Rover Curiosity'
        }],
        links: [{
          href: 'https://images-assets.nasa.gov/image/PIA03632/PIA03632~orig.jpg',
          rel: 'preview'
        }]
      },
      {
        data: [{
          center: 'STScI',
          date_created: '1996-01-01T00:00:00Z',
          description: 'Hubble Deep Field showing thousands of galaxies',
          keywords: ['Hubble', 'galaxy', 'deep field'],
          media_type: 'image',
          nasa_id: 'STScI-1996-01a',
          title: 'Hubble Deep Field'
        }],
        links: [{
          href: 'https://images-assets.nasa.gov/image/STScI-1996-01a/STScI-1996-01a~orig.jpg',
          rel: 'preview'
        }]
      }
    ];

    return demoImages.filter(img => 
      img.data[0].title.toLowerCase().includes(query.toLowerCase()) ||
      img.data[0].description.toLowerCase().includes(query.toLowerCase()) ||
      img.data[0].keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase()))
    );
  }

  /**
   * Clear API cache
   */
  static clearCache(): void {
    cache.clear();
  }

  /**
   * Get cache size for debugging
   */
  static getCacheSize(): number {
    return cache.size;
  }
}
