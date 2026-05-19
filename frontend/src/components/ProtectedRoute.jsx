import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children, requireOnboarded = true }) {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center" data-testid="auth-loading">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (requireOnboarded && !profile?.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return children;
}
