import { useState, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import SplashScreen from "./components/SplashScreen";
import AuroraBackground from "./components/AuroraBackground";
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Journey from "./pages/Journey";
import Profile from "./pages/Profile";
import AnubhavHub from "./pages/AnubhavHub";
import FlameHub from "./pages/FlameHub";
import FlamePage from "./pages/FlamePage";
import DayScreen from "./pages/DayScreen";
import AnubhavPage from "./pages/AnubhavPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<"loading" | "auth" | "unauth">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? "auth" : "unauth");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "auth" : "unauth");
    });
    return () => subscription.unsubscribe();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (status === "unauth") return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
        <AuroraBackground />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/journey" element={<ProtectedRoute><Journey /></ProtectedRoute>} />
            <Route path="/day/:dayNumber" element={<ProtectedRoute><DayScreen /></ProtectedRoute>} />
            <Route path="/anubhav" element={<ProtectedRoute><AnubhavHub /></ProtectedRoute>} />
            <Route path="/anubhav/:dayNumber" element={<ProtectedRoute><AnubhavPage /></ProtectedRoute>} />
            <Route path="/flame" element={<ProtectedRoute><FlameHub /></ProtectedRoute>} />
            <Route path="/flame/:dayNumber" element={<ProtectedRoute><FlamePage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
