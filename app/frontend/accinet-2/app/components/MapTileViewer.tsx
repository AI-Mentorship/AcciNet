'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RouteDetails, RouteCondition } from '../lib/route';
import polyline from '@mapbox/polyline';
import RoutePopup from './RoutePopup';

interface MapTileViewerProps {
  initialZoom?: number;
  initialCenter?: [number, number]; // [lng, lat]
  tileServer?: string;
  routes?: RouteDetails[];
}

interface Tile {
  x: number;
  y: number;
  z: number;
  image?: HTMLImageElement;
  loading: boolean;
}

export default function MapTileViewer({
  initialZoom = 13,
  initialCenter = [-96.75, 32.99], // Dallas, TX
  tileServer = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  routes = [],
}: MapTileViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const routeCanvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRefs = useRef<Map<string, WebGLTexture>>(new Map());
  const tilesRef = useRef<Map<string, Tile>>(new Map());
  const scrollAccumulatorRef = useRef<number>(0);
  
  const [zoom, setZoom] = useState(initialZoom);
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<[number, number]>([0, 0]);
  const [panOffset, setPanOffset] = useState<[number, number]>([0, 0]);
  const initialDragPosRef = useRef<[number, number] | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<{ condition: RouteCondition; position: { x: number; y: number } } | null>(null);
  const routeSegmentsRef = useRef<Array<{ routeIndex: number; segmentIndex: number; coords: [number, number][]; condition?: RouteCondition }>>([]);

  const TILE_SIZE = 256;

  // Convert lat/lng to Web Mercator pixel coordinates
  const latLngToPixel = useCallback((lat: number, lng: number, zoom: number): [number, number] => {
    const scale = Math.pow(2, zoom) * TILE_SIZE;
    const x = (lng + 180) / 360 * scale;
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale;
    return [x, y];
  }, []);

  // Convert lat/lng to tile coordinates
  const latLngToTile = useCallback((lat: number, lng: number, zoom: number): [number, number] => {
    const [pixelX, pixelY] = latLngToPixel(lat, lng, zoom);
    const tileX = Math.floor(pixelX / TILE_SIZE);
    const tileY = Math.floor(pixelY / TILE_SIZE);
    return [tileX, tileY];
  }, [latLngToPixel]);

  // Load a tile image
  const loadTile = useCallback(async (x: number, y: number, z: number): Promise<HTMLImageElement | null> => {
    const tileKey = `${z}/${x}/${y}`;
    
    // Check if already loaded
    if (tilesRef.current.has(tileKey)) {
      const tile = tilesRef.current.get(tileKey)!;
      if (tile.image) return tile.image;
      if (tile.loading) return null; // Already loading
    }

    // Mark as loading
    tilesRef.current.set(tileKey, { x, y, z, loading: true });

    return new Promise((resolve) => {
      const servers = ['a', 'b', 'c'];
      const server = servers[Math.abs(x + y) % servers.length];
      const url = tileServer
        .replace('{s}', server)
        .replace('{z}', z.toString())
        .replace('{x}', x.toString())
        .replace('{y}', y.toString());

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const tile = tilesRef.current.get(tileKey);
        if (tile) {
          tile.image = img;
          tile.loading = false;
        }
        resolve(img);
      };
      
      img.onerror = () => {
        const tile = tilesRef.current.get(tileKey);
        if (tile) {
          tile.loading = false;
        }
        resolve(null);
      };
      
      img.src = url;
    });
  }, [tileServer]);

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    glRef.current = gl;

    // Vertex shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      uniform vec2 u_resolution;
      varying vec2 v_texCoord;

      void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        v_texCoord = a_texCoord;
      }
    `;

    // Fragment shader
    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_texture;
      varying vec2 v_texCoord;

      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord);
      }
    `;

    const createShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program error:', gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;

    // Cleanup
    return () => {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      textureRefs.current.forEach(texture => gl.deleteTexture(texture));
      textureRefs.current.clear();
    };
  }, []);

  // Create texture from image
  const createTexture = useCallback((gl: WebGLRenderingContext, image: HTMLImageElement): WebGLTexture | null => {
    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
  }, []);

  // Render tiles
  const render = useCallback(async () => {
    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;
    if (!gl || !program || !canvas) return;

    const [centerPixelX, centerPixelY] = latLngToPixel(center[1], center[0], zoom);
    const [centerTileX, centerTileY] = latLngToTile(center[1], center[0], zoom);

    // Calculate visible tiles
    const tilesToLoad: Array<[number, number, number]> = [];
    const tilesPerSide = Math.ceil(Math.max(canvas.width, canvas.height) / TILE_SIZE) + 2;

    for (let dy = -tilesPerSide; dy <= tilesPerSide; dy++) {
      for (let dx = -tilesPerSide; dx <= tilesPerSide; dx++) {
        const tileX = centerTileX + dx;
        const tileY = centerTileY + dy;
        const maxTile = Math.pow(2, zoom);
        if (tileX >= 0 && tileY >= 0 && tileX < maxTile && tileY < maxTile) {
          tilesToLoad.push([tileX, tileY, zoom]);
        }
      }
    }

    // Load tiles
    const loadPromises = tilesToLoad.map(([x, y, z]) => loadTile(x, y, z));
    await Promise.all(loadPromises);

    // Setup WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const textureLocation = gl.getUniformLocation(program, 'u_texture');

    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

    // Create buffers
    const positionBuffer = gl.createBuffer();
    const texCoordBuffer = gl.createBuffer();

    // Render each tile
    for (const [tileX, tileY, tileZ] of tilesToLoad) {
      const tileKey = `${tileZ}/${tileX}/${tileY}`;
      const tile = tilesRef.current.get(tileKey);
      if (!tile || !tile.image) continue;

      // Calculate tile pixel position
      const tilePixelX = tileX * TILE_SIZE;
      const tilePixelY = tileY * TILE_SIZE;

      // Calculate screen position
      const screenX = (tilePixelX - centerPixelX) + canvas.width / 2 + panOffset[0];
      const screenY = (tilePixelY - centerPixelY) + canvas.height / 2 + panOffset[1];

      // Check if tile is visible
      if (screenX + TILE_SIZE < 0 || screenX > canvas.width ||
          screenY + TILE_SIZE < 0 || screenY > canvas.height) {
        continue;
      }

      // Create or get texture
      let texture = textureRefs.current.get(tileKey);
      if (!texture) {
        const newTexture = createTexture(gl, tile.image);
        if (newTexture) {
          textureRefs.current.set(tileKey, newTexture);
          texture = newTexture;
        } else {
          continue; // Skip if texture creation failed
        }
      }

      // Set up quad
      const positions = new Float32Array([
        screenX, screenY,
        screenX + TILE_SIZE, screenY,
        screenX, screenY + TILE_SIZE,
        screenX, screenY + TILE_SIZE,
        screenX + TILE_SIZE, screenY,
        screenX + TILE_SIZE, screenY + TILE_SIZE,
      ]);

      const texCoords = new Float32Array([
        0, 0,
        1, 0,
        0, 1,
        0, 1,
        1, 0,
        1, 1,
      ]);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(textureLocation, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Cleanup buffers
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    if (texCoordBuffer) gl.deleteBuffer(texCoordBuffer);
  }, [zoom, center, panOffset, latLngToPixel, latLngToTile, loadTile, createTexture]);

  // Render routes on 2D canvas overlay
  const renderRoutes = useCallback(() => {
    const routeCanvas = routeCanvasRef.current;
    const canvas = canvasRef.current;
    if (!routeCanvas || !canvas || routes.length === 0) {
      if (routeCanvas) {
        const ctx = routeCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, routeCanvas.width, routeCanvas.height);
        }
      }
      routeSegmentsRef.current = [];
      return;
    }

    const ctx = routeCanvas.getContext('2d');
    if (!ctx) return;

    // Match route canvas size to main canvas
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    routeCanvas.width = rect.width * dpr;
    routeCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    routeCanvas.style.width = `${rect.width}px`;
    routeCanvas.style.height = `${rect.height}px`;

    // Clear previous routes
    ctx.clearRect(0, 0, routeCanvas.width / dpr, routeCanvas.height / dpr);

    const [centerPixelX, centerPixelY] = latLngToPixel(center[1], center[0], zoom);
    routeSegmentsRef.current = []; // Reset segments

    // Helper function to interpolate color from green (0.0) to red (1.0)
    const getGradientColor = (value: number): string => {
      // Clamp value between 0 and 1
      const clamped = Math.max(0, Math.min(1, value));
      
      // Interpolate from green (0, 255, 0) to red (255, 0, 0)
      const r = Math.round(clamped * 255);
      const g = Math.round((1 - clamped) * 255);
      const b = 0;
      
      return `rgb(${r}, ${g}, ${b})`;
    };

    routes.forEach((route, routeIndex) => {
      try {
        // Decode polyline
        const coords = polyline.decode(route.polyline) as [number, number][];
        if (coords.length === 0) return;

        // Apply small offset for visual separation
        const offset = (routeIndex - 1) * 0.0003;
        const latlngs = coords.map(([lat, lng]) => [lat + offset, lng] as [number, number]);

        // Get values for each coordinate (default to evenly distributed if not provided)
        const values = route.values || latlngs.map((_, i) => i / (latlngs.length - 1 || 1));
        const conditions = route.conditions || [];

        // Convert to screen coordinates
        const screenCoords: [number, number][] = latlngs.map(([lat, lng]) => {
          const [pixelX, pixelY] = latLngToPixel(lat, lng, zoom);
          const screenX = (pixelX - centerPixelX) + canvas.width / (2 * dpr) + panOffset[0] / dpr;
          const screenY = (pixelY - centerPixelY) + canvas.height / (2 * dpr) + panOffset[1] / dpr;
          return [screenX, screenY];
        });

        // Draw polyline with gradient and 3D effects
        const baseLineWidth = routeIndex === 0 ? 8 : 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (routeIndex > 0) {
          // Dashed line for alternative routes
          ctx.setLineDash([6, 6]);
        } else {
          ctx.setLineDash([]);
        }

        // Draw route segment by segment with gradient colors and 3D effects
        for (let i = 0; i < screenCoords.length - 1; i++) {
          const startValue = values[i];
          const endValue = values[i + 1];
          const condition = conditions[i] || conditions[Math.floor(i / 2)]; // Use nearest condition
          
          // Store segment data for click detection
          routeSegmentsRef.current.push({
            routeIndex,
            segmentIndex: i,
            coords: [screenCoords[i], screenCoords[i + 1]],
            condition,
          });
          
          // Create gradient for this segment
          const gradient = ctx.createLinearGradient(
            screenCoords[i][0],
            screenCoords[i][1],
            screenCoords[i + 1][0],
            screenCoords[i + 1][1]
          );
          
          gradient.addColorStop(0, getGradientColor(startValue));
          gradient.addColorStop(1, getGradientColor(endValue));
          
          // Draw shadow for 3D effect
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          // Draw segment with shadow
          ctx.beginPath();
          ctx.moveTo(screenCoords[i][0], screenCoords[i][1]);
          ctx.lineTo(screenCoords[i + 1][0], screenCoords[i + 1][1]);
          ctx.lineWidth = baseLineWidth + 2;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.stroke();
          
          // Draw main segment
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.beginPath();
          ctx.moveTo(screenCoords[i][0], screenCoords[i][1]);
          ctx.lineTo(screenCoords[i + 1][0], screenCoords[i + 1][1]);
          ctx.lineWidth = baseLineWidth;
          ctx.strokeStyle = gradient;
          ctx.globalAlpha = 0.95;
          ctx.stroke();
        }
        
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
      } catch (error) {
        console.error(`Error rendering route ${routeIndex + 1}:`, error);
      }
    });
  }, [routes, zoom, center, panOffset, latLngToPixel]);

  // Setup canvas and handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const routeCanvas = routeCanvasRef.current;
    if (!canvas) return;

    const setCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Also resize route canvas
      if (routeCanvas) {
        routeCanvas.width = rect.width * dpr;
        routeCanvas.height = rect.height * dpr;
        routeCanvas.style.width = `${rect.width}px`;
        routeCanvas.style.height = `${rect.height}px`;
      }
    };

    setCanvasSize();
    render();
    renderRoutes();

    const resizeObserver = new ResizeObserver(() => {
      setCanvasSize();
      requestAnimationFrame(() => {
        render();
        renderRoutes();
      });
    });
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, [render, renderRoutes]);

  // Re-render when zoom or center changes
  useEffect(() => {
    requestAnimationFrame(() => {
      render();
      renderRoutes();
    });
  }, [zoom, center, render, renderRoutes]);

  // Re-render routes when they change
  useEffect(() => {
    renderRoutes();
  }, [routes, renderRoutes]);

  // Re-render during pan (smooth updates)
  useEffect(() => {
    if (isDragging) {
      requestAnimationFrame(() => {
        render();
        renderRoutes();
      });
    }
  }, [panOffset, isDragging, render, renderRoutes]);

  // Add document-level mouse handlers for smooth dragging even when mouse leaves canvas
  useEffect(() => {
    if (!isDragging) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (!initialDragPosRef.current) return;
      
      // Calculate total offset from initial drag position
      const dx = e.clientX - initialDragPosRef.current[0];
      const dy = e.clientY - initialDragPosRef.current[1];
      setPanOffset([dx, dy]);
    };

    const handleDocumentMouseUp = () => {
      // Get current pan offset from state via closure
      setPanOffset(currentOffset => {
        if (currentOffset[0] !== 0 || currentOffset[1] !== 0) {
          // Convert pan offset to lat/lng delta
          const scale = Math.pow(2, zoom) * TILE_SIZE;
          const lngDelta = (currentOffset[0] / scale) * 360;
          
          // For latitude, we need to account for the Mercator projection
          const latRad = center[1] * Math.PI / 180;
          const latScale = Math.cos(latRad);
          const latDelta = -(currentOffset[1] / scale) * 360 * latScale;
          
          setCenter(prev => [prev[0] - lngDelta, prev[1] - latDelta]);
        }
        setIsDragging(false);
        initialDragPosRef.current = null;
        return [0, 0];
      });
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isDragging, zoom, center]);

  // Prevent all zoom events within the map container from affecting the page
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Prevent wheel events from causing page zoom
    // Use capture phase to prevent default early, but don't stop propagation
    // so React handlers can still fire and handle the zoom
    const handleWheelCapture = (e: WheelEvent) => {
      const target = e.target as Node;
      if (container.contains(target)) {
        e.preventDefault();
        // Don't stop propagation - let React handlers still work
      }
    };

    // Prevent touch events (pinch zoom) from affecting the page
    const handleTouchCapture = (e: TouchEvent) => {
      const target = e.target as Node;
      if (container.contains(target) && e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Prevent gesture events (some browsers use these for pinch zoom)
    const handleGestureCapture = (e: Event) => {
      const target = e.target as Node;
      if (container.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Also add listeners to document in bubble phase as a safety net
    const handleDocumentWheel = (e: WheelEvent) => {
      const target = e.target as Node;
      if (container.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    // Add listeners to container in capture phase to prevent default early
    container.addEventListener('wheel', handleWheelCapture, { passive: false, capture: true });
    container.addEventListener('touchstart', handleTouchCapture, { passive: false, capture: true });
    container.addEventListener('touchmove', handleTouchCapture, { passive: false, capture: true });
    container.addEventListener('touchend', handleTouchCapture, { passive: false, capture: true });
    container.addEventListener('gesturestart', handleGestureCapture, { passive: false, capture: true });
    container.addEventListener('gesturechange', handleGestureCapture, { passive: false, capture: true });
    container.addEventListener('gestureend', handleGestureCapture, { passive: false, capture: true });
    
    // Also add to document in bubble phase as backup
    document.addEventListener('wheel', handleDocumentWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheelCapture, { capture: true } as EventListenerOptions);
      container.removeEventListener('touchstart', handleTouchCapture, { capture: true } as EventListenerOptions);
      container.removeEventListener('touchmove', handleTouchCapture, { capture: true } as EventListenerOptions);
      container.removeEventListener('touchend', handleTouchCapture, { capture: true } as EventListenerOptions);
      container.removeEventListener('gesturestart', handleGestureCapture, { capture: true } as EventListenerOptions);
      container.removeEventListener('gesturechange', handleGestureCapture, { capture: true } as EventListenerOptions);
      container.removeEventListener('gestureend', handleGestureCapture, { capture: true } as EventListenerOptions);
      document.removeEventListener('wheel', handleDocumentWheel);
    };
  }, []);

  // Mouse/touch handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't start dragging if clicking on route canvas
    if ((e.target as HTMLElement).tagName === 'CANVAS' && (e.target as HTMLCanvasElement) !== canvasRef.current) {
      return;
    }
    setIsDragging(true);
    const startPos: [number, number] = [e.clientX, e.clientY];
    setDragStart(startPos);
    initialDragPosRef.current = startPos;
    setPanOffset([0, 0]); // Reset pan offset when starting new drag
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !initialDragPosRef.current) return;
    
    // Calculate total offset from initial drag position for smoother, more responsive dragging
    const dx = e.clientX - initialDragPosRef.current[0];
    const dy = e.clientY - initialDragPosRef.current[1];
    setPanOffset([dx, dy]);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && (panOffset[0] !== 0 || panOffset[1] !== 0)) {
      // Convert pan offset to lat/lng delta
      const scale = Math.pow(2, zoom) * TILE_SIZE;
      const lngDelta = (panOffset[0] / scale) * 360;
      
      // For latitude, we need to account for the Mercator projection
      const latRad = center[1] * Math.PI / 180;
      const latScale = Math.cos(latRad);
      const latDelta = -(panOffset[1] / scale) * 360 * latScale;
      
      setCenter(prev => [prev[0] - lngDelta, prev[1] - latDelta]);
      setPanOffset([0, 0]);
    }
    setIsDragging(false);
    initialDragPosRef.current = null;
  }, [isDragging, panOffset, zoom, center]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Accumulate scroll delta to make zoom less sensitive
    // Only change zoom when accumulated delta exceeds threshold
    const sensitivity = 200; // Higher value = less sensitive (need more scroll to zoom)
    scrollAccumulatorRef.current += e.deltaY;
    
    // Check if we've accumulated enough scroll to change zoom level
    if (Math.abs(scrollAccumulatorRef.current) >= sensitivity) {
      const delta = scrollAccumulatorRef.current > 0 ? -1 : 1;
      const newZoom = Math.max(0, Math.min(19, zoom + delta));
      setZoom(newZoom);
      setPanOffset([0, 0]);
      // Reset accumulator, keeping any remainder
      scrollAccumulatorRef.current = scrollAccumulatorRef.current % sensitivity;
    }
  }, [zoom]);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(19, zoom + 1);
    setZoom(newZoom);
    setPanOffset([0, 0]);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(0, zoom - 1);
    setZoom(newZoom);
    setPanOffset([0, 0]);
  }, [zoom]);

  // Prevent pinch zoom and touch gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  // Calculate distance from point to line segment
  const pointToLineDistance = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx: number, yy: number;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Track if mouse moved during mousedown (to distinguish click from drag)
  const mouseDownPosRef = useRef<[number, number] | null>(null);

  // Track mouse down position for route canvas
  const handleRouteCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    mouseDownPosRef.current = [e.clientX, e.clientY];
  }, []);

  // Handle click on route canvas
  const handleRouteCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Check if this was a drag (mouse moved more than 5px)
    if (mouseDownPosRef.current) {
      const dx = Math.abs(e.clientX - mouseDownPosRef.current[0]);
      const dy = Math.abs(e.clientY - mouseDownPosRef.current[1]);
      if (dx > 5 || dy > 5) {
        mouseDownPosRef.current = null;
        return; // This was a drag, not a click
      }
    }
    mouseDownPosRef.current = null;

    const routeCanvas = routeCanvasRef.current;
    if (!routeCanvas || routeSegmentsRef.current.length === 0) return;

    const rect = routeCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find the closest segment
    let minDistance = Infinity;
    let closestSegment: typeof routeSegmentsRef.current[0] | null = null;

    for (const segment of routeSegmentsRef.current) {
      const [start, end] = segment.coords;
      const distance = pointToLineDistance(x, y, start[0], start[1], end[0], end[1]);
      
      if (distance < minDistance && distance < 20) { // 20px click tolerance
        minDistance = distance;
        closestSegment = segment;
      }
    }

    if (closestSegment && closestSegment.condition) {
      setSelectedSegment({
        condition: closestSegment.condition,
        position: { x: e.clientX, y: e.clientY },
      });
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full touch-none"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      <canvas
        ref={routeCanvasRef}
        className="absolute top-0 left-0 w-full h-full"
        style={{ 
          touchAction: 'none',
          pointerEvents: routes.length > 0 ? 'auto' : 'none',
          cursor: routes.length > 0 ? 'pointer' : 'default'
        }}
        onClick={handleRouteCanvasClick}
        onMouseDown={handleRouteCanvasMouseDown}
      />
      {selectedSegment && (
        <RoutePopup
          condition={selectedSegment.condition}
          position={selectedSegment.position}
          onClose={() => setSelectedSegment(null)}
        />
      )}
      <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/90 px-3 py-2 rounded shadow-lg text-sm font-mono">
        <div>Zoom: {zoom}</div>
        <div>Lat: {center[1].toFixed(4)}, Lng: {center[0].toFixed(4)}</div>
      </div>
      <div className="absolute top-4 right-4 flex flex-col bg-white/90 dark:bg-black/90 rounded shadow-lg overflow-hidden">
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 19}
          className="px-4 py-2 text-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-b border-gray-300 dark:border-gray-700"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0}
          className="px-4 py-2 text-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
    </div>
  );
}
