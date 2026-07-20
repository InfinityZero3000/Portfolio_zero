import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { detectDeviceCapability } from '../utils/texture-optimizer';

// ─── Simplex Noise 3D (Ashima Arts, public domain) ───────────────────────────
const NOISE_GLSL = `
vec3 _m289v3(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 _m289v4(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 _perm(vec4 x){return _m289v4(((x*34.0)+10.0)*x);}
vec4 _tiSq(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=_m289v3(i);
  vec4 p=_perm(_perm(_perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=_tiSq(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

// ─── Sun surface shaders ──────────────────────────────────────────────────────
const SURFACE_VERT = `
  varying vec3 vObjPos;
  varying vec3 vMvNormal;
  void main(){
    vObjPos   = normalize(position);
    vMvNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;

const SURFACE_FRAG = `
  ${NOISE_GLSL}
  uniform float uTime;
  varying vec3 vObjPos;
  varying vec3 vMvNormal;

  float fbm3(vec3 p){
    float v=0.0,a=0.5;
    for(int i=0;i<3;i++){v+=a*snoise(p);p=p*2.1+vec3(5.2+float(i),1.3,4.7-float(i));a*=0.50;}
    return v;
  }
  float fbm5(vec3 p){
    float v=0.0,a=0.5;
    for(int i=0;i<5;i++){v+=a*snoise(p);p=p*2.1+vec3(5.2+float(i),1.3,4.7-float(i));a*=0.50;}
    return v;
  }

  void main(){
    vec3 p = vObjPos;

    // ── Domain-warp turbulence (active fire convection) ──────────────────────
    vec3 q = vec3(
      fbm3(p*2.2 + vec3(uTime*0.055,  0.0,        0.0)),
      fbm3(p*2.2 + vec3(0.0,          uTime*0.048, 3.8)),
      fbm3(p*2.2 + vec3(1.72,         3.10,        uTime*0.038))
    );
    float n = fbm5(p*2.8 + 3.2*q + uTime*0.018);
    n = n * 0.5 + 0.5;

    // ── Granulation layer (photosphere convection cells) ─────────────────────
    // Granules = slightly brighter convective blobs against dark intergranular lanes.
    // Modulated by base n so they only appear in the hotter mid-tones.
    float gran = snoise(p * 5.5 + vec3(uTime * 0.032, 0.0, uTime * 0.025));
    float granMask = smoothstep(0.15, 0.70, n); // only modulate mid-bright areas
    gran = smoothstep(-0.30, 0.80, gran) * granMask;
    n = n + gran * 0.18;  // additive — granules only brighten, not desaturate
    n = clamp(n, 0.0, 1.0);

    // ── Sunspots (slowly drifting dark umbra) ────────────────────────────────
    vec3 s1 = normalize(vec3(sin(uTime*0.012)*0.65, cos(uTime*0.009)*0.50, 0.60));
    vec3 s2 = normalize(vec3(cos(uTime*0.016)*0.42, sin(uTime*0.013)*0.72, 0.65));
    float spots = clamp(
      smoothstep(0.20, 0.0, distance(vObjPos, s1)) +
      smoothstep(0.14, 0.0, distance(vObjPos, s2)),
      0.0, 1.0);

    // ── Fire palette: near-black embers → deep crimson → orange → yellow → white-hot
    // Calibrated against NASA solar photography (SDO/HMI continuum images).
    vec3 c0 = vec3(0.04, 0.00, 0.00); // embers / intergranular lanes
    vec3 c1 = vec3(0.70, 0.05, 0.00); // deep crimson
    vec3 c2 = vec3(1.00, 0.38, 0.02); // orange (most of surface)
    vec3 c3 = vec3(1.00, 0.70, 0.08); // yellow-orange granule tops
    vec3 c4 = vec3(1.00, 0.95, 0.75); // white-hot center
    vec3 col = c0;
    col = mix(col, c1, smoothstep(0.00, 0.20, n));
    col = mix(col, c2, smoothstep(0.18, 0.48, n));
    col = mix(col, c3, smoothstep(0.45, 0.74, n));
    col = mix(col, c4, smoothstep(0.70, 1.00, n));

    // Apply sunspot darkening
    col = mix(col, vec3(0.02, 0.00, 0.00), spots * 0.96);

    // ── Milne quadratic limb darkening ──────────────────────────────────────
    // Physically: I(μ) = 1 - u(1-μ) - v(1-μ²), u+v≈1 (Milne 1921)
    float mu = clamp(vMvNormal.z, 0.0, 1.0);
    float limb_dark = 1.0 - 0.38*(1.0-mu) - 0.28*(1.0-mu*mu);
    col *= limb_dark;

    // ── Chromosphere rim emission (noisy, flickering) ────────────────────────
    // Hot plasma at the visible edge of the photosphere.
    float rimNoise = snoise(vObjPos * 12.0 + vec3(uTime*0.32, 0.0, uTime*0.26)) * 0.5 + 0.5;
    col += vec3(1.00, 0.62, 0.10) * pow(1.0-mu, 3.5) * (0.9 + rimNoise * 1.2);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Corona shaders (improved: angular streamers + plasma loops) ─────────────
const CORONA_VERT = `
  varying vec3 vNormal;
  varying vec3 vObjPos;
  void main(){
    vNormal  = normalize(normalMatrix * normal);
    vObjPos  = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// CORONA_FRAG: tight photospheric spicules + plasma prominences.
// 8 short narrow tongues, ext capped to 0.14 — they hug the solar limb.
// No tongue escapes more than ~14% of sun radius from the surface.
const CORONA_FRAG = `
  uniform float uStrength;
  uniform float uFalloff;
  uniform vec3  uColor;
  uniform float uTime;
  uniform float uIsInner;
  varying vec3 vNormal;
  varying vec3 vObjPos;

  void main(){
    float limb  = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float angle = atan(vObjPos.y, vObjPos.x);

    // Tight base falloff — concentrated right at the solar limb
    float base  = pow(limb, uFalloff) * uStrength;

    // 8 tight spicule-like jets — very short, very fast
    float flames = 0.0;
    for (int k = 0; k < 8; k++) {
      float kf    = float(k);
      float phase = kf * 0.7854 + uTime * 0.025 + 0.60 * sin(kf * 1.618 + uTime * 0.055);
      float da    = mod(angle - phase + 3.14159, 6.28318) - 3.14159;
      // Very narrow — spicules are thin bright jets
      float tw    = 0.10 + 0.06 * sin(kf * 2.3 + uTime * 0.08);
      float aw    = exp(-da * da / (tw * tw));
      // TIGHT radial reach: 0.04 – 0.14 above solar surface (no off-screen bleed)
      float ext   = 0.04 + 0.10 * abs(sin(kf * 1.5 + uTime * 0.065 + sin(uTime * 0.030 + kf)*1.8));
      // Flame tip profile: bright at base, tapers sharply to zero at tip
      float base_fade = smoothstep(0.0, 0.06, limb);
      float tip_fade  = pow(max(0.0, 1.0 - limb / max(0.005, ext)), 3.5);
      float fp = base_fade * tip_fade;
      // Rapid instability flicker
      float flick = 0.30 + 0.70 * abs(sin(kf * 0.91 + uTime * 0.22 + sin(uTime * 0.12 + kf * 0.7) * 2.5));
      flames += aw * fp * flick;
    }
    flames *= 1.10;

    float g = base + flames;

    // Plasma prominences — only on the innermost chromosphere shell
    if (uIsInner > 0.5) {
      float proms = 0.0;
      for (int k = 0; k < 5; k++) {
        float kf = float(k);
        float pa = kf * 1.2566 + uTime * 0.022;
        float da = mod(angle - pa + 3.14159, 6.28318) - 3.14159;
        float pn = 0.50 + 0.50 * sin(kf * 2.618 + uTime * 0.080);
        float pw = 0.10 + 0.06 * sin(kf * 1.4 + uTime * 0.030);
        // Prominences hug close to surface (pow limb, 5.5)
        proms += smoothstep(pw, 0.0, abs(da)) * pow(limb, 5.5) * (1.5 + pn);
      }
      g += proms * 0.80;
    }

    // Global shimmer
    float shimmer = 0.82 + 0.18 * sin(uTime * 0.85 + vObjPos.x * 4.2 + vObjPos.y * 3.1);
    g *= shimmer;

    gl_FragColor = vec4(uColor * g, clamp(g * 0.92, 0.0, 1.0));
  }
`;

// ─── Fresnel atmosphere shader (limb glow) ───────────────────────────────────
// Industry-standard approach: glow is maximum at grazing angles (edges),
// zero at center, perfectly follows the sphere — no ring artifacts.
const ATMO_VERT = `
  varying vec3 vNormal;
  void main(){
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMO_FRAG = `
  uniform float uStrength;
  uniform float uFalloff;
  uniform vec3  uColor;
  varying vec3 vNormal;

  void main(){
    // Fresnel limb glow: 0 at center, max at edges
    float mu  = abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
    float rim = pow(1.0 - mu, uFalloff) * uStrength;
    // Soft inner fill (chromosphere warmth near limb)
    float fill = pow(1.0 - mu, uFalloff * 2.2) * uStrength * 0.18;
    float g = rim + fill;
    gl_FragColor = vec4(uColor * g, clamp(g, 0.0, 1.0));
  }
`;


// ─── Component ────────────────────────────────────────────────────────────────

interface SunVizProps {
  onReady?: () => void;
  onError?: (error: Error) => void;
}

const SunViz: React.FC<SunVizProps> = ({ onReady, onError }) => {
  const outerRef   = useRef<HTMLDivElement>(null);
  const mountRef   = useRef<HTMLDivElement>(null);
  const haloRef    = useRef<HTMLDivElement>(null);
  const pausedRef  = useRef(true);
  const visibleRef = useRef(true);  // IntersectionObserver state
  const loopControlRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const gsapCtxRef   = useRef<ReturnType<typeof gsap.context> | null>(null);
  const tweensRef    = useRef<gsap.core.Tween[]>([]);
  const gsapInitRef  = useRef(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onReady, onError]);

  // ── Three.js ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const dev   = detectDeviceCapability();
    const segs  = dev.isMobile ? 32 : 52;
    let animId: number;
    let mounted = true;
    let failed = false;
    const w = container.clientWidth  || window.innerWidth  || 800;
    const h = container.clientHeight || window.innerHeight || 600;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true, antialias: true, powerPreference: 'high-performance',
      });
    } catch (value) {
      const error = value instanceof Error ? value : new Error(String(value));
      setRenderError(error.message || 'WebGL initialization failed');
      onErrorRef.current?.(error);
      return;
    }
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, dev.isMobile ? 1.0 : 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;
    try { (renderer as any).outputColorSpace = 'srgb'; } catch (_) {}
    renderer.domElement.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    container.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 2000);
    camera.position.set(0, 0, 300);

    // Sun surface
    const sunGeo = new THREE.SphereGeometry(100, segs, segs);
    const sunMat = new THREE.ShaderMaterial({
      uniforms:       { uTime: { value: 0 } },
      vertexShader:   SURFACE_VERT,
      fragmentShader: SURFACE_FRAG,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);

    // Corona shells – using improved shader with angular streamers
    type CE = { geo: THREE.SphereGeometry; mat: THREE.ShaderMaterial };
    const coronas: CE[] = [];

    const addCorona = (
      r: number, s: number,
      strength: number, falloff: number,
      color: THREE.Color, isInner = 0,
    ) => {
      const geo = new THREE.SphereGeometry(r, s, s);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uStrength: { value: strength },
          uFalloff:  { value: falloff  },
          uColor:    { value: color    },
          uTime:     { value: 0        },
          uIsInner:  { value: isInner  },
        },
        vertexShader:   CORONA_VERT,
        fragmentShader: CORONA_FRAG,
        blending:       THREE.AdditiveBlending,
        side:           THREE.BackSide,
        transparent:    true,
        depthWrite:     false,
      });
      scene.add(new THREE.Mesh(geo, mat));
      coronas.push({ geo, mat });
    };

    // chromosphere – sits just above photosphere, plasma prominences ON
    addCorona(104, Math.min(segs, 48), 3.5, 2.0, new THREE.Color(1.00, 0.55, 0.08), 1);
    // spicule layer – thin bright jets, hugs surface
    addCorona(110, Math.min(segs, 36), 1.8, 2.8, new THREE.Color(1.00, 0.75, 0.20));

    // ── Fresnel atmosphere layers — tight limb-glow halos ────────────────────
    type AE = { geo: THREE.SphereGeometry; mat: THREE.ShaderMaterial };
    const atmos: AE[] = [];

    const addAtmo = (
      r: number, s: number,
      color: THREE.Color, strength: number, falloff: number,
    ) => {
      const geo = new THREE.SphereGeometry(r, s, s);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uStrength: { value: strength },
          uFalloff:  { value: falloff  },
          uColor:    { value: color    },
        },
        vertexShader:   ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        blending:       THREE.AdditiveBlending,
        side:           THREE.BackSide,
        transparent:    true,
        depthWrite:     false,
      });
      scene.add(new THREE.Mesh(geo, mat));
      atmos.push({ geo, mat });
    };

    // Blazing yellow-white chromosphere rim — tight, very high Fresnel falloff
    addAtmo(102, Math.min(segs, 64), new THREE.Color(1.00, 0.82, 0.30), 4.5, 9.0);
    // Orange inner halo — just beyond photosphere
    addAtmo(107, Math.min(segs, 52), new THREE.Color(1.00, 0.48, 0.06), 2.8, 7.0);
    // Faint orange-red halo — max 14% beyond sun radius (r=114), invisible at edges
    addAtmo(114, Math.min(segs, 40), new THREE.Color(0.80, 0.20, 0.02), 1.2, 5.5);

    const clock    = new THREE.Clock();
    const safeRender = () => {
      if (!mounted || failed) return false;
      try {
        renderer.render(scene, camera);
        return true;
      } catch (value) {
        failed = true;
        const error = value instanceof Error ? value : new Error(String(value));
        setRenderError(error.message || 'Sun rendering failed');
        onErrorRef.current?.(error);
        return false;
      }
    };

    const renderSun = () => {
      if (!mounted || failed || document.hidden || pausedRef.current || !visibleRef.current) return;
      const t = clock.getElapsedTime();
      sunMat.uniforms.uTime.value = t;
      coronas.forEach(({ mat }) => { mat.uniforms.uTime.value = t; });
      sunMesh.rotation.y = t * 0.022;
      sunMesh.rotation.z = Math.sin(t * 0.012) * 0.045;
      safeRender();
    };

    const stopLoop  = () => { cancelAnimationFrame(animId); animId = 0; };
    const startLoop = () => {
      if (!animId) {
        animId = requestAnimationFrame(() => {
          animId = 0;
          renderSun();
        });
      }
    };

    // Expose to other effects via ref
    loopControlRef.current = { start: startLoop, stop: stopLoop };
    startLoop();

    // Compile shaders behind the loader, then report the first complete frame.
    const readyFrame = requestAnimationFrame(() => {
      if (!mounted) return;
      if (safeRender()) {
        onReadyRef.current?.();
      }
    });

    const ro = new ResizeObserver(() => {
      if (!container || !mounted) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      startLoop();
    });
    ro.observe(container);

    // Pause when home section scrolls off-screen — stops GPU work entirely
    const io = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      if (!entry.isIntersecting) stopLoop();
      else startLoop(); // startLoop checks pausedRef internally
    }, { threshold: 0 });
    io.observe(container);

    return () => {
      mounted = false;
      cancelAnimationFrame(readyFrame);
      stopLoop();
      io.disconnect();
      ro.disconnect();
      loopControlRef.current = null;
      sunGeo.dispose();
      sunMat.dispose();
      coronas.forEach(({ geo, mat }) => { geo.dispose(); mat.dispose(); });
      atmos.forEach(({ geo, mat }) => { geo.dispose(); mat.dispose(); });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── GSAP entrance ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onTheme = () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      pausedRef.current = !isLight;

      if (!isLight) {
        tweensRef.current.forEach(t => t.pause());
        loopControlRef.current?.stop(); // fully cancel rAF, not just skip
        return;
      }

      loopControlRef.current?.start(); // restart rAF if it was stopped

      if (gsapInitRef.current) {
        // Already initialised — resume continuous tweens from where they left off
        tweensRef.current.forEach(t => t.resume());
        return;
      }

      // First time unpaused: run entrance once.
      gsapInitRef.current = true;
      const ctx = gsap.context(() => {
        // Entrance: scale + fade-in (runs only once)
        gsap.fromTo(
          outerRef.current,
          { opacity: 0, scale: 0.76 },
          { opacity: 1, scale: 1, duration: 1.9, ease: 'expo.out', clearProps: 'scale' }
        );

        tweensRef.current = [];
      });

      gsapCtxRef.current = ctx;
    };

    const observer = new MutationObserver(onTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    onTheme(); // call once for initial state

    return () => observer.disconnect();
  }, []);

  // Cleanup on unmount only — do NOT revert on every paused change
  useEffect(() => {
    return () => {
      gsapCtxRef.current?.revert();
      gsapCtxRef.current = null;
    };
  }, []);

  return (
    <div
      ref={outerRef}
      className="w-full h-full absolute inset-0 z-0 overflow-hidden"
      style={{ background: 'transparent' }}
    >
      {/* Three.js canvas mount point */}
      <div ref={mountRef} className="absolute inset-0" style={{ background: 'transparent' }} />

      {renderError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-dark-900 px-6">
          <div className="max-w-md text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Visualization offline</p>
            <h2 className="mb-3 text-2xl font-extrabold text-white">Unable to render the solar scene</h2>
            <p className="mb-5 text-sm text-gray-400">{renderError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-brand-600 px-5 py-2 text-sm font-bold uppercase tracking-wider text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              Retry visualization
            </button>
          </div>
        </div>
      )}

      {/* Tight core halo — soft warm bloom directly over the sphere, no ring artifact */}
      <div
        ref={haloRef}
        style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%,-50%)',
          width:         '52vh',
          height:        '52vh',
          borderRadius:  '50%',
          background:    'radial-gradient(circle, rgba(255,210,80,0.10) 0%, rgba(255,120,20,0.05) 40%, transparent 68%)',
          filter:        'blur(8px)',
          willChange:    'auto',
          pointerEvents: 'none',
        }}
      />

      {/* Core specular bloom — screen blend works well over the opaque 3D sun surface */}
      <div
        style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%,-50%)',
          width:         '48vh',
          height:        '48vh',
          borderRadius:  '50%',
          background:    'radial-gradient(circle, rgba(255,252,215,0.55) 0%, rgba(255,228,115,0.22) 35%, transparent 65%)',
          filter:        'blur(6px)',
          mixBlendMode:  'screen',
          pointerEvents: 'none',
        }}
      />

      {/* Lens flare hot-spot — offset from center for realism */}
      <div
        style={{
          position:      'absolute',
          top:           'calc(50% - 8vh)',
          left:          'calc(50% + 7vh)',
          width:         '5vh',
          height:        '5vh',
          borderRadius:  '50%',
          background:    'radial-gradient(circle, rgba(255,255,245,0.68) 0%, transparent 70%)',
          filter:        'blur(3px)',
          mixBlendMode:  'screen',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default SunViz;
