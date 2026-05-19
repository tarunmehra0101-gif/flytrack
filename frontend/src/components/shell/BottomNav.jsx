import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, PlusCircle, Settings2 } from "lucide-react";

const TABS = [
  { to: "/home", label: "Home", icon: Home, testId: "nav-home" },
  { to: "/import", label: "Add Flights", icon: PlusCircle, testId: "nav-import", center: true },
  { to: "/settings", label: "Settings", icon: Settings2, testId: "nav-settings" },
];

export default function BottomNav() {
  const location = useLocation();
  return (
    <nav className="tl-bottomnav" data-testid="bottom-nav">
      {TABS.map(({ to, label, icon: Icon, testId, center }) => {
        const active = location.pathname.startsWith(to);
        return (
          <NavLink
            key={to}
            to={to}
            data-testid={testId}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-colors ${
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {center ? (
              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 transition-all ${
                active ? "bg-primary text-primary-foreground shadow-[0_6px_18px_-8px_hsl(var(--primary)/0.7)]" : "bg-secondary text-foreground"
              }`}>
                <Icon size={19} strokeWidth={2.2} />
              </span>
            ) : (
              <Icon size={19} strokeWidth={2} />
            )}
            <span className="text-[10px] font-semibold tracking-wide">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
