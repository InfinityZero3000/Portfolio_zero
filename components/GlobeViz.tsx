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

interface GlobeVizProps {
  onGlobeReady?: () => void;
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

const GlobeViz: React.FC<GlobeVizProps> = ({ onGlobeReady }) => {
  
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [countries, setCountries] = useState<any>({ features: [] });
  const [sunPos, setSunPos] = useState(getSunPosition(new Date()));
  const [loadError, setLoadError] = useState<string | null>(null);
  const { width, height } = useResizeDetector({ 
    targetRef: containerRef,
    refreshMode: 'throttle',
    refreshRate: 200
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
    
    // Load Globe from CDN with retry mechanism and timeout
    const loadGlobe = async () => {
      if (!mounted || !containerRef.current) return;
      
      // Wait for Globe to be loaded from CDN with timeout (max 10 seconds)
      const Globe = await new Promise<any>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 200; // 200 * 50ms = 10 seconds
        
        const checkGlobe = () => {
          if ((window as any).Globe) {
            resolve((window as any).Globe);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkGlobe, 50);
          } else {
            console.error('Failed to load Globe from CDN after 10 seconds');
            reject(new Error('Globe CDN timeout'));
          }
        };
        checkGlobe();
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
      
      // Set dimensions
      myGlobe.width(width);
      myGlobe.height(height);
      
      // Set textures with error handling
      try {
        myGlobe.globeImageUrl(textureURLs.globe);
      } catch (e) {
        console.warn('globeImageUrl failed:', e);
      }
      
      try {
        myGlobe.bumpImageUrl(textureURLs.bump);
      } catch (e) {
        console.warn('bumpImageUrl failed:', e);
      }
      
      try {
        myGlobe.backgroundImageUrl(textureURLs.background); // Show background stars
      } catch (e) {
        console.warn('backgroundImageUrl failed:', e);
      }

      const scene = myGlobe.scene();
      
      const createCustomAtmosphere = () => {
        // Vertex shader for atmosphere glow
        const atmosphereVertexShader = `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;
        
        // Fragment shader for outer glow effect
        const atmosphereFragmentShader = `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
          }
        `;
        
        // Create atmosphere sphere slightly larger than globe
        const atmosphereGeometry = new THREE.SphereGeometry(102, 128, 128); // 2 units larger than globe (100)
        const atmosphereMaterial = new THREE.ShaderMaterial({
          vertexShader: atmosphereVertexShader,
          fragmentShader: atmosphereFragmentShader,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide, // Render only the back side for outer glow
          transparent: true,
          depthWrite: false, // Don't write to depth buffer to avoid z-fighting
        });
        
        const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        atmosphereMesh.scale.set(1.15, 1.15, 1.15); // Scale up for outer glow effect
        scene.add(atmosphereMesh);
      };
      
      createCustomAtmosphere();
    
    // Add strong ambient light for bright, even illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    // Add directional light from sun position for highlights
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    const currentSun = getSunPosition(new Date());
    const phi = (90 - currentSun.lat) * Math.PI / 180;
    const theta = (currentSun.lng + 180) * Math.PI / 180;
    const distance = 300;
    
    sunLight.position.set(
      -distance * Math.sin(phi) * Math.cos(theta),
      distance * Math.cos(phi),
      distance * Math.sin(phi) * Math.sin(theta)
    );
    
    sunLight.castShadow = false;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Optimize renderer for maximum sharpness
    const renderer = myGlobe.renderer();
    renderer.setPixelRatio(rendererSettings.pixelRatio);
    renderer.powerPreference = rendererSettings.powerPreference as any;
    
    // Enable high quality rendering
    renderer.shadowMap.enabled = false; // Disable shadows for better performance
    renderer.physicallyCorrectLights = false; // Faster lighting calculations
    
    // Force high quality output with proper encoding
    (renderer as any).outputEncoding = 3001; // sRGB color space for accurate colors
    (renderer as any).toneMapping = 4; // ACES Filmic tone mapping for better visuals
    (renderer as any).toneMappingExposure = 1.0;
    
    // Set target frame rate for consistent animation
    myGlobe.rendererConfig = myGlobe.rendererConfig || {};
    myGlobe.rendererConfig.antialias = true;
    
    // Apply maximum texture filtering for sharpness
    const gl = renderer.getContext();
    // Get maximum anisotropic filtering available (usually 16)
    const ext = gl.getExtension('EXT_texture_filter_anisotropic') || 
                gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') || 
                gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
    const maxAnisotropy = ext ? gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 16;
    
    // Optimize scene and textures with maximum sharpness
    scene.traverse((object: any) => {
      if (object.isMesh) {
        // Increase sphere geometry resolution for smoother, sharper surface
        if (object.geometry && object.geometry.type === 'SphereGeometry') {
          const oldGeometry = object.geometry;
          // Replace with high-res sphere (128 segments vs default ~64)
          object.geometry = new THREE.SphereGeometry(
            oldGeometry.parameters?.radius || 100,
            128, // width segments - higher = smoother
            128  // height segments - higher = smoother
          );
          oldGeometry.dispose();
        }
        
        if (object.material) {
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
            object.material.bumpMap.anisotropy = maxAnisotropy;
            object.material.bumpMap.minFilter = THREE.LinearMipmapLinearFilter;
            object.material.bumpMap.magFilter = THREE.LinearFilter;
            object.material.bumpMap.generateMipmaps = true;
          }
          // Increase material quality
          if (object.material.needsUpdate !== undefined) {
            object.material.needsUpdate = true;
          }
        }
      }
    });
    
    // Set initial view focused on Vietnam
    myGlobe.pointOfView({ lat: 16, lng: 106, altitude: 2 }, 0);
    
    // Optimize controls for smooth rotation
    const controls = myGlobe.controls();
    controls.autoRotate = !deviceCapability.isMobile; // Disable auto-rotate on mobile to save battery
    controls.autoRotateSpeed = 0.15; // Slower, smoother rotation for all devices
    controls.enableDamping = true;
    controls.dampingFactor = 0.05; // Lower value = smoother, more fluid motion
    controls.rotateSpeed = 0.5; // Slower manual rotation for better control
    controls.minDistance = 101;
    controls.maxDistance = 500;
    controls.enablePan = true;
    controls.panSpeed = 0.5;
    
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
        
        // Optimize animation loop for smooth 60 FPS
        const animate = () => {
          if (!mounted) return;
          requestAnimationFrame(animate);
          
          // Smooth auto-rotation update
          if (controls.autoRotate) {
            controls.update();
          }
        };
        animate();

        if (onGlobeReady) {
          onGlobeReady();
        }
    };
    
    loadGlobe().catch((err: any) => {
      console.error('Failed to load Globe:', err);
      setLoadError(err.message || 'Unknown error');
    });

    return () => {
      mounted = false;
    };
  }, [width, height, countries, textureURLs, deviceCapability, rendererSettings, onGlobeReady]);

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
      }}
    />
  );
};

export default GlobeViz;