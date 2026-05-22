import React, { useEffect, useRef } from "react";

export function Confetti({ duration = 4000, active = true, onComplete }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let startTime = Date.now();

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Particle class
    const colors = [
      "#3b82f6", // Blue
      "#10b981", // Emerald
      "#f59e0b", // Amber
      "#ef4444", // Red
      "#ec4899", // Pink
      "#8b5cf6", // Purple
      "#06b6d4", // Cyan
    ];

    const shapes = ["circle", "square", "triangle"];

    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 8 + 6;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.shape = shapes[Math.floor(Math.random() * shapes.length)];
        
        // Initial velocity sprayed upwards and outwards
        const angle = Math.random() * Math.PI * 0.4 - Math.PI * 0.7; // Angle between -54deg and -126deg
        const speed = Math.random() * 12 + 10;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.gravity = 0.35;
        this.drag = 0.97;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 8 - 4;
        this.opacity = 1;
      }

      update() {
        this.vx *= this.drag;
        this.vy *= this.drag;
        this.vy += this.gravity;
        
        this.x += this.vx;
        this.y += this.vy;
        
        this.rotation += this.rotationSpeed;
        
        // Fade out near the end of life
        const elapsed = Date.now() - startTime;
        if (elapsed > duration - 1000) {
          const fadeDuration = 1000;
          const remaining = duration - elapsed;
          this.opacity = Math.max(0, remaining / fadeDuration);
        }
      }

      draw(c) {
        c.save();
        c.translate(this.x, this.y);
        c.rotate((this.rotation * Math.PI) / 180);
        c.globalAlpha = this.opacity;
        c.fillStyle = this.color;

        c.beginPath();
        if (this.shape === "circle") {
          c.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        } else if (this.shape === "square") {
          c.rect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else if (this.shape === "triangle") {
          c.moveTo(0, -this.size / 2);
          c.lineTo(this.size / 2, this.size / 2);
          c.lineTo(-this.size / 2, this.size / 2);
          c.closePath();
        }
        c.fill();
        c.restore();
      }
    }

    const particles = [];
    
    // Spawn double cannons (left and right corners)
    const spawnParticles = () => {
      const w = canvas.width;
      const h = canvas.height;
      // Cannon from bottom-left
      for (let i = 0; i < 70; i++) {
        particles.push(new Particle(w * 0.1, h * 0.95));
      }
      // Cannon from bottom-right
      for (let i = 0; i < 70; i++) {
        const p = new Particle(w * 0.9, h * 0.95);
        // Reverse vx so it sprays towards center
        p.vx = -Math.abs(p.vx);
        particles.push(p);
      }
      // Cannon from center (gentler)
      for (let i = 0; i < 40; i++) {
        particles.push(new Particle(w * 0.5, h * 0.95));
      }
    };

    spawnParticles();

    // Main animation loop
    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        if (onComplete) onComplete();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [active, duration, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999] w-full h-full"
    />
  );
}
