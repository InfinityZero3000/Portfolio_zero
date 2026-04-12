import React, { useEffect, useRef } from 'react';

const StarfieldBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      canvas.width = Math.floor(viewportWidth * pixelRatio);
      canvas.height = Math.floor(viewportHeight * pixelRatio);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create stars
    const stars: Array<{ x: number; y: number; radius: number; opacity: number }> = [];
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const numStars = isMobile ? 90 : 150;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
      });
    }

    // Draw stars
    const drawStars = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
      });
    };

    // Twinkle effect
    let frame = 0;
    let rafId: number | null = null;
    let isPaused = document.hidden;
    const animate = () => {
      if (isPaused) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      frame++;
      
      // Update every ~500ms to reduce background CPU usage.
      if (frame % 30 === 0) {
        stars.forEach((star) => {
          if (Math.random() > 0.95) {
            star.opacity = Math.random() * 0.5 + 0.3;
          }
        });
        drawStars();
      }
      
      rafId = requestAnimationFrame(animate);
    };

    const handleVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused) {
        drawStars();
      }
    };

    drawStars();
    rafId = requestAnimationFrame(animate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0a0a0a',
      }}
    />
  );
};

export default StarfieldBackground;
