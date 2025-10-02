'use client';

import { useEffect } from 'react';

/**
 * Confetti animation component using canvas
 * Creates a celebratory confetti effect across the screen
 */
export function ConfettiAnimation() {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    const confetti: Array<{
      x: number;
      y: number;
      r: number;
      d: number;
      color: string;
      tilt: number;
      tiltAngleIncrement: number;
      tiltAngle: number;
    }> = [];

    const confettiCount = 150;
    const gravity = 0.5;
    const terminalVelocity = 5;
    const drag = 0.075;

    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: Math.random() * 100 - 100, // Start all confetti near the top (between -100 and 0)
        r: Math.random() * 6 + 4,
        d: Math.random() * confettiCount,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncrement: Math.random() * 0.07 + 0.05,
        tiltAngle: 0,
      });
    }

    let animationId: number;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      confetti.forEach((c, i) => {
        // Only draw confetti that hasn't fallen off screen yet
        if (c.y <= canvas.height + 20) {
          ctx.beginPath();
          ctx.lineWidth = c.r / 2;
          ctx.strokeStyle = c.color;
          ctx.moveTo(c.x + c.tilt + c.r, c.y);
          ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r);
          ctx.stroke();

          c.tiltAngle += c.tiltAngleIncrement;
          c.y += (Math.cos(c.d) + 3 + c.r / 2) * 0.8; // Fall at slower speed
          c.tilt = Math.sin(c.tiltAngle - i / 3) * 15;
        }
      });

      animationId = requestAnimationFrame(draw);
    }

    draw();

    // Clean up after 8 seconds (slower fall speed)
    const timeout = setTimeout(() => {
      cancelAnimationFrame(animationId);
      document.body.removeChild(canvas);
    }, 8000);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(animationId);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    };
  }, []);

  return null;
}

