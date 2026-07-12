import React, { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Star {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  opacity: number;
  baseOpacity: number;
  layer: 1 | 2 | 3;
}

// Pre-computed color strings at module level — zero per-frame string allocation for star colors
const DARK_DOT_COLORS: string[] = [];
const LIGHT_DOT_COLORS: string[] = [];
const DARK_GLOW_COLORS: string[] = [];
const LIGHT_GLOW_COLORS: string[] = [];
for (let i = 0; i <= 10; i++) {
  const o = i / 10;
  DARK_DOT_COLORS.push(`rgba(255,255,255,${o})`);
  LIGHT_DOT_COLORS.push(`rgba(220,160,40,${o})`);
  DARK_GLOW_COLORS.push(`rgba(255,255,255,${(o * 0.14).toFixed(3)})`);
  LIGHT_GLOW_COLORS.push(`rgba(255,160,30,${(o * 0.18).toFixed(3)})`);
}

const StarfieldBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
    if (canvasRef.current) {
      canvasRef.current.style.backgroundColor = theme === 'light' ? '#ffffff' : '#0a0a0a';
    }
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    let W = window.innerWidth;
    let H = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    const resizeCanvas = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * pixelRatio);
      canvas.height = Math.floor(H * pixelRatio);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    resizeCanvas();
    let resizeTimer: ReturnType<typeof setTimeout>;
    let requestStaticDraw = () => {};
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeCanvas();
        requestStaticDraw();
      }, 200);
    };
    window.addEventListener('resize', onResize);

    // --- Stars ---
    const numStars = isMobile ? 80 : 150;
    const stars: Star[] = [];

    for (let i = 0; i < numStars; i++) {
      const layer = (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3;
      const bx = Math.random() * W;
      const by = Math.random() * H;
      const baseOpacity = Math.random() * 0.5 + 0.2;
      stars.push({
        x: bx, y: by,
        baseX: bx, baseY: by,
        radius: layer === 3 ? Math.random() * 1.8 + 0.8 : Math.random() * 1.2 + 0.3,
        opacity: baseOpacity,
        baseOpacity,
        layer,
      });
    }

    // --- Scroll parallax ---
    const scrollY = window.scrollY;

    // --- Pre-allocated structures — zero per-frame heap allocations ---
    const BUCKET_COUNT = 11; // opacity quantized to 0.0, 0.1, ..., 1.0
    const dotBuckets: Star[][] = Array.from({ length: BUCKET_COUNT }, () => []);
    const glowBuckets: Star[][] = Array.from({ length: BUCKET_COUNT }, () => []);

    // --- Static draw ---
    let rafId: number;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      const scrollOffsets = [0, scrollY * 0.015, scrollY * 0.03, scrollY * 0.06];
      const isLight = themeRef.current === 'light';

      // --- Update stars + build opacity buckets (single pass) ---
      for (let bi = 0; bi < BUCKET_COUNT; bi++) {
        dotBuckets[bi].length = 0;
        glowBuckets[bi].length = 0;
      }

      for (const star of stars) {
        const tx = star.baseX;
        const ty = star.baseY - scrollOffsets[star.layer];
        star.opacity += (star.baseOpacity - star.opacity) * 0.05;
        star.x = tx;
        star.y = ty;

        // Slot into opacity bucket (clamped to [0, 10])
        const bi = Math.min(Math.round(star.opacity * 10), 10);
        dotBuckets[bi].push(star);
        if (star.layer === 3) glowBuckets[bi].push(star);
      }

      // --- Draw Pass 1: layer-3 glow halos — ONE fill() per opacity bucket ---
      for (let bi = 0; bi < BUCKET_COUNT; bi++) {
        const group = glowBuckets[bi];
        if (group.length === 0) continue;
        ctx.fillStyle = isLight ? LIGHT_GLOW_COLORS[bi] : DARK_GLOW_COLORS[bi];
        ctx.beginPath();
        for (const star of group) {
          ctx.moveTo(star.x + star.radius * 3, star.y);
          ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // --- Draw Pass 2: all star dots — ONE fill() per opacity bucket ---
      for (let bi = 0; bi < BUCKET_COUNT; bi++) {
        const group = dotBuckets[bi];
        if (group.length === 0) continue;
        ctx.fillStyle = isLight ? LIGHT_DOT_COLORS[bi] : DARK_DOT_COLORS[bi];
        ctx.beginPath();
        for (const star of group) {
          ctx.moveTo(star.x + star.radius, star.y);
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      rafId = 0;
    };

    let hasDrawn = false;
    const drawOnce = () => {
      if (hasDrawn || document.hidden) return;
      hasDrawn = true;
      rafId = requestAnimationFrame(draw);
    };
    requestStaticDraw = () => {
      hasDrawn = false;
      drawOnce();
    };

    const handleVisibilityChange = () => {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else {
        drawOnce();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    drawOnce();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        backgroundColor: theme === 'light' ? '#ffffff' : '#0a0a0a',
        transition: 'background-color 0.5s ease',
      }}
    />
  );
};

export default StarfieldBackground;
