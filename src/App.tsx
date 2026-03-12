import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Journey from "./pages/Journey";
import Profile from "./pages/Profile";
import FlameRedirect from "./pages/FlameRedirect";
import DayScreen from "./pages/DayScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/journey" element={<Journey />} />
          <Route path="/day/:dayNumber" element={<DayScreen />} />
          <Route path="/flame" element={<FlameRedirect />} />
          <Route path="/flame/:dayNumber" element={<div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-8 text-center"><div className="text-6xl animate-pulse">🔥</div><div><p className="text-xl font-display font-bold text-primary mb-2">Daily Flame</p><p className="text-sm font-body text-foreground/40 leading-relaxed max-w-[260px]">Your Daily Flame is being crafted. It will be ready very soon. ✦</p></div><a href="/" className="mt-2 bg-primary text-primary-foreground font-body font-semibold px-6 py-3 rounded-xl text-sm">← Back to Home</a></div>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
