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
  layer: 1 | 2 | 3; // parallax layer (1=far, 3=near)
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
}

const StarfieldBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const themeRef = useRef(theme);

  // Keep themeRef in sync without restarting animation
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
    window.addEventListener('resize', resizeCanvas);

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
      const angle = (Math.random() * 30 + 15) * (Math.PI / 180); // 15–45deg downward
      const speed = Math.random() * 8 + 6;
      shootingStars.push({
        x: Math.random() * W * 0.8,
        y: Math.random() * H * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: Math.random() * 120 + 60,
        opacity: 1,
        life: 0,
        maxLife: Math.random() * 40 + 30,
      });
    };

    // Spawn shooting star every 4–8 seconds
    const shootingStarInterval = setInterval(() => {
      if (!document.hidden) spawnShootingStar();
    }, Math.random() * 4000 + 4000);

    // --- Mouse state ---
    const mouse = { x: -9999, y: -9999 };
    const REPEL_RADIUS = isMobile ? 80 : 130;
    const REPEL_STRENGTH = isMobile ? 18 : 30;
    const CONSTELLATION_RADIUS = isMobile ? 100 : 160;

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);

    // --- Scroll parallax ---
    let scrollY = window.scrollY;
    const onScroll = () => { scrollY = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });

    // --- Animation loop ---
    let rafId: number;
    let frame = 0;
    let isPaused = document.hidden;
    let lastTimestamp = 0;
    const TARGET_FPS = 40;
    const FRAME_MS = 1000 / TARGET_FPS;
    const REPEL_RADIUS_SQ = REPEL_RADIUS * REPEL_RADIUS;
    const CONSTELLATION_RADIUS_SQ = CONSTELLATION_RADIUS * CONSTELLATION_RADIUS;
    const CONSTELLATION_LINK_SQ = (CONSTELLATION_RADIUS * 0.7) * (CONSTELLATION_RADIUS * 0.7);

    const animate = (timestamp: number) => {
      // FPS cap: skip frame if not enough time has elapsed
      const elapsed = timestamp - lastTimestamp;
      if (elapsed < FRAME_MS) {
        rafId = requestAnimationFrame(animate);
        return;
      }
      lastTimestamp = timestamp - (elapsed % FRAME_MS);
      frame++;

      ctx.clearRect(0, 0, W, H);

      // Parallax offsets per layer (layer 1 = slowest, layer 3 = fastest)
      const scrollOffsets = [0, scrollY * 0.015, scrollY * 0.03, scrollY * 0.06];

      // --- Update & draw stars ---
      stars.forEach((star) => {
        // Drift movement
        star.baseX += star.vx;
        star.baseY += star.vy;
        if (star.baseX < 0) star.baseX = W;
        if (star.baseX > W) star.baseX = 0;
        if (star.baseY < 0) star.baseY = H;
        if (star.baseY > H) star.baseY = 0;

        // Apply scroll parallax
        let tx = star.baseX;
        let ty = star.baseY - scrollOffsets[star.layer];

        // Mouse repulsion — use squared distance to avoid sqrt in hot path
        const dx = tx - mouse.x;
        const dy = ty - mouse.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < REPEL_RADIUS_SQ && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
          const pushX = (dx / dist) * force * REPEL_STRENGTH * (star.layer * 0.4 + 0.6);
          const pushY = (dy / dist) * force * REPEL_STRENGTH * (star.layer * 0.4 + 0.6);
          tx += pushX;
          ty += pushY;
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

        // Draw glow for near-layer stars — cheap double-arc instead of expensive radialGradient
        if (star.layer === 3) {
          ctx.beginPath();
          ctx.arc(tx, ty, star.radius * 3, 0, Math.PI * 2);
          ctx.fillStyle = themeRef.current === 'light'
            ? `rgba(255,160,30,${star.opacity * 0.18})`
            : `rgba(255,255,255,${star.opacity * 0.14})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(tx, ty, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = themeRef.current === 'light'
          ? `rgba(${star.layer === 3 ? '255,130,20' : '220,160,40'},${star.opacity})`
          : `rgba(255,255,255,${star.opacity})`;
        ctx.fill();
      });

      // --- Constellation lines near mouse — only every 2nd frame to save CPU ---
      if (mouse.x > -999 && frame % 2 === 0) {
        // Use squared distance to avoid sqrt in filter
        const nearby = stars.filter((s) => {
          const dx = s.x - mouse.x;
          const dy = s.y - mouse.y;
          return dx * dx + dy * dy < CONSTELLATION_RADIUS_SQ;
        });

        // Draw lines between nearby stars (O(n²) — skip sqrt using squared threshold)
        for (let i = 0; i < nearby.length; i++) {
          for (let j = i + 1; j < nearby.length; j++) {
            const a = nearby[i];
            const b = nearby[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < CONSTELLATION_LINK_SQ) {
              const d = Math.sqrt(dSq);
              const alpha = (1 - d / (CONSTELLATION_RADIUS * 0.7)) * 0.25;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = themeRef.current === 'light'
                ? `rgba(200,100,20,${alpha})`
                : `rgba(220,38,38,${alpha})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }

        // Lines from mouse to nearby stars
        nearby.slice(0, 5).forEach((s) => {
          const dx = s.x - mouse.x;
          const dy = s.y - mouse.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const alpha = (1 - d / CONSTELLATION_RADIUS) * 0.18;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(s.x, s.y);
          ctx.strokeStyle = themeRef.current === 'light'
            ? `rgba(200,100,20,${alpha})`
            : `rgba(220,38,38,${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        });
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

        const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        const tailX = s.x - (s.vx / speed) * s.length;
        const tailY = s.y - (s.vy / speed) * s.length;

        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        if (themeRef.current === 'light') {
          grad.addColorStop(0, `rgba(255,180,30,0)`);
          grad.addColorStop(0.6, `rgba(255,140,20,${s.opacity * 0.6})`);
          grad.addColorStop(1, `rgba(255,220,80,${s.opacity})`);
        } else {
          grad.addColorStop(0, `rgba(255,255,255,0)`);
          grad.addColorStop(0.6, `rgba(255,200,200,${s.opacity * 0.6})`);
          grad.addColorStop(1, `rgba(255,255,255,${s.opacity})`);
        }

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Bright head
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = themeRef.current === 'light'
          ? `rgba(255,220,80,${s.opacity})`
          : `rgba(255,255,255,${s.opacity})`;
        ctx.fill();
      }

      // Schedule next frame at the end — only while active
      rafId = requestAnimationFrame(animate);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Explicitly cancel so the browser doesn't resume the old rAF automatically,
        // which would create a duplicate loop when we restart below.
        isPaused = true;
        cancelAnimationFrame(rafId);
      } else {
        isPaused = false;
        lastTimestamp = 0; // reset so first frame isn't skipped
        rafId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start loop only if tab is currently visible
    if (!isPaused) {
      rafId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(shootingStarInterval);
      window.removeEventListener('resize', resizeCanvas);
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
