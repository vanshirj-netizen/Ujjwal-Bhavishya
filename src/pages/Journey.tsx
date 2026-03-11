import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

const Journey = () => {
  const [journeyName, setJourneyName] = useState("Your");

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        const name =
          data?.full_name ||
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          null;
        if (name) {
          setJourneyName(name.split(" ")[0] + "'s");
        }
      } catch {
        // silent — keeps "Your"
      }
    };
    load();
  }, []);

  // Placeholder data
  const stats = [
    { icon: "🔥", value: "0", label: "Day Streak" },
    { icon: "🦋", value: "0", label: "Flames" },
    { icon: "⭐", value: "–", label: "Avg Confidence" },
    { icon: "📅", value: "1", label: "Days Active" },
  ];

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

      <div className="px-5 pt-4 max-w-lg mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-display font-bold text-primary gold-text-glow"
        >
          {journeyName} Journey 🦋
        </motion.h1>

        {/* Stats Row */}
        <div className="flex gap-3 overflow-x-auto pb-2 mt-6 -mx-5 px-5">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex-shrink-0 glass-card p-4 min-w-[100px] text-center"
            >
              <span className="text-lg">{s.icon}</span>
              <p className="text-xl font-bold text-primary mt-1">{s.value}</p>
              <p className="text-[10px] text-foreground/50">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Confidence Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5 mt-6"
        >
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
            Your Confidence Journey
          </h3>
          <div className="h-40 flex items-center justify-center text-foreground/30 text-sm">
            Chart will appear after your first flame 🔥
          </div>
        </motion.div>

        {/* Timeline placeholder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">
            Timeline
          </h3>
          <div className="glass-card p-5 text-center text-foreground/30 text-sm">
            Complete your first day to see your timeline here.
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Journey;
