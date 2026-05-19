import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

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
      <div className="h-full w-full flex items-center justify-center p-6 text-center">
        <div className="tl-card p-6 max-w-[320px]">
          <div className="w-12 h-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={20} />
          </div>
          <p className="text-lg font-semibold">Something went off route</p>
          <p className="text-sm text-muted-foreground mt-2">
            Your Flight Timeline is still on this device. Refresh the screen and try again.
          </p>
          <button onClick={() => window.location.reload()} className="tl-btn-primary mt-5 text-sm inline-flex items-center gap-2">
            <RotateCcw size={14} /> Reload Ryoko
          </button>
        </div>
      </div>
    );
  }
}
