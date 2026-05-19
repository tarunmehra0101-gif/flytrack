import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthCallback from "@/components/AuthCallback";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import Splash from "@/pages/Splash";
import Onboarding from "@/pages/Onboarding";
import Home from "@/pages/Home";
import Import from "@/pages/Import";
import Review from "@/pages/Review";
import Timeline from "@/pages/Timeline";
import MapPage from "@/pages/MapPage";
import Cities from "@/pages/Cities";
import Wrapped from "@/pages/Wrapped";
import Settings from "@/pages/Settings";

function SplashRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (user) {
    return <Navigate to={profile?.onboarding_completed ? "/home" : "/onboarding"} replace />;
  }
  return <Splash />;
}

function AppRouter() {
  const inner = (
    <Routes>
      <Route path="/" element={<SplashRedirect />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/onboarding" element={
        <ProtectedRoute requireOnboarded={false}><Onboarding /></ProtectedRoute>
      } />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute><Import /></ProtectedRoute>} />
      <Route path="/review/:id" element={<ProtectedRoute><Review /></ProtectedRoute>} />
      <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
      <Route path="/cities" element={<ProtectedRoute><Cities /></ProtectedRoute>} />
      <Route path="/wrapped" element={<ProtectedRoute><Wrapped /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
  // Global portrait phone frame. Screens that include <Shell /> will render their
  // own top/bottom nav inside this frame; unauth screens (Splash, Onboarding,
  // AuthCallback) live full-bleed within the same phone frame.
  return (
    <div className="h-full w-full tl-frame-bg flex items-center justify-center">
      <div className="tl-shell" data-testid="app-shell-root">
        {inner}
      </div>
    </div>
  );
}

function ThemeBoot() {
  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem("tl_theme");
    } catch {
      saved = null;
    }
    const useDark = saved ? saved === "dark" : true;
    document.documentElement.classList.toggle("dark", useDark);
  }, []);
  return null;
}

function InstallPromptBoot() {
  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault();
      window.ryokoInstallPrompt = event;
      window.dispatchEvent(new Event("ryoko-install-ready"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}

function App() {
  return (
    <div className="App">
      <ThemeBoot />
      <InstallPromptBoot />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <AppRouter />
          </ErrorBoundary>
          <Toaster position="top-center" richColors closeButton theme="dark" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
