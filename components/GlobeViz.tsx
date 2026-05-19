import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import * as THREE from 'three';
import {
  detectDeviceCapability,
  getOptimalTextureURLs,
  getOptimalRendererSettings,
  optimizeScene
} from '../utils/texture-optimizer';
import { useTheme } from '../contexts/ThemeContext';

// Sun texture - NASA Solar Dynamics Observatory image (public domain)
const SUN_TEXTURE_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg/512px-The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg';

interface GlobeVizProps {
  onGlobeReady?: () => void;
  onZoomOut?: () => void; // Callback when globe is zoomed out to max distance
}

// Calculate sun position based on current time
const getSunPosition = (date: Date) => {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);

  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const timeDecimal = hours + minutes / 60 + seconds / 3600;
  const longitude = (timeDecimal / 24) * 360 - 180;

  return { lat: declination, lng: longitude };
};

const GlobeViz: React.FC<GlobeVizProps> = ({ onGlobeReady, onZoomOut }) => {

  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [sunPos, setSunPos] = useState(getSunPosition(new Date()));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  const initialSizeRef = useRef<{ width: number; height: number } | null>(null);
  const [hasInitialSize, setHasInitialSize] = useState(false);

  // Pause/resume control — shared across effects
  const pausedRef = useRef(false);            // true = animate loop should stop
  const animFnRef = useRef<((ts: number) => void) | null>(null); // stable ref to animate fn
  const animIdRef = useRef<number | null>(null);                  // current rAF id
  const { width, height } = useResizeDetector({
    targetRef: containerRef,
    refreshMode: 'debounce',
    refreshRate: 300, // Increased debounce to 300ms for better performance
    skipOnMount: false
  });
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Detect device capabilities once
  const deviceCapability = useMemo(() => detectDeviceCapability(), []);
  const textureURLs = useMemo(() => getOptimalTextureURLs(deviceCapability), [deviceCapability]);
  const rendererSettings = useMemo(() => getOptimalRendererSettings(deviceCapability), [deviceCapability]);

  // Update sun position every minute
  useEffect(() => {
    themeRef.current = theme;
    // Swap textures live when theme changes
    if (globeRef.current) {
      if (theme === 'light') {
        globeRef.current.globeImageUrl(SUN_TEXTURE_URL);
        globeRef.current.backgroundImageUrl('');
        try { globeRef.current.atmosphereColor('rgba(255,160,60,0.5)'); } catch (_) {}
        try { globeRef.current.atmosphereAltitude(0.15); } catch (_) {}
      } else {
        globeRef.current.globeImageUrl(textureURLs.globe);
        globeRef.current.backgroundImageUrl(textureURLs.background || '');
        try { globeRef.current.atmosphereColor('rgba(0,0,0,0)'); } catch (_) {}
        try { globeRef.current.atmosphereAltitude(0); } catch (_) {}
      }
    }
  }, [theme, textureURLs]);

  // Update sun position every minute
  useEffect(() => {
    const updateSunPosition = () => {
      setSunPos(getSunPosition(new Date()));
    };

    updateSunPosition();
    const interval = setInterval(updateSunPosition, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Capture the first usable size for one-time initialization, then only resize
  // the existing globe on later layout changes.
  useEffect(() => {
    if (!width || !height) return;

    if (!initialSizeRef.current) {
      initialSizeRef.current = { width, height };
      setHasInitialSize(true);
    }

    if (globeRef.current) {
      globeRef.current.width(width).height(height);
    }
  }, [width, height]);

  // Initialize globe once after the container has a measurable size.
  useEffect(() => {
    const initialSize = initialSizeRef.current;
    if (!containerRef.current || !hasInitialSize || !initialSize) return;

    // Clear existing globe only if recreating
    if (globeRef.current) {
      containerRef.current.innerHTML = '';
    }

    let mounted = true;
    const cleanupTimeouts: number[] = [];
    const cleanupIntervals: number[] = [];
    const cleanupListeners: Array<() => void> = [];

    // Track atmosphere mesh for disposal on cleanup
    let atmosFadeRafId: number | null = null;
    let atmosObjects: { mesh: THREE.Mesh; geo: THREE.SphereGeometry; mat: THREE.ShaderMaterial } | null = null;

    const registerTimeout = (fn: () => void, delay: number) => {
      const id = window.setTimeout(fn, delay);
      cleanupTimeouts.push(id);
      return id;
    };

    const registerInterval = (fn: () => void, delay: number) => {
      const id = window.setInterval(fn, delay);
      cleanupIntervals.push(id);
      return id;
    };

    const addCanvasListener = (
      target: EventTarget,
      event: string,
      handler: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions
    ) => {
      target.addEventListener(event, handler, options);
      cleanupListeners.push(() => target.removeEventListener(event, handler, options));
    };

    // Load Globe from CDN with retry mechanism and proper async handling
    const loadGlobe = async () => {
      if (!mounted || !containerRef.current) return;

      // Wait for Globe to be loaded from CDN with event-based approach
      const Globe = await new Promise<any>((resolve, reject) => {
        // Check if already loaded
        if ((window as any).Globe) {
          resolve((window as any).Globe);
          return;
        }

        // Use event listener for async script loading
        const onGlobeReady = () => {
          window.removeEventListener('globeReady', onGlobeReady);
          resolve((window as any).Globe);
        };
        window.addEventListener('globeReady', onGlobeReady);

        // Fallback timeout (8 seconds)
        setTimeout(() => {
          window.removeEventListener('globeReady', onGlobeReady);
          if ((window as any).Globe) {
            resolve((window as any).Globe);
          } else {
            reject(new Error('Globe CDN timeout'));
          }
        }, 8000);
      });

      if (!Globe || !mounted || !containerRef.current) return;

      // Verify Globe is a function
      if (typeof Globe !== 'function') {
        console.error('Globe is not a function:', typeof Globe);
        throw new Error('Globe constructor is not a function');
      }

      // Create globe with maximum quality textures
      // Globe() returns a function that needs to be called with the container
      const globeInstance = Globe();

      // Check if globeInstance is a function
      if (typeof globeInstance !== 'function') {
        console.error('Globe() did not return a function:', typeof globeInstance);
        throw new Error('Globe initialization failed');
      }

      // Call the instance function with container and chain methods
      const myGlobe = globeInstance(containerRef.current);

      // CRITICAL: Configure renderer settings BEFORE any initialization
      // This ensures Globe.gl creates the WebGL context with proper alpha support
      if (myGlobe.rendererConfig) {
        myGlobe.rendererConfig({
          alpha: true,
          premultipliedAlpha: false,
          antialias: true,
          powerPreference: 'high-performance'
        });
      }

      // Set dimensions
      myGlobe.width(initialSize.width);
      myGlobe.height(initialSize.height);

      // Load background FIRST - independent of globe data
      try {
        if (textureURLs.background) {
          myGlobe.backgroundImageUrl(textureURLs.background); // Show background stars immediately
        }
      } catch (e) {
        console.warn('backgroundImageUrl failed:', e);
      }

      // Set textures with error handling - load globe texture
      try {
        myGlobe.globeImageUrl(textureURLs.globe);
      } catch (e) {
        console.warn('globeImageUrl failed:', e);
      }

      // CRITICAL: Disable ALL built-in atmosphere/glow effects from Globe.gl
      try {
        myGlobe.atmosphereColor('rgba(0,0,0,0)'); // Make atmosphere completely transparent
        myGlobe.atmosphereAltitude(0); // Set atmosphere height to 0
      } catch (e) {
        console.warn('Failed to disable atmosphere:', e);
      }

      // CRITICAL: Get renderer and configure IMMEDIATELY with alpha support
      const renderer = myGlobe.renderer();

      // Get WebGL context
      const canvas = renderer.domElement;
      const glContext = renderer.getContext();

      // CRITICAL: Do NOT use setClearColor - it causes black borders!
      // Instead, rely purely on CSS transparency and alpha-enabled WebGL context

      // Force canvas to be completely transparent via CSS only
      canvas.style.background = 'none';
      canvas.style.backgroundColor = 'transparent';
      canvas.style.opacity = '1';

      // Force container to also be transparent
      if (containerRef.current) {
        containerRef.current.style.background = 'none';
        containerRef.current.style.backgroundColor = 'transparent';
      }

      const scene = myGlobe.scene();

      // Simple single ambient light - minimal lighting to test without edge artifacts
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);

      // Optimize renderer for maximum sharpness and performance
      renderer.setPixelRatio(rendererSettings.pixelRatio);
      renderer.powerPreference = rendererSettings.powerPreference as any;

      // Performance optimizations
      renderer.shadowMap.enabled = false; // Disable shadows for better performance
      renderer.physicallyCorrectLights = false; // Faster lighting calculations

      // Force high quality output with proper encoding
      (renderer as any).outputEncoding = 3001; // sRGB color space for accurate colors
      (renderer as any).toneMapping = 4; // ACES Filmic tone mapping for better visuals
      (renderer as any).toneMappingExposure = 1.0;

      // Additional performance optimizations
      renderer.sortObjects = false; // Skip object sorting for performance
      renderer.info.autoReset = true; // Auto-reset render info

      // Apply maximum texture filtering for sharpness
      // Get maximum anisotropic filtering available (usually 16)
      const ext = glContext.getExtension('EXT_texture_filter_anisotropic') ||
        glContext.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ||
        glContext.getExtension('MOZ_EXT_texture_filter_anisotropic');
      const maxAnisotropy = ext ? glContext.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 16;

      // Optimize scene and textures with balanced quality/performance
      scene.traverse((object: any) => {
        if (object.isMesh) {
          // Use moderate sphere resolution for good quality + performance balance
          if (object.geometry && object.geometry.type === 'SphereGeometry') {
            const oldGeometry = object.geometry;
            // Reduce segments for better performance - 48 is sweet spot for smooth look + performance
            const segments = deviceCapability.isMobile ? 32 : (deviceCapability.isHighEnd ? 64 : 48);
            object.geometry = new THREE.SphereGeometry(
              oldGeometry.parameters?.radius || 100,
              segments, // width segments - optimized for performance
              segments  // height segments - optimized for performance
            );
            oldGeometry.dispose();
          }

          if (object.material) {
            // CRITICAL: Remove all emissive/glow properties that create bright edges
            if (object.material.emissive) {
              object.material.emissive.setHex(0x000000); // No emissive glow
            }
            if (object.material.emissiveIntensity !== undefined) {
              object.material.emissiveIntensity = 0; // No glow intensity
            }

            if (object.material.map) {
              // Use maximum anisotropic filtering for sharpest textures
              object.material.map.anisotropy = maxAnisotropy;
              // Best quality filters for sharp rendering
              object.material.map.minFilter = THREE.LinearMipmapLinearFilter;
              object.material.map.magFilter = THREE.LinearFilter;
              // Ensure mipmaps are generated for better quality at all zoom levels
              object.material.map.generateMipmaps = true;
              // Set wrapping for seamless textures
              object.material.map.wrapS = THREE.ClampToEdgeWrapping;
              object.material.map.wrapT = THREE.ClampToEdgeWrapping;
            }
            if (object.material.bumpMap) {
              // DISABLE bumpMap to prevent edge artifacts
              object.material.bumpMap = null;
            }
            // Increase material quality
            if (object.material.needsUpdate !== undefined) {
              object.material.needsUpdate = true;
            }
          }
        }
      });

      // Start at the final resting view so cold loads and hard refreshes are
      // visually stable from the first painted frame.
      myGlobe.pointOfView({ lat: 16, lng: 106, altitude: 2.1 }, 0);
      setIsGlobeReady(true);

      // Add atmospheric glow layer after the globe is ready.
      registerTimeout(() => {
        if (myGlobe && mounted) {
          // Add atmospheric glow layer AFTER globe is ready
          registerTimeout(() => {
            if (!mounted) return;

            const atmosphereSegments = deviceCapability.isMobile ? 24 : (deviceCapability.isHighEnd ? 48 : 32);
            const atmosphereGeometry = new THREE.SphereGeometry(101, atmosphereSegments, atmosphereSegments);
            const atmosphereMaterial = new THREE.ShaderMaterial({
              vertexShader: `
              varying vec3 vNormal;
              void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
              fragmentShader: `
              varying vec3 vNormal;
              void main() {
                float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
              }
            `,
              blending: THREE.AdditiveBlending,
              side: THREE.BackSide,
              transparent: true,
              depthWrite: false,
              opacity: 0
            });
            const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            atmosphere.scale.set(1.1, 1.1, 1.1);
            atmosphere.renderOrder = -1;

            // Fade in atmosphere with a single rAF-based animation instead of setInterval
            atmosphereMaterial.transparent = true;
            atmosphereMaterial.opacity = 0;
            atmosObjects = { mesh: atmosphere, geo: atmosphereGeometry, mat: atmosphereMaterial };
            const fadeStart = performance.now();
            const fadeDuration = 600; // ms
            const fadeStep = () => {
              const elapsed = performance.now() - fadeStart;
              const t = Math.min(elapsed / fadeDuration, 1);
              atmosphereMaterial.opacity = t;
              atmosphereMaterial.needsUpdate = true;
              if (t < 1) {
                atmosFadeRafId = requestAnimationFrame(fadeStep);
              } else {
                atmosFadeRafId = null;
              }
            };
            atmosFadeRafId = requestAnimationFrame(fadeStep);

            scene.add(atmosphere);
          }, 500); // Add atmosphere 500ms after zoom starts
        }
      }, 100);

      // Optimize controls for smooth rotation
      const controls = myGlobe.controls();
      const camera = myGlobe.camera();
      controls.autoRotate = true; // Enable auto-rotate for dynamic effect
      controls.autoRotateSpeed = 0.25; // Start slower and ramp up
            registerTimeout(() => {
              if (controls && mounted) {
                controls.autoRotateSpeed = 0.55; // Ramp to normal speed after initial appear
              }
            }, 1200);

      controls.enableDamping = true;
      controls.dampingFactor = 0.1; // Higher value = less calculations, better performance
      controls.rotateSpeed = 0.6; // Smooth manual rotation
      controls.minDistance = 150; // Prevent zooming too close to Earth surface
      controls.maxDistance = 350; // Allow more zoom out distance for better UX
      controls.enablePan = true;
      controls.panSpeed = 0.5;
      controls.enableZoom = false; // Disabled by default so wheel events reach Lenis for page scroll

      // Capture-phase interceptor: fires BEFORE OrbitControls' bubble listener on the canvas.
      // Globe.gl's bundled Three.js may call preventDefault()/stopPropagation() unconditionally
      // in its wheel handler, which would swallow all scroll events even when enableZoom=false.
      // By stopping propagation here in the capture phase we prevent that, then forward the
      // delta to Lenis so the page still scrolls smoothly.
      const interceptWheel = (e: WheelEvent) => {
        if (!controls.enableZoom) {
          e.stopImmediatePropagation(); // Block OrbitControls from seeing this event
          const lenis = (window as any).__lenis;
          if (lenis) {
            // Accumulate scroll by targeting current position + delta
            lenis.scrollTo((lenis.targetScroll ?? window.scrollY) + e.deltaY, {
              duration: 1.0,
              easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            });
          }
        }
      };
      if (containerRef.current) {
        containerRef.current.addEventListener('wheel', interceptWheel, { capture: true, passive: false });
        cleanupListeners.push(() =>
          containerRef.current?.removeEventListener('wheel', interceptWheel, { capture: true } as EventListenerOptions)
        );
      }

      // Track if mouse is over the canvas to enable/disable zoom
      let isMouseOverCanvas = false;
      
      const onMouseEnter = () => {
        isMouseOverCanvas = true;
        controls.enableZoom = true; // Allow zoom when hovering over globe
      };

      const onMouseLeave = () => {
        isMouseOverCanvas = false;
        // Immediately disable zoom so wheel events pass through to Lenis (page scroll)
        registerTimeout(() => {
          if (!isMouseOverCanvas) {
            controls.enableZoom = false;
          }
        }, 50);
      };

      addCanvasListener(canvas, 'mouseenter', onMouseEnter);
      addCanvasListener(canvas, 'mouseleave', onMouseLeave);

      // Track zoom level and trigger scroll when at max zoom out
      let hasTriggeredScroll = false;

      // Enhanced wheel handler to detect scroll at max zoom
      const handleWheelScroll = (e: WheelEvent) => {
        if (!myGlobe || !myGlobe.camera()) return;
        
        const camera = myGlobe.camera();
        const distance = camera.position.length();
        const maxDistance = controls.maxDistance || 350;
        
        // If at max zoom out (within 5 units) and scrolling down (positive deltaY)
        const isAtMaxZoom = distance >= maxDistance - 5;
        const isScrollingDown = e.deltaY > 0;
        
        if (isAtMaxZoom && isScrollingDown && !hasTriggeredScroll && onZoomOut) {
          hasTriggeredScroll = true;
          registerTimeout(() => {
            if (onZoomOut) onZoomOut();
            registerTimeout(() => { hasTriggeredScroll = false; }, 2000);
          }, 100);
        }
        
        // Reset flag when zoom back in
        if (distance < maxDistance - 50) {
          hasTriggeredScroll = false;
        }
      };
      
      // Add wheel listener for scroll detection (passive so it doesn't block Lenis)
      addCanvasListener(canvas, 'wheel', handleWheelScroll, { passive: true });

      // Apply scene optimizations
      optimizeScene(scene, deviceCapability);

      // Remove ALL rotation limits for complete 360° freedom
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;
      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;

      // Disable screen space panning to allow full rotation through poles
      controls.screenSpacePanning = false;

      globeRef.current = myGlobe;

      // Apply initial pause state based on current theme
      // (the separate pause-control useEffect handles changes; this covers the first load)
      {
        const initIsLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (initIsLight) {
          pausedRef.current = true; // globeLoop will bail on first tick
          try { renderer.setAnimationLoop(null); } catch (_) {}
          try { controls.autoRotate = false; } catch (_) {}
        }
      }

      // Optimized animation loop with adaptive frame rate
      let isUserInteracting = false;
      let inactivityTimer: ReturnType<typeof setTimeout> | undefined;

      // Detect user interaction for adaptive rendering
      const onInteractionStart = () => {
        isUserInteracting = true;
        clearTimeout(inactivityTimer);
      };

      const onInteractionEnd = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          isUserInteracting = false;
        }, 500);
      };

      // Handle wheel events - allow scroll through when not zooming
      const onWheel = (e: WheelEvent) => {
        // If user is holding Ctrl/Cmd (zoom gesture), let Globe handle it
        if (e.ctrlKey || e.metaKey) {
          onInteractionStart();
          return;
        }
        
        // If camera is at max distance and user scrolling down, allow page scroll
        const camera = myGlobe.camera();
        if (camera) {
          const distance = camera.position.length();
          const isAtMaxDistance = distance >= controls.maxDistance - 10;
          
          // If at max zoom out and scrolling away from globe, allow page scroll
          if (isAtMaxDistance && e.deltaY > 0) {
            // Don't prevent default - allow page scroll
            return;
          }
        }
        
        // Otherwise, mark as interaction for Globe zoom
        onInteractionStart();
      };

      // Add interaction listeners
      addCanvasListener(canvas, 'mousedown', onInteractionStart);
      addCanvasListener(canvas, 'touchstart', onInteractionStart);
      addCanvasListener(canvas, 'mouseup', onInteractionEnd);
      addCanvasListener(canvas, 'touchend', onInteractionEnd);
      addCanvasListener(canvas, 'wheel', onWheel, { passive: true });


      // Adaptive FPS based on interaction
      const targetFPS = deviceCapability.isMobile ? 30 : 60;
      const idleFPS = deviceCapability.isMobile ? 15 : 30;

      // Single merged loop: handles controls + render with FPS throttling.
      // Replaces the old dual-loop (Globe.gl setAnimationLoop at 60fps + custom rAF).
      let lastRenderTs = 0;
      const globeLoop = (ts: number) => {
        if (!mounted || pausedRef.current) return;
        const fps = isUserInteracting ? targetFPS : idleFPS;
        if (ts - lastRenderTs < 1000 / fps) return;
        lastRenderTs = ts;
        controls.update();
        renderer.render(scene, camera);
      };
      animFnRef.current = globeLoop as any;
      // setAnimationLoop fires at display refresh rate; globeLoop throttles internally.
      renderer.setAnimationLoop(globeLoop);

      // Notify consumers after the initial scene has had time to settle.
      registerTimeout(() => {
        if (onGlobeReady && mounted) {
          onGlobeReady();
        }
      }, 1400); // Slightly after zoom animation (1200ms + 200ms buffer)

      // CSS transparency is sufficient - no need for delayed setClearColor
    };

    loadGlobe().catch((err: any) => {
      console.error('Failed to load Globe:', err);
      setLoadError(err.message || 'Unknown error');
    });

    return () => {
      mounted = false;
      // Cancel any in-flight atmosphere fade rAF before anything else
      if (atmosFadeRafId != null) {
        cancelAnimationFrame(atmosFadeRafId);
        atmosFadeRafId = null;
      }
      cleanupTimeouts.forEach(id => clearTimeout(id));
      cleanupIntervals.forEach(id => clearInterval(id));
      cleanupListeners.forEach(dispose => dispose());
      if (animIdRef.current != null) {
        cancelAnimationFrame(animIdRef.current);
        animIdRef.current = null;
      }
      animFnRef.current = null;
      // Dispose atmosphere GPU resources
      if (atmosObjects) {
        atmosObjects.geo.dispose();
        atmosObjects.mat.dispose();
        atmosObjects = null;
      }
      if (globeRef.current?._destructor) {
        globeRef.current._destructor();
      }
      globeRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [hasInitialSize, textureURLs, deviceCapability, rendererSettings, onGlobeReady, onZoomOut]);

  // ── Pause / resume control ─────────────────────────────────────────────────
  // Globe should only render when: theme === 'dark' AND home section is visible.
  // Uses MutationObserver (theme) + IntersectionObserver (scroll) to stop/start
  // both our custom rAF loop and Globe.gl's internal WebGLRenderer loop.
  useEffect(() => {
    const getRenderer = (): THREE.WebGLRenderer | null => {
      try { return globeRef.current?.renderer?.() ?? null; } catch { return null; }
    };

    let isVisible = true;         // tracks IntersectionObserver state
    let rendererStopped = false;  // true if we called setAnimationLoop(null)

    const shouldPause = () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      return isLight || !isVisible;
    };

    const doPause = () => {
      pausedRef.current = true;
      // Stop the merged setAnimationLoop (handles both render + controls)
      const r = getRenderer();
      if (r && !rendererStopped) {
        try { r.setAnimationLoop(null); rendererStopped = true; } catch (_) {}
      }
      // Cancel any lingering rAF (safety net)
      if (animIdRef.current != null) {
        cancelAnimationFrame(animIdRef.current);
        animIdRef.current = null;
      }
      try { globeRef.current?.controls?.()?.autoRotate === undefined || (globeRef.current.controls().autoRotate = false); } catch (_) {}
    };

    const doResume = () => {
      pausedRef.current = false;
      // Restart the merged loop via setAnimationLoop using the stored loop fn
      if (rendererStopped) {
        const r = getRenderer();
        if (r && animFnRef.current) {
          try {
            r.setAnimationLoop(animFnRef.current as any);
            rendererStopped = false;
          } catch (_) {}
        }
      }
      try { globeRef.current?.controls?.()?.autoRotate === undefined || (globeRef.current.controls().autoRotate = true); } catch (_) {}
    };

    const update = () => { if (shouldPause()) doPause(); else doResume(); };

    // Watch data-theme attribute changes
    const themeObs = new MutationObserver(update);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Watch scroll visibility — pause when home section is off-screen
    let io: IntersectionObserver | null = null;
    if (containerRef.current) {
      io = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        update();
      }, { threshold: 0 });
      io.observe(containerRef.current);
    }

    // Apply current state immediately (globe may not be loaded yet — that's OK,
    // pausedRef is set so animate exits on first tick, and Globe.gl initial pause
    // is handled inside loadGlobe useEffect)
    update();

    return () => {
      themeObs.disconnect();
      io?.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update sun light position when sun position changes
  useEffect(() => {
    if (sunLightRef.current) {
      const phi = (90 - sunPos.lat) * Math.PI / 180;
      const theta = (sunPos.lng + 180) * Math.PI / 180;
      const distance = 300;

      sunLightRef.current.position.set(
        -distance * Math.sin(phi) * Math.cos(theta),
        distance * Math.cos(phi),
        distance * Math.sin(phi) * Math.sin(theta)
      );
    }
  }, [sunPos]);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-2">Failed to load 3D Globe</p>
          <p className="text-gray-400 text-sm mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0 z-0"
      style={{
        overflow: 'hidden',
        transform: 'translateZ(0)', // Force hardware acceleration
        willChange: 'transform', // Optimize for smooth animations
        backfaceVisibility: 'hidden', // Improve rendering performance
        WebkitFontSmoothing: 'antialiased', // Smoother rendering
        background: 'transparent', // Ensure container is transparent
        backgroundColor: 'transparent', // No background color
        opacity: isGlobeReady ? 1 : 0, // Fade in effect
        filter: isGlobeReady ? 'blur(0px) scale(1)' : 'blur(6px) scale(0.985)', // Subtle focus/scale pop
        transition: 'opacity 1.2s ease, filter 1.4s ease', // Smooth fade + deblur
        pointerEvents: 'auto', // Allow interactions with globe
      }}

    />
  );
};

export default GlobeViz;
