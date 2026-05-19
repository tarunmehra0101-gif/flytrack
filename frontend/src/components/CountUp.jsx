import React, { useEffect, useState } from "react";

export default function CountUp({ value, duration = 900, decimals = 0, suffix = "", className = "", animate = false }) {
  const [display, setDisplay] = useState(Number(value) || 0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (!animate) {
      setDisplay(target);
      return;
    }
    if (target === 0) { setDisplay(0); return; }
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const progress = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, animate]);
  const formatted = decimals
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString();
  return <span className={`tl-number ${className}`}>{formatted}{suffix}</span>;
}
