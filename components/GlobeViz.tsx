import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import * as THREE from 'three';
import {
  detectDeviceCapability,
  getOptimalTextureURLs,
  getOptimalRendererSettings,
  optimizeScene
} from '../utils/texture-optimizer';
import { cacheManager } from '../utils/cache-manager';
import { resourceRateLimiter } from '../utils/rate-limiter';
import { debounce } from '../utils/debounce';

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
  const [countries, setCountries] = useState<any>({ features: [] });
  const [sunPos, setSunPos] = useState(getSunPosition(new Date()));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
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
    const updateSunPosition = () => {
      setSunPos(getSunPosition(new Date()));
    };

    updateSunPosition();
    const interval = setInterval(updateSunPosition, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Load country data with caching - deferred to not block initial render
  useEffect(() => {
    const controller = new AbortController();
    const cacheKey = 'geojson_countries';

    const loadCountries = async () => {
      // Check rate limit
      if (!resourceRateLimiter.isAllowed()) {
        console.warn('Rate limit exceeded for resource loading');
        return;
      }

      // Try cache first
      const cached = await cacheManager.get(cacheKey, 'indexedDB');
      if (cached) {
        setCountries(cached);
        return;
      }

      // Defer network fetch to after initial render
      requestIdleCallback(() => {
        fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson', {
          signal: controller.signal
        })
          .then(res => res.json())
          .then(async data => {
            setCountries(data);
            // Cache for 7 days
            await cacheManager.set(cacheKey, data, {
              ttl: 7 * 24 * 60 * 60 * 1000,
              storage: 'indexedDB'
            });
          })
          .catch(err => {
            if (err.name !== 'AbortError') {
              console.error("Failed to load globe data", err);
            }
          });
      });
    };

    loadCountries();
    return () => controller.abort();
  }, []);

  // Initialize globe (only once on mount or when size changes)
  useEffect(() => {
    if (!containerRef.current || !width || !height) return;

    // Don't recreate if globe already exists and just resizing
    if (globeRef.current && width && height) {
      globeRef.current.width(width).height(height);
      return;
    }

    // Clear existing globe only if recreating
    if (globeRef.current) {
      containerRef.current.innerHTML = '';
    }

    let mounted = true;

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
      myGlobe.width(width);
      myGlobe.height(height);

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

      // Set initial view focused on Vietnam with zoom out effect
      // Start zoomed in (altitude 0.5) and animate to normal view (altitude 2)
      myGlobe.pointOfView({ lat: 16, lng: 106, altitude: 0.5 }, 0);

      // Smooth zoom out animation after a brief delay
      setTimeout(() => {
        if (myGlobe && mounted) {
          myGlobe.pointOfView({ lat: 16, lng: 106, altitude: 2 }, 1200); // 1.2s animation
          setIsGlobeReady(true);

          // Add atmospheric glow layer AFTER globe is ready
          setTimeout(() => {
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

            // Fade in atmosphere
            atmosphereMaterial.transparent = true;
            let opacity = 0;
            const fadeIn = setInterval(() => {
              opacity += 0.05;
              atmosphereMaterial.opacity = Math.min(opacity, 1);
              atmosphereMaterial.needsUpdate = true;
              if (opacity >= 1) clearInterval(fadeIn);
            }, 30);

            scene.add(atmosphere);
          }, 500); // Add atmosphere 500ms after zoom starts
        }
      }, 100);

      // Optimize controls for smooth rotation
      const controls = myGlobe.controls();
      controls.autoRotate = false; // Disable auto-rotate by default for better performance
      controls.autoRotateSpeed = 0.3; // Faster rotation when enabled
      controls.enableDamping = true;
      controls.dampingFactor = 0.1; // Higher value = less calculations, better performance
      controls.rotateSpeed = 0.6; // Smooth manual rotation
      controls.minDistance = 101;
      controls.maxDistance = 350; // Allow more zoom out distance for better UX
      controls.enablePan = true;
      controls.panSpeed = 0.5;

      // Reduce update frequency for controls
      controls.update = (() => {
        let lastUpdate = 0;
        const updateThrottle = deviceCapability.isMobile ? 33 : 16; // 30fps mobile, 60fps desktop
        const originalUpdate = controls.update.bind(controls);
        return function () {
          const now = Date.now();
          if (now - lastUpdate > updateThrottle) {
            originalUpdate();
            lastUpdate = now;
          }
        };
      })();

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

      // Optimized animation loop with adaptive frame rate
      let lastTime = 0;
      let isUserInteracting = false;
      let inactivityTimer: NodeJS.Timeout;

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

      // Add interaction listeners
      canvas.addEventListener('mousedown', onInteractionStart);
      canvas.addEventListener('touchstart', onInteractionStart);
      canvas.addEventListener('mouseup', onInteractionEnd);
      canvas.addEventListener('touchend', onInteractionEnd);
      canvas.addEventListener('wheel', onInteractionStart);

      // Track zoom level and trigger onZoomOut when fully zoomed out
      let hasTriggeredZoomOut = false;
      let previousDistance = 0; // Track previous distance to detect zoom direction
      let isInitialized = false; // Track if we've completed initial setup

      // Initialize previousDistance with current camera distance after a short delay
      // This prevents false triggers during initial camera animations
      setTimeout(() => {
        if (myGlobe && myGlobe.camera()) {
          previousDistance = myGlobe.camera().position.length();
          isInitialized = true;
          console.log('[Zoom Init] Initial distance set:', previousDistance.toFixed(1));
        }
      }, 2000); // Wait 2 seconds for initial animations to complete

      const checkZoomLevel = debounce(() => {
        if (!mounted || !myGlobe || !isInitialized) return; // Skip if not initialized

        // Get camera distance from globe center
        const camera = myGlobe.camera();
        const controls = myGlobe.controls();

        if (camera && controls) {
          const distance = camera.position.length();
          const isZoomingOut = distance > previousDistance; // Check if zooming out (distance increasing)

          // Debug logging
          if (distance > 240) {
            console.log(`[Zoom Debug] Distance: ${distance.toFixed(1)}, IsZoomingOut: ${isZoomingOut}, Triggered: ${hasTriggeredZoomOut}`);
          }

          // If zoomed out beyond threshold (90% of max distance = 270)
          // and haven't triggered callback yet
          if (isZoomingOut && distance >= 250 && !hasTriggeredZoomOut && onZoomOut) {
            hasTriggeredZoomOut = true;
            // Small delay to ensure smooth transition
            setTimeout(() => {
              if (mounted && onZoomOut) {
                onZoomOut();
                // Reset flag after 2 seconds to allow re-trigger if user zooms back in and out again
                setTimeout(() => {
                  hasTriggeredZoomOut = false;
                }, 2000);
              }
            }, 300);
          }
          // Reset flag when zooming back in significantly
          else if (distance < 180) {
            hasTriggeredZoomOut = false;
          }

          // Update previous distance for next comparison
          previousDistance = distance;
        }
      }, 200); // Debounce by 200ms

      // Add zoom change listener
      controls.addEventListener('change', checkZoomLevel);


      // Adaptive FPS based on interaction
      const targetFPS = deviceCapability.isMobile ? 30 : 60;
      const idleFPS = deviceCapability.isMobile ? 15 : 30;

      const animate = (currentTime: number) => {
        if (!mounted) return;

        // Use appropriate frame rate based on interaction
        const fps = isUserInteracting ? targetFPS : idleFPS;
        const frameInterval = 1000 / fps;

        const deltaTime = currentTime - lastTime;
        if (deltaTime < frameInterval) {
          requestAnimationFrame(animate);
          return;
        }

        lastTime = currentTime - (deltaTime % frameInterval);

        // Update controls (throttled internally)
        controls.update();

        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);

      // Call onGlobeReady after zoom animation completes
      setTimeout(() => {
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
    };
  }, [width, height, countries, textureURLs, deviceCapability, rendererSettings, onGlobeReady, onZoomOut]);

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
        opacity: isGlobeReady ? 1 : 0.7, // Fade in effect
        transition: 'opacity 0.8s ease-in-out', // Smooth fade transition
      }}
    />
  );
};

export default GlobeViz;