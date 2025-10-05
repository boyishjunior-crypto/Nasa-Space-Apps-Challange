// ============================================================================
// Deep Zoom Viewer - OpenSeadragon WebView Integration
// ============================================================================
// Provides deep-zoom, pan, and annotation drawing capabilities
// Uses OpenSeadragon via WebView with postMessage bridge
// ============================================================================

import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface DeepZoomViewerProps {
  imageUrl: string;
  annotations?: any[];
  mlProposals?: any[];
  onSelection?: (bbox: { x: number; y: number; w: number; h: number }) => void;
  onAnnotationClick?: (annotationId: string) => void;
}

export function DeepZoomViewer({
  imageUrl,
  annotations = [],
  mlProposals = [],
  onSelection,
  onAnnotationClick,
}: DeepZoomViewerProps) {
  const webViewRef = useRef<WebView>(null);

  // Send data to WebView when props change
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'updateAnnotations',
        annotations,
        mlProposals,
      }));
    }
  }, [annotations, mlProposals]);

  // Handle messages from WebView
  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case 'selection':
          onSelection?.(message.bbox);
          break;
        case 'annotationClick':
          onAnnotationClick?.(message.annotationId);
          break;
        case 'ready':
          console.log('OpenSeadragon viewer ready');
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // OpenSeadragon HTML with annotation overlay
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://cdn.jsdelivr.net/npm/openseadragon@4.1.0/build/openseadragon/openseadragon.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }
    #viewer {
      width: 100%;
      height: 100%;
    }
    .annotation-overlay {
      position: absolute;
      border: 2px solid #3B82F6;
      background: rgba(59, 130, 246, 0.2);
      pointer-events: auto;
      cursor: pointer;
    }
    .annotation-overlay:hover {
      border-color: #60A5FA;
      background: rgba(96, 165, 250, 0.3);
    }
    .ml-proposal {
      border: 2px dashed #F59E0B;
      background: rgba(245, 158, 11, 0.15);
    }
    .annotation-label {
      position: absolute;
      top: -24px;
      left: 0;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="viewer"></div>
  
  <script>
    let viewer;
    let annotations = [];
    let mlProposals = [];
    let isDrawing = false;
    let drawStart = null;
    let drawRect = null;

    // Initialize OpenSeadragon
    viewer = OpenSeadragon({
      id: "viewer",
      prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@4.1.0/build/openseadragon/images/",
      tileSources: {
        type: 'image',
        url: '${imageUrl}'
      },
      showNavigationControl: true,
      showNavigator: true,
      navigatorPosition: 'BOTTOM_RIGHT',
      zoomInButton: 'zoom-in',
      zoomOutButton: 'zoom-out',
      homeButton: 'home',
      fullPageButton: 'full-page',
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
      },
      gestureSettingsTouch: {
        pinchToZoom: true,
        flickEnabled: true,
      },
    });

    // Notify React Native that viewer is ready
    viewer.addHandler('open', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    });

    // Drawing mode for annotations
    let drawingMode = false;

    function enableDrawingMode() {
      drawingMode = true;
      viewer.setMouseNavEnabled(false);
    }

    function disableDrawingMode() {
      drawingMode = false;
      viewer.setMouseNavEnabled(true);
    }

    // Handle mouse/touch events for drawing
    new OpenSeadragon.MouseTracker({
      element: viewer.canvas,
      pressHandler: function(event) {
        if (!drawingMode) return;
        
        const viewportPoint = viewer.viewport.pointFromPixel(event.position);
        drawStart = viewportPoint;
        isDrawing = true;
        
        // Create draw rectangle
        drawRect = document.createElement('div');
        drawRect.className = 'annotation-overlay';
        drawRect.style.position = 'absolute';
        viewer.canvas.appendChild(drawRect);
      },
      dragHandler: function(event) {
        if (!isDrawing || !drawStart || !drawRect) return;
        
        const viewportPoint = viewer.viewport.pointFromPixel(event.position);
        const pixelStart = viewer.viewport.pixelFromPoint(drawStart);
        const pixelEnd = viewer.viewport.pixelFromPoint(viewportPoint);
        
        const x = Math.min(pixelStart.x, pixelEnd.x);
        const y = Math.min(pixelStart.y, pixelEnd.y);
        const w = Math.abs(pixelEnd.x - pixelStart.x);
        const h = Math.abs(pixelEnd.y - pixelStart.y);
        
        drawRect.style.left = x + 'px';
        drawRect.style.top = y + 'px';
        drawRect.style.width = w + 'px';
        drawRect.style.height = h + 'px';
      },
      releaseHandler: function(event) {
        if (!isDrawing || !drawStart || !drawRect) return;
        
        const viewportPoint = viewer.viewport.pointFromPixel(event.position);
        
        // Calculate normalized bbox (0-1 range)
        const bbox = {
          x: Math.min(drawStart.x, viewportPoint.x),
          y: Math.min(drawStart.y, viewportPoint.y),
          w: Math.abs(viewportPoint.x - drawStart.x),
          h: Math.abs(viewportPoint.y - drawStart.y),
        };
        
        // Send to React Native
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'selection',
          bbox,
        }));
        
        // Cleanup
        drawRect.remove();
        drawRect = null;
        drawStart = null;
        isDrawing = false;
        disableDrawingMode();
      },
    });

    // Render annotations overlay
    function renderAnnotations() {
      // Clear existing overlays
      document.querySelectorAll('.annotation-overlay').forEach(el => el.remove());
      
      // Render user annotations
      annotations.forEach(annotation => {
        if (!annotation.bbox) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'annotation-overlay';
        overlay.dataset.id = annotation.id;
        
        // Add label
        if (annotation.label) {
          const label = document.createElement('div');
          label.className = 'annotation-label';
          label.textContent = annotation.label;
          overlay.appendChild(label);
        }
        
        // Position overlay
        const rect = viewer.viewport.viewportToViewerElementRectangle(
          new OpenSeadragon.Rect(
            annotation.bbox.x,
            annotation.bbox.y,
            annotation.bbox.w,
            annotation.bbox.h
          )
        );
        
        overlay.style.left = rect.x + 'px';
        overlay.style.top = rect.y + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        
        overlay.onclick = () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'annotationClick',
            annotationId: annotation.id,
          }));
        };
        
        viewer.canvas.appendChild(overlay);
      });
      
      // Render ML proposals
      mlProposals.forEach(proposal => {
        if (!proposal.bbox) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'annotation-overlay ml-proposal';
        
        const rect = viewer.viewport.viewportToViewerElementRectangle(
          new OpenSeadragon.Rect(
            proposal.bbox.x,
            proposal.bbox.y,
            proposal.bbox.w,
            proposal.bbox.h
          )
        );
        
        overlay.style.left = rect.x + 'px';
        overlay.style.top = rect.y + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        
        // Add score label
        const label = document.createElement('div');
        label.className = 'annotation-label';
        label.textContent = \`ML: \${(proposal.score * 100).toFixed(0)}%\`;
        overlay.appendChild(label);
        
        viewer.canvas.appendChild(overlay);
      });
    }

    // Update overlays on zoom/pan
    viewer.addHandler('animation', renderAnnotations);
    viewer.addHandler('resize', renderAnnotations);

    // Listen for messages from React Native
    window.addEventListener('message', function(event) {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'updateAnnotations') {
          annotations = message.annotations || [];
          mlProposals = message.mlProposals || [];
          renderAnnotations();
        } else if (message.type === 'enableDrawing') {
          enableDrawingMode();
        } else if (message.type === 'disableDrawing') {
          disableDrawingMode();
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
