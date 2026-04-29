import React, { useEffect, useRef } from 'react';
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

  float fbm2(vec3 p){
    float v=0.0,a=0.5;
    for(int i=0;i<2;i++){v+=a*snoise(p);p=p*2.2+vec3(5.2+float(i),1.3,4.7-float(i));a*=0.48;}
    return v;
  }
  float fbm3(vec3 p){
    float v=0.0,a=0.5;
    for(int i=0;i<3;i++){v+=a*snoise(p);p=p*2.2+vec3(5.2+float(i),1.3,4.7-float(i));a*=0.48;}
    return v;
  }

  void main(){
    vec3 p=vObjPos;
    // Slow domain warp (3× slower than before for calmer surface motion)
    vec3 q=vec3(
      fbm2(p*1.3+vec3(uTime*0.018,0.0,0.0)),
      fbm2(p*1.3+vec3(0.0,uTime*0.014,3.8)),
      0.0
    );
    float n=fbm3(p*1.9+2.5*q+uTime*0.004);
    n=clamp(n*0.5+0.5,0.0,1.0);

    // Sunspots drift very slowly
    vec3 s1=normalize(vec3(sin(uTime*0.012)*0.65,cos(uTime*0.009)*0.50,0.60));
    vec3 s2=normalize(vec3(cos(uTime*0.016)*0.42,sin(uTime*0.013)*0.72,0.65));
    vec3 s3=normalize(vec3(sin(uTime*0.014)*0.58,cos(uTime*0.019)*0.35,0.55));
    float spots=clamp(
      smoothstep(0.22,0.0,distance(vObjPos,s1))+
      smoothstep(0.16,0.0,distance(vObjPos,s2))+
      smoothstep(0.13,0.0,distance(vObjPos,s3)),
      0.0,1.0);

    // Vivid fire palette: dark crimson → deep orange → bright orange → warm yellow → white-hot
    vec3 c0=vec3(0.38,0.04,0.00);
    vec3 c1=vec3(0.92,0.18,0.00);
    vec3 c2=vec3(1.00,0.45,0.03);
    vec3 c3=vec3(1.00,0.76,0.12);
    vec3 c4=vec3(1.00,0.97,0.88);
    vec3 col=c0;
    col=mix(col,c1,smoothstep(0.00,0.28,n));
    col=mix(col,c2,smoothstep(0.25,0.55,n));
    col=mix(col,c3,smoothstep(0.52,0.78,n));
    col=mix(col,c4,smoothstep(0.74,1.00,n));
    col=mix(col,vec3(0.18,0.02,0.00),spots*0.92);
    float mu=clamp(vMvNormal.z,0.0,1.0);
    // Quadratic limb darkening (Milne's law: I = 1 - a(1-μ) - b(1-μ²), a≈0.3, b≈0.25)
    float limb_dark = 1.0 - 0.30*(1.0-mu) - 0.25*(1.0-mu*mu);
    col *= limb_dark;
    // Rim emission: hot orange-white chromosphere edge
    col += vec3(1.0, 0.50, 0.06) * pow(1.0-mu, 5.0) * 1.3;
    gl_FragColor=vec4(col,1.0);
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

// CORONA_FRAG: organic flame-tongue corona — sin-based (zero snoise).
// Each shell has 12 flame tongues with variable width, extent, and flicker.
// Much more natural-looking than clean geometric streamers.
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
    float base  = pow(limb, uFalloff) * uStrength;

    // 12 organic flame tongues — variable width, drift, and extent
    float flames = 0.0;
    for (int k = 0; k < 12; k++) {
      float kf  = float(k);
      // Very slow angular drift + per-tongue golden-ratio offset
      float ta  = kf * 0.5236 + uTime * 0.0018 + 0.5 * sin(kf * 1.618 + uTime * 0.004);
      float da  = mod(angle - ta + 3.14159, 6.28318) - 3.14159;
      // Width varies per-tongue and breathes slowly
      float tw  = 0.30 + 0.22 * sin(kf * 2.1 + uTime * 0.006);
      float aw  = exp(-da * da / (tw * tw));
      // Radial reach: some tongues extend far, others stay close
      float ext = 0.55 + 0.45 * sin(kf * 1.3 + uTime * 0.007);
      // Flame profile: rises from solar edge, peaks at midpoint, fades out
      float fp  = smoothstep(0.10, 0.5 * ext, limb) * smoothstep(1.0, 0.35 * ext, limb);
      // Per-tongue flicker
      float intf = 0.70 + 0.30 * sin(kf * 0.9 + uTime * 0.013);
      flames += aw * fp * intf;
    }
    flames *= 0.72;

    float g = base + flames;

    // Inner shell: plasma prominence arches (close to solar surface)
    if (uIsInner > 0.5) {
      float proms = 0.0;
      for (int k = 0; k < 6; k++) {
        float kf = float(k);
        float pa = kf * 1.0472 + uTime * 0.006;
        float da = mod(angle - pa + 3.14159, 6.28318) - 3.14159;
        float pn = 0.55 + 0.45 * sin(kf * 2.618 + uTime * 0.025);
        float pw = 0.18 + 0.10 * sin(kf * 1.4 + uTime * 0.008);
        proms += smoothstep(pw, 0.0, abs(da)) * pow(limb, 4.5) * (1.6 + pn);
      }
      g += proms * 0.55;
    }

    // Slow breath
    float breath = 0.88 + 0.12 * sin(uTime * 0.28 + vObjPos.x * 2.3 + vObjPos.y * 1.8);
    g *= breath;

    gl_FragColor = vec4(uColor * g, clamp(g * 0.90, 0.0, 1.0));
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

const SunViz: React.FC = () => {
  const outerRef   = useRef<HTMLDivElement>(null);
  const mountRef   = useRef<HTMLDivElement>(null);
  const haloRef    = useRef<HTMLDivElement>(null);
  const atmosphereRef = useRef<HTMLDivElement>(null);
  const pausedRef  = useRef(true);
  const gsapCtxRef   = useRef<ReturnType<typeof gsap.context> | null>(null);
  const tweensRef    = useRef<gsap.core.Tween[]>([]);
  const gsapInitRef  = useRef(false);

  // ── Three.js ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const dev   = detectDeviceCapability();
    const segs  = dev.isMobile ? 32 : 52;
    let animId: number;
    let mounted = true;
    const w = container.clientWidth  || window.innerWidth  || 800;
    const h = container.clientHeight || window.innerHeight || 600;

    const renderer = new THREE.WebGLRenderer({
      alpha: true, antialias: true, powerPreference: 'high-performance',
    });
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

    // chromosphere – bright orange-white, plasma prominences
    addCorona(114, Math.min(segs, 48), 3.8, 1.2, new THREE.Color(1.00, 0.42, 0.02), 1);
    // inner flame corona – orange-red
    addCorona(148, Math.min(segs, 36), 2.6, 1.6, new THREE.Color(1.00, 0.25, 0.01));
    // mid corona – deep orange-red
    addCorona(195, Math.min(segs, 24), 1.3, 2.2, new THREE.Color(0.88, 0.14, 0.01));
    // outer corona – deep crimson
    if (!dev.isMobile) {
      addCorona(255, Math.min(segs, 16), 0.55, 3.0, new THREE.Color(0.60, 0.06, 0.00));
    }

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

    // Layer 1: chromosphere — tight hot white-orange ring at solar limb
    addAtmo(105, Math.min(segs, 64), new THREE.Color(1.00, 0.60, 0.12), 2.2, 3.0);
    // Layer 2: inner atmosphere — warm orange
    addAtmo(118, Math.min(segs, 52), new THREE.Color(1.00, 0.32, 0.03), 1.5, 2.2);
    // Layer 3: mid atmosphere — orange-red
    addAtmo(142, Math.min(segs, 40), new THREE.Color(0.90, 0.16, 0.01), 0.90, 1.6);
    // Layer 4: outer glow — deep crimson, wide falloff
    addAtmo(178, Math.min(segs, 32), new THREE.Color(0.58, 0.06, 0.00), 0.48, 1.1);
    if (!dev.isMobile) {
      // Layer 5: faint red haze — desktop only
      addAtmo(225, Math.min(segs, 20), new THREE.Color(0.30, 0.02, 0.00), 0.20, 0.80);
    }

    const clock    = new THREE.Clock();
    const FRAME_MS = 1000 / 40; // 40fps cap
    let lastTs     = 0;

    const animate = (ts: number) => {
      animId = requestAnimationFrame(animate);
      if (!mounted) return;
      if (document.hidden || pausedRef.current) return;
      if (ts - lastTs < FRAME_MS) return;
      lastTs = ts;
      const t = clock.getElapsedTime();
      sunMat.uniforms.uTime.value = t;
      coronas.forEach(({ mat }) => { mat.uniforms.uTime.value = t; });
      sunMesh.rotation.y = t * 0.022;
      sunMesh.rotation.z = Math.sin(t * 0.012) * 0.045;
      renderer.render(scene, camera);
    };
    requestAnimationFrame(animate);

    // ── Shader pre-warm ────────────────────────────────────────────────────────
    // WebGL compiles GLSL shaders synchronously on the FIRST renderer.render() call.
    // Since the loop skips frames while paused (dark mode), shaders are never compiled
    // until the user toggles to light mode → ~200–400ms jank spike on first switch.
    //
    // Fix: call renderer.render() once during browser idle time (~1.5s after mount).
    // The canvas is still hidden, so the user sees nothing, but shaders are compiled.
    // After this, the first visible frame is instant.
    const warmId = (window as any).requestIdleCallback
      ? (window as any).requestIdleCallback(
          () => { if (mounted) renderer.render(scene, camera); },
          { timeout: 3000 },
        )
      : setTimeout(() => { if (mounted) renderer.render(scene, camera); }, 1500);

    const ro = new ResizeObserver(() => {
      if (!container || !mounted) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(container);

    return () => {
      mounted = false;
      cancelAnimationFrame(animId);
      if ((window as any).requestIdleCallback) {
        (window as any).cancelIdleCallback(warmId);
      } else {
        clearTimeout(warmId as unknown as number);
      }
      ro.disconnect();
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

  // ── GSAP entrance + continuous animations ────────────────────────────────────
  useEffect(() => {
    const onTheme = () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      pausedRef.current = !isLight;

      if (!isLight) {
        tweensRef.current.forEach(t => t.pause());
        return;
      }

      if (gsapInitRef.current) {
        // Already initialised — resume continuous tweens from where they left off
        tweensRef.current.forEach(t => t.resume());
        return;
      }

      // First time unpaused: run entrance once, then start perpetual animations
      gsapInitRef.current = true;
      const ctx = gsap.context(() => {
        // Entrance: scale + fade-in (runs only once)
        gsap.fromTo(
          outerRef.current,
          { opacity: 0, scale: 0.76 },
          { opacity: 1, scale: 1, duration: 1.9, ease: 'expo.out', clearProps: 'scale' }
        );

        // Continuous tweens stored so we can pause/resume them
        tweensRef.current = [
          // Halo: breathing scale + opacity pulse
          gsap.to(haloRef.current, {
            scale:    1.12,
            opacity:  0.75,
            duration: 9.0,
            yoyo:     true,
            repeat:   -1,
            ease:     'sine.inOut',
            delay:    0.8,
            transformOrigin: '50% 50%',
          }),
          // Outer atmosphere: very slow breathing to simulate solar wind pulses
          gsap.to(atmosphereRef.current, {
            scale:    1.08,
            opacity:  0.55,
            duration: 12.0,
            yoyo:     true,
            repeat:   -1,
            ease:     'sine.inOut',
            delay:    2.0,
            transformOrigin: '50% 50%',
          }),
        ];
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

      <div
        ref={haloRef}
        style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%,-50%)',
          width:         '90vh',
          height:        '90vh',
          borderRadius:  '50%',
          background:    'radial-gradient(circle, rgba(255,210,80,0.14) 0%, rgba(255,130,20,0.10) 30%, rgba(220,70,5,0.06) 55%, transparent 72%)',
          filter:        'blur(14px)',
          willChange:    'transform',
          pointerEvents: 'none',
        }}
      />

      {/* Outer atmosphere — subtle warm ambient tone, tight around sphere */}
      <div
        ref={atmosphereRef}
        style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%,-50%)',
          width:         '150vh',
          height:        '150vh',
          borderRadius:  '50%',
          background:    'radial-gradient(circle, transparent 25%, rgba(200,55,5,0.04) 40%, rgba(140,28,2,0.07) 58%, rgba(80,12,1,0.04) 72%, transparent 82%)',
          filter:        'blur(22px)',
          willChange:    'transform',
          pointerEvents: 'none',
          opacity:       0.45,
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
