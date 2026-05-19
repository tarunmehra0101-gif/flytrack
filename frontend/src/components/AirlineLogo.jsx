import React, { useState } from "react";
import { airlineLogoUrl, airlineLogoFallbackUrl } from "@/lib/airlineLogo";

/** Small airline logo pill. Falls back to secondary CDN, then to IATA code text. */
export default function AirlineLogo({ iata, size = 28, className = "", rounded = "rounded-md" }) {
  const [failCount, setFailCount] = useState(0);
  const dim = { width: size, height: size };

  if (!iata) {
    return (
      <div className={`bg-secondary flex items-center justify-center ${rounded} ${className}`} style={dim}>
        <span className="tl-mono text-[10px] text-muted-foreground">—</span>
      </div>
    );
  }

  const primaryUrl = airlineLogoUrl(iata);
  const fallbackUrl = airlineLogoFallbackUrl(iata);
  const currentUrl = failCount === 0 ? primaryUrl : failCount === 1 ? fallbackUrl : null;

  if (!currentUrl) {
    return (
      <div className={`bg-secondary flex items-center justify-center ${rounded} ${className}`} style={dim}>
        <span className="tl-mono text-[10px] font-semibold">{iata}</span>
      </div>
    );
  }

  return (
    <div className={`bg-white flex items-center justify-center overflow-hidden ${rounded} ${className}`} style={dim}>
      <img
        src={currentUrl}
        alt={iata}
        onError={() => setFailCount((c) => c + 1)}
        className="max-w-full max-h-full object-contain"
        style={{ width: size * 0.85, height: size * 0.65 }}
      />
    </div>
  );
}
