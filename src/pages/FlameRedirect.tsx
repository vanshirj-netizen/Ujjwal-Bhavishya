import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";

const FlameRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // TODO: get current day from user data and redirect
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Hero Logo Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full overflow-hidden h-[110px] sm:h-[130px] lg:h-[150px]"
        style={{
          background: "linear-gradient(180deg, hsl(161 96% 6%) 0%, hsl(161 96% 8%) 50%, hsl(161 96% 10%) 100%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 50%, hsl(44 99% 68% / 0.12) 0%, transparent 70%)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none profile-hero-shimmer" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo-Horizontal.png"
            alt="Ujjwal Bhavishya"
            className="w-[65%] max-w-[400px] h-auto object-contain drop-shadow-lg"
          />
        </div>
      </motion.div>

      <div className="px-5 pt-4 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[50vh]">
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
