import React from "react";
import { Plane } from "lucide-react";

export default function TopBar({ title, right, leading }) {
  return (
    <header className="tl-topbar" data-testid="top-bar">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {leading || (
          <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Plane size={15} strokeWidth={2.4} />
          </div>
        )}
        <div className="truncate">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-none">Ryoko</p>
          <h1 className="text-[15px] font-semibold leading-tight truncate" data-testid="top-bar-title">
            {title}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">{right}</div>
    </header>
  );
}
