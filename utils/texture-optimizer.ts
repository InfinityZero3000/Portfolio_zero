/**
 * Texture optimization utilities for better Globe rendering
 * Handles texture loading, caching, and quality adjustment based on device capabilities
 */

import * as THREE from 'three';

export interface TextureConfig {
  url: string;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  cache: boolean;
}

export interface DeviceCapability {
  isHighEnd: boolean;
  maxTextureSize: number;
  supportsWebGL2: boolean;
  pixelRatio: number;
  isMobile: boolean;
}

/**
 * Detect device capabilities for appropriate texture quality
 */
export function detectDeviceCapability(): DeviceCapability {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
  
  let maxTextureSize = 2048; // Conservative default
  let supportsWebGL2 = false;
  let isHighEnd = false;

  if (gl) {
    const glContext = gl as WebGLRenderingContext;
    maxTextureSize = glContext.getParameter(glContext.MAX_TEXTURE_SIZE);
    supportsWebGL2 = gl instanceof WebGL2RenderingContext;
    
    // Check GPU tier based on renderer
    const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      isHighEnd = /NVIDIA|AMD Radeon (RX|Pro)|Apple M[0-9]|Apple GPU/i.test(renderer);
    }
    
    // Consider memory and cores
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency || 2;
    if (memory && memory >= 8 && cores >= 4) {
      isHighEnd = true;
    }
  }

  return {
    isHighEnd: isHighEnd && !isMobile,
    maxTextureSize,
    supportsWebGL2,
    pixelRatio,
    isMobile,
  };
}

/**
 * Get optimal texture URLs based on device capability
 */
export function getOptimalTextureURLs(capability: DeviceCapability) {
  // Use high-resolution NASA Blue Marble textures for maximum sharpness
  // These are 8K textures from NASA's Earth Observatory
  const highResURL = 'https://unpkg.com/three-globe@2.31.0/example/img/';
  
  // Always use highest quality textures for best sharpness
  return {
    globe: `${highResURL}earth-blue-marble.jpg`, // NASA Blue Marble - highest quality available
    bump: `${highResURL}earth-topology.png`, // High detail topology map
    background: `${highResURL}night-sky.png`,
    quality: 'ultra' as const,
  };
}

/**
 * Optimize texture loading with caching
 */
const textureCache = new Map<string, THREE.Texture>();

export function loadTextureWithCache(
  url: string,
  loader: THREE.TextureLoader,
  maxAnisotropy: number = 16
): Promise<THREE.Texture> {
  // Check cache first
  if (textureCache.has(url)) {
    const cached = textureCache.get(url)!;
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        // Maximum quality texture settings for sharpness
        texture.anisotropy = maxAnisotropy;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        
        // Cache for reuse
        textureCache.set(url, texture);
        resolve(texture);
      },
      undefined,
      (error) => {
        console.error(`Failed to load texture: ${url}`, error);
        reject(error);
      }
    );
  });
}

/**
 * Preload textures for faster initial render
 */
export async function preloadTextures(urls: string[]): Promise<void> {
  const loader = new THREE.TextureLoader();
  const capability = detectDeviceCapability();
  const maxAnisotropy = capability.isHighEnd ? 16 : 4;

  try {
    await Promise.all(
      urls.map(url => loadTextureWithCache(url, loader, maxAnisotropy))
    );
  } catch (error) {
    console.warn('Failed to preload some textures:', error);
  }
}

/**
 * Clear texture cache to free memory
 */
export function clearTextureCache(): void {
  textureCache.forEach(texture => texture.dispose());
  textureCache.clear();
}

/**
 * Get optimal renderer settings based on device
 */
export function getOptimalRendererSettings(capability: DeviceCapability) {
  return {
    antialias: true, // Always enable for sharp edges
    powerPreference: 'high-performance',
    pixelRatio: window.devicePixelRatio || 2, // Use native device pixel ratio for maximum sharpness
    alpha: false, // Opaque background is faster
    stencil: false, // Not needed for globe
    depth: true,
    logarithmicDepthBuffer: false, // Usually not needed, adds overhead
  } as const;
}

/**
 * Optimize scene for performance
 */
export function optimizeScene(scene: THREE.Scene, capability: DeviceCapability): void {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      // Optimize materials
      if (object.material) {
        const material = object.material as THREE.Material;
        
        // Disable unnecessary features on low-end devices
        if (!capability.isHighEnd) {
          if ('normalMap' in material) {
            (material as any).normalMap = null;
          }
          if ('roughnessMap' in material) {
            (material as any).roughnessMap = null;
          }
        }
        
        // Enable frustum culling
        object.frustumCulled = true;
      }
      
      // Optimize geometry
      if (object.geometry) {
        object.geometry.computeBoundingSphere();
      }
    }
  });
}
