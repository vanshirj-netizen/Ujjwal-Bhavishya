import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";

const FlameRedirect = () => {
  const navigate = useNavigate();

  // Will redirect to /flame/[currentDay] when we have user data
  // For now show a placeholder
  useEffect(() => {
    // TODO: get current day from user data and redirect
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="px-5 pt-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <span className="text-5xl mb-4">🔥</span>
        <h1 className="text-xl font-display font-bold text-primary text-center">Daily Flame</h1>
        <p className="text-sm text-foreground/50 mt-2 text-center">
          Complete today's lesson checkpoints first, then submit your flame.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 h-11 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm gold-glow active:scale-[0.98] transition-transform"
        >
          Go to Today's Lesson →
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default FlameRedirect;
