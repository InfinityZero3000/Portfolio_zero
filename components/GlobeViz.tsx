import React, { useEffect, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import * as THREE from 'three';

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
  const [isPaused, setIsPaused] = useState(false);
  const [sunPos, setSunPos] = useState(getSunPosition(new Date()));
  const { width, height } = useResizeDetector({ 
    targetRef: containerRef,
    refreshMode: 'throttle',
    refreshRate: 200
  });
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Update sun position every minute
  useEffect(() => {
    const updateSunPosition = () => {
      setSunPos(getSunPosition(new Date()));
    };
    
    updateSunPosition();
    const interval = setInterval(updateSunPosition, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  // Load country data - use reliable GeoJSON source
  useEffect(() => {
    const controller = new AbortController();
    
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson', {
      signal: controller.signal
    })
      .then(res => res.json())
      .then(data => {
        setCountries(data);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Failed to load globe data", err);
        }
      });
    
    return () => controller.abort();
  }, []);

  // Initialize globe
  useEffect(() => {
    if (!containerRef.current || !width || !height) return;
    
    // Clear existing globe
    if (globeRef.current) {
      containerRef.current.innerHTML = '';
    }

    let mounted = true;
    
    // Load Globe from CDN to avoid module resolution issues
    const loadGlobe = async () => {
      if (!mounted || !containerRef.current) return;
      
      // Check if Globe is already loaded from CDN
      const Globe = (window as any).Globe;
      
      if (!Globe) return;
      
      // Create new globe instance with high-quality textures
      const myGlobe = Globe()(containerRef.current)
      .width(width)
      .height(height)
      .globeImageUrl('https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png')
      .backgroundImageUrl('https://unpkg.com/three-globe@2.31.0/example/img/night-sky.png')
      .showAtmosphere(true)
      .atmosphereColor('#87ceeb')
      .atmosphereAltitude(0.12);

    // Add realistic lighting
    const scene = myGlobe.scene();
    
    // Remove default lights
    scene.children.forEach((child: any) => {
      if (child.isLight && child.type === 'AmbientLight') {
        scene.remove(child);
      }
    });
    
    // Add dim ambient light
    const ambientLight = new THREE.AmbientLight(0x222244, 0.4);
    scene.add(ambientLight);
    
    // Add directional light from sun position
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    const phi = (90 - sunPos.lat) * Math.PI / 180;
    const theta = (sunPos.lng + 180) * Math.PI / 180;
    const distance = 300;
    
    sunLight.position.set(
      -distance * Math.sin(phi) * Math.cos(theta),
      distance * Math.cos(phi),
      distance * Math.sin(phi) * Math.sin(theta)
    );
    
    sunLight.castShadow = false;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Optimize renderer settings with maximum quality
    const renderer = myGlobe.renderer();
    renderer.setPixelRatio(window.devicePixelRatio); // Use full device pixel ratio for maximum sharpness
    renderer.powerPreference = 'high-performance';
    renderer.antialias = true; // Enable antialiasing for smoother edges
    
    // Enable anisotropic filtering for sharper textures when viewing at angles
    const gl = renderer.getContext();
    const maxAnisotropy = gl.getParameter(gl.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1;
    
    // Apply anisotropic filtering to globe textures
    scene.traverse((object: any) => {
      if (object.isMesh && object.material) {
        if (object.material.map) {
          object.material.map.anisotropy = maxAnisotropy;
          object.material.map.minFilter = THREE.LinearMipmapLinearFilter;
          object.material.map.magFilter = THREE.LinearFilter;
        }
        if (object.material.bumpMap) {
          object.material.bumpMap.anisotropy = maxAnisotropy;
        }
      }
    });
    
    // Set initial view focused on Vietnam - smooth zoom in animation
    myGlobe.pointOfView({ lat: 16, lng: 106, altitude: 2.5 }, 0); // Start further out
    setTimeout(() => {
      myGlobe.pointOfView({ lat: 16, lng: 106, altitude: 2 }, 2000); // Zoom in over 2 seconds
    }, 100);
    
    const controls = myGlobe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3; // Slower rotation for better performance
    controls.enableDamping = true;
    controls.dampingFactor = 0.1; // More damping for smoother feel
    controls.minDistance = 101;
    controls.maxDistance = 500;
    
    // Remove ALL rotation limits for complete 360° freedom
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    
    // Disable screen space panning to allow full rotation through poles
    controls.screenSpacePanning = false;

        globeRef.current = myGlobe;

        if (onGlobeReady) {
          setTimeout(() => onGlobeReady(), 100);
        }
    };
    
    loadGlobe().catch((err: any) => {
      console.error('Failed to load Globe:', err);
    });

    return () => {
      mounted = false;
      if (globeRef.current) {
        globeRef.current = null;
      }
    };
  }, [width, height, countries, sunPos, onGlobeReady]);

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

  const togglePause = () => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      controls.autoRotate = !controls.autoRotate;
      setIsPaused(!isPaused);
    }
  };

  return (
    <>
      <div 
        ref={containerRef} 
        className="w-full h-full absolute inset-0 z-0"
        style={{ overflow: 'hidden' }}
      />
      <button
        onClick={togglePause}
        className="fixed bottom-6 right-6 z-[100] text-gray-400 hover:text-white transition-all duration-200 hover:scale-110 pointer-events-auto"
        style={{ pointerEvents: 'auto' }}
        title={isPaused ? "Resume rotation" : "Pause rotation"}
      >
        {isPaused ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        )}
      </button>
    </>
  );
};

export default GlobeViz;