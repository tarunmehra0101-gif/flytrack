import React from "react";
import { AlertTriangle, Home, Import, Plane, RotateCcw, Settings } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Ryoko screen failed", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="h-full w-full flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="tl-card p-6 max-w-[320px]">
            <div className="w-12 h-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={20} />
            </div>
            <p className="text-lg font-semibold">Something went off route</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your Flight Timeline is still on this device. Refresh the screen and try again.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button onClick={() => window.location.reload()} className="tl-btn-primary w-full text-sm inline-flex items-center justify-center gap-2">
                <RotateCcw size={14} /> Reload Ryoko
              </button>
              <button onClick={() => window.location.href = '/timeline'} className="w-full h-10 rounded-lg border border-border text-sm inline-flex items-center justify-center gap-2 hover:bg-muted transition">
                <Plane size={14} /> Go to Timeline
              </button>
              <button onClick={() => window.location.href = '/'} className="w-full h-10 rounded-lg border border-border text-sm inline-flex items-center justify-center gap-2 hover:bg-muted transition">
                <Home size={14} /> Go to Home
              </button>
            </div>
          </div>
        </div>
        {/* Inline bottom nav */}
        <nav className="flex items-center justify-around border-t border-border py-3 px-4 bg-background">
          <a href="/" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition text-[11px]">
            <Home size={18} />
            Home
          </a>
          <a href="/timeline" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition text-[11px]">
            <Plane size={18} />
            Timeline
          </a>
          <a href="/import" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition text-[11px]">
            <Import size={18} />
            Import
          </a>
          <a href="/settings" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition text-[11px]">
            <Settings size={18} />
            Settings
          </a>
        </nav>
      </div>
    );
  }
}
