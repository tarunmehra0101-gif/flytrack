import React from "react";

export default class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Inline component crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl text-center text-xs text-muted-foreground flex flex-col items-center justify-center min-h-[120px]">
          <span className="text-amber-500 font-semibold mb-1">Preview Unavailable</span>
          <span>WebGL or hardware acceleration may be disabled.</span>
        </div>
      );
    }
    return this.props.children;
  }
}
