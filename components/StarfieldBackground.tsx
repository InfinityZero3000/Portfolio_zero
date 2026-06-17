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
  vx: number;
  vy: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  opacity: number;
  life: number;
  maxLife: number;
  invSpeed: number; // pre-computed 1/speed — avoids Math.sqrt per frame
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
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resizeCanvas, 200); };
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
        vx: (Math.random() - 0.5) * 0.08 * layer,
        vy: (Math.random() - 0.5) * 0.04 * layer,
      });
    }

    // --- Shooting stars ---
    const shootingStars: ShootingStar[] = [];

    const spawnShootingStar = () => {
      const angle = (Math.random() * 30 + 15) * (Math.PI / 180);
      const speed = Math.random() * 8 + 6;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      shootingStars.push({
        x: Math.random() * W * 0.8,
        y: Math.random() * H * 0.3,
        vx, vy,
        length: Math.random() * 120 + 60,
        opacity: 1,
        life: 0,
        maxLife: Math.random() * 40 + 30,
        invSpeed: 1 / speed,
      });
    };

    let shootingStarTimeout: ReturnType<typeof setTimeout>;
    const scheduleNextShootingStar = () => {
      shootingStarTimeout = setTimeout(() => {
        if (!document.hidden) spawnShootingStar();
        scheduleNextShootingStar();
      }, Math.random() * 4000 + 4000);
    };
    scheduleNextShootingStar();

    // --- Mouse state ---
    const mouse = { x: -9999, y: -9999 };
    const REPEL_RADIUS = isMobile ? 80 : 130;
    const REPEL_STRENGTH = isMobile ? 18 : 30;
    const CONSTELLATION_RADIUS = isMobile ? 100 : 160;

    const onMouseMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);

    // --- Scroll parallax ---
    let scrollY = window.scrollY;
    const onScroll = () => { scrollY = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });

    // --- Pre-allocated structures — zero per-frame heap allocations ---
    const BUCKET_COUNT = 11; // opacity quantized to 0.0, 0.1, ..., 1.0
    const dotBuckets: Star[][] = Array.from({ length: BUCKET_COUNT }, () => []);
    const glowBuckets: Star[][] = Array.from({ length: BUCKET_COUNT }, () => []);
    const nearby: Star[] = []; // reused for constellation, never reallocated

    // --- Animation loop ---
    let rafId: number;
    let frame = 0;
    let lastTimestamp = 0;
    const TARGET_FPS = 30; // 30fps is smooth enough for a decorative background
    const FRAME_MS = 1000 / TARGET_FPS;
    const REPEL_RADIUS_SQ = REPEL_RADIUS * REPEL_RADIUS;
    const CONSTELLATION_RADIUS_SQ = CONSTELLATION_RADIUS * CONSTELLATION_RADIUS;
    const CONSTELLATION_LINK_SQ = (CONSTELLATION_RADIUS * 0.7) * (CONSTELLATION_RADIUS * 0.7);

    const animate = (timestamp: number) => {
      const elapsed = timestamp - lastTimestamp;
      if (elapsed < FRAME_MS) {
        rafId = requestAnimationFrame(animate);
        return;
      }
      lastTimestamp = timestamp - (elapsed % FRAME_MS);
      frame++;

      ctx.clearRect(0, 0, W, H);

      const scrollOffsets = [0, scrollY * 0.015, scrollY * 0.03, scrollY * 0.06];
      const isLight = themeRef.current === 'light';

      // --- Update stars + build opacity buckets (single pass) ---
      for (let bi = 0; bi < BUCKET_COUNT; bi++) {
        dotBuckets[bi].length = 0;
        glowBuckets[bi].length = 0;
      }

      for (const star of stars) {
        // Drift
        star.baseX += star.vx;
        star.baseY += star.vy;
        if (star.baseX < 0) star.baseX = W;
        if (star.baseX > W) star.baseX = 0;
        if (star.baseY < 0) star.baseY = H;
        if (star.baseY > H) star.baseY = 0;

        let tx = star.baseX;
        let ty = star.baseY - scrollOffsets[star.layer];

        // Mouse repulsion
        const dx = tx - mouse.x;
        const dy = ty - mouse.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < REPEL_RADIUS_SQ && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
          const pushStr = force * REPEL_STRENGTH * (star.layer * 0.4 + 0.6);
          tx += (dx / dist) * pushStr;
          ty += (dy / dist) * pushStr;
          star.opacity = Math.min(1, star.baseOpacity + force * 0.5);
        } else {
          star.opacity += (star.baseOpacity - star.opacity) * 0.05;
        }
        star.x = tx;
        star.y = ty;

        // Twinkle every ~2s
        if (frame % 80 === Math.floor(star.baseX) % 80) {
          star.baseOpacity = Math.random() * 0.45 + 0.2;
        }

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

      // --- Constellation lines near mouse — every 2nd frame, TWO stroke() calls total ---
      if (mouse.x > -999 && frame % 2 === 0) {
        nearby.length = 0;
        for (const s of stars) {
          const dx = s.x - mouse.x;
          const dy = s.y - mouse.y;
          if (dx * dx + dy * dy < CONSTELLATION_RADIUS_SQ) nearby.push(s);
        }

        if (nearby.length > 1) {
          // All inter-star constellation lines in ONE batched stroke call
          ctx.beginPath();
          for (let i = 0; i < nearby.length; i++) {
            for (let j = i + 1; j < nearby.length; j++) {
              const a = nearby[i], b = nearby[j];
              const dx = a.x - b.x, dy = a.y - b.y;
              if (dx * dx + dy * dy < CONSTELLATION_LINK_SQ) {
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
              }
            }
          }
          ctx.strokeStyle = isLight ? 'rgba(200,100,20,0.15)' : 'rgba(220,38,38,0.15)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        if (nearby.length > 0) {
          // All mouse-to-star lines in ONE batched stroke call
          ctx.beginPath();
          const limit = Math.min(nearby.length, 5);
          for (let i = 0; i < limit; i++) {
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(nearby[i].x, nearby[i].y);
          }
          ctx.strokeStyle = isLight ? 'rgba(200,100,20,0.12)' : 'rgba(220,38,38,0.12)';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      // --- Shooting stars ---
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.opacity = 1 - s.life / s.maxLife;

        if (s.life >= s.maxLife) {
          shootingStars.splice(i, 1);
          continue;
        }

        // Use pre-computed invSpeed — avoids Math.sqrt per frame
        const tailX = s.x - s.vx * s.length * s.invSpeed;
        const tailY = s.y - s.vy * s.length * s.invSpeed;

        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        if (isLight) {
          grad.addColorStop(0, 'rgba(255,180,30,0)');
          grad.addColorStop(0.6, `rgba(255,140,20,${s.opacity * 0.6})`);
          grad.addColorStop(1, `rgba(255,220,80,${s.opacity})`);
        } else {
          grad.addColorStop(0, 'rgba(255,255,255,0)');
          grad.addColorStop(0.6, `rgba(255,200,200,${s.opacity * 0.6})`);
          grad.addColorStop(1, `rgba(255,255,255,${s.opacity})`);
        }

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = isLight
          ? `rgba(255,220,80,${s.opacity})`
          : `rgba(255,255,255,${s.opacity})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(animate);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        lastTimestamp = 0; // reset so first resumed frame isn't skipped
        rafId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!document.hidden) {
      rafId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(shootingStarTimeout);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
