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
  console.log('GlobeViz component rendering');
  
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
    console.log('Globe init effect running', { hasContainer: !!containerRef.current, width, height });
    if (!containerRef.current || !width || !height) return;

    console.log('Creating Globe instance...');
    
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
      
      if (!Globe) {
        console.error('Globe not loaded from CDN');
        return;
      }
      
      console.log('Globe loaded from CDN');
      
      // Create new globe instance with performance optimizations
      const myGlobe = Globe()(containerRef.current)
      .width(width)
      .height(height)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .showAtmosphere(true)
      .atmosphereColor('#87ceeb')
      .atmosphereAltitude(0.12)
      .customThreeObject((d: any) => {
        // Create group for marker
        const group = new THREE.Group();
        
        // Calculate position on sphere
        const phi = (90 - d.lat) * Math.PI / 180;
        const theta = (d.lng + 180) * Math.PI / 180;
        const altitude = 0.05;
        const radius = 100 * (1 + altitude);
        
        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        if (d.type === 'star') {
          // Create bright star sprite for Hanoi
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d')!;
          
          // Draw glowing star
          ctx.fillStyle = d.color;
          ctx.font = 'bold 80px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = d.color;
          ctx.shadowBlur = 30;
          ctx.fillText('★', 64, 64);
          
          const texture = new THREE.CanvasTexture(canvas);
          const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthWrite: false
          });
          const sprite = new THREE.Sprite(material);
          sprite.scale.set(d.bright ? 12 : 8, d.bright ? 12 : 8, 1);
          group.add(sprite);
          
          // Add glowing effect for bright stars
          if (d.bright) {
            const glowCanvas = document.createElement('canvas');
            glowCanvas.width = 256;
            glowCanvas.height = 256;
            const glowCtx = glowCanvas.getContext('2d')!;
            
            const gradient = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
            gradient.addColorStop(0, 'rgba(255, 255, 0, 0.6)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
            glowCtx.fillStyle = gradient;
            glowCtx.fillRect(0, 0, 256, 256);
            
            const glowTexture = new THREE.CanvasTexture(glowCanvas);
            const glowMaterial = new THREE.SpriteMaterial({ 
              map: glowTexture,
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending
            });
            const glowSprite = new THREE.Sprite(glowMaterial);
            glowSprite.scale.set(20, 20, 1);
            group.add(glowSprite);
          }
        } else if (d.type === 'area') {
          // Create red marker for archipelagos
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d')!;
          
          // Draw glowing red circle
          const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 50);
          gradient.addColorStop(0, 'rgba(255, 0, 0, 1)');
          gradient.addColorStop(0.5, 'rgba(255, 0, 0, 0.8)');
          gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(64, 64, 50, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw border
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(64, 64, 35, 0, Math.PI * 2);
          ctx.stroke();
          
          const texture = new THREE.CanvasTexture(canvas);
          const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
          });
          const sprite = new THREE.Sprite(material);
          sprite.scale.set(15, 15, 1);
          group.add(sprite);
        } else {
          // Create pin marker
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 180;
          const ctx = canvas.getContext('2d')!;
          
          // Draw pin
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(64, 64, 32, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(64, 96);
          ctx.lineTo(64, 160);
          ctx.lineTo(44, 96);
          ctx.lineTo(84, 96);
          ctx.closePath();
          ctx.fill();
          
          // Draw white circle in center
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(64, 64, 18, 0, Math.PI * 2);
          ctx.fill();
          
          const texture = new THREE.CanvasTexture(canvas);
          const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthWrite: false
          });
          const sprite = new THREE.Sprite(material);
          sprite.scale.set(6, 8.4, 1);
          sprite.position.set(0, 3.5, 0);
          group.add(sprite);
        }
        
        // Position group to point outward from globe
        group.position.set(x, y, z);
        group.lookAt(0, 0, 0);
        group.rotateY(Math.PI);
        
        return group;
      })
      .customThreeObjectUpdate((obj: any, d: any) => {
        // Update position to maintain outward orientation
        const phi = (90 - d.lat) * Math.PI / 180;
        const theta = (d.lng + 180) * Math.PI / 180;
        const altitude = 0.05;
        const radius = 100 * (1 + altitude);
        
        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        obj.position.set(x, y, z);
        obj.lookAt(0, 0, 0);
        obj.rotateY(Math.PI);
      });

    // Add realistic lighting
    const scene = myGlobe.scene();
    
    // Remove default lights
    scene.children.forEach((child: any) => {
      if (child.isLight && child.type === 'AmbientLight') {
        scene.remove(child);
      }
    });
    
    // Add dim ambient light
    const ambientLight = new THREE.AmbientLight(0x222244, 0.3);
    scene.add(ambientLight);
    
    // Add directional light from sun position
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
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

    // Optimize renderer settings
    const renderer = myGlobe.renderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Lower pixel ratio for faster rendering
    
    // Set initial view focused on Vietnam - instant, no animation
    myGlobe.pointOfView({ lat: 16, lng: 106, altitude: 2 }, 0);
    const controls = myGlobe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 101;
    controls.maxDistance = 500;

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