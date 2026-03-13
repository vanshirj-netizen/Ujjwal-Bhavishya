import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PAYMENT_URL } from "@/lib/constants";
import BottomNav from "@/components/BottomNav";

const Journey = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("Your");
  const [currentDay, setCurrentDay] = useState(1);
  const [daysCompleted, setDaysCompleted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState("free");
  const [nextDayUnlockAt, setNextDayUnlockAt] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<number, boolean>>({});
  const [flameMap, setFlameMap] = useState<Record<number, boolean>>({});
  const [weekData, setWeekData] = useState<Record<number, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, current_streak, next_day_unlock_at")
          .eq("id", user.id)
          .maybeSingle();

        const name = (prof?.full_name && prof.full_name !== "Student")
          ? prof.full_name
          : user?.user_metadata?.full_name || user?.user_metadata?.name || null;
        if (name) setFirstName(name.split(" ")[0] + "'s");
        setStreak(prof?.current_streak ?? 0);
        setNextDayUnlockAt(prof?.next_day_unlock_at ?? null);

        // Enrollment
        const { data: enroll } = await supabase
          .from("enrollments")
          .select("current_day, days_completed, payment_status")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        setCurrentDay(enroll?.current_day ?? 1);
        setDaysCompleted(enroll?.days_completed ?? 0);
        setPaymentStatus(enroll?.payment_status ?? "free");

        // Progress
        const { data: progressData } = await supabase
          .from("progress")
          .select("day_number, day_complete")
          .eq("user_id", user.id);
        const pMap: Record<number, boolean> = {};
        progressData?.forEach(p => { if (p.day_complete) pMap[p.day_number] = true; });
        setProgressMap(pMap);

        // Flames
        const { data: flameData } = await supabase
          .from("daily_flames")
          .select("day_number")
          .eq("user_id", user.id);
        const fMap: Record<number, boolean> = {};
        flameData?.forEach(f => { fMap[f.day_number] = true; });
        setFlameMap(fMap);

        // Weeks
        const { data: weeks } = await supabase
          .from("weeks")
          .select("week_number, theme_name")
          .order("week_number", { ascending: true });
        const wMap: Record<number, string> = {};
        weeks?.forEach(w => { wMap[w.week_number] = w.theme_name; });
        setWeekData(wMap);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [location.key]);

  const getDayState = (day: number): "completed" | "current" | "unlocked" | "locked_prev" | "locked_time" | "locked_payment" => {
    if (progressMap[day]) return "completed";
    if (paymentStatus === "free" && day > 5) return "locked_payment";
    if (day > 1 && !flameMap[day - 1] && !progressMap[day]) return "locked_prev";
    if (nextDayUnlockAt && day > currentDay && new Date() < new Date(nextDayUnlockAt)) return "locked_time";
    if (day === currentDay) return "current";
    if (day <= currentDay) return "unlocked";
    return "locked_prev";
  };

  const handleDayTap = (day: number, state: string) => {
    switch (state) {
      case "completed":
      case "current":
      case "unlocked":
        navigate(`/day/${day}`);
        break;
      case "locked_payment":
        window.open(PAYMENT_URL, "_blank");
        break;
      case "locked_prev":
        toast(`Complete Day ${day - 1} first 🔒`);
        break;
      case "locked_time":
        toast("Unlocks at 05:30 AM tomorrow 🌅");
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full overflow-hidden h-[110px] sm:h-[130px] lg:h-[150px]"
        style={{
          background: "linear-gradient(180deg, hsl(161 96% 6%) 0%, hsl(161 96% 8%) 50%, hsl(161 96% 10%) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, hsl(44 99% 68% / 0.12) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 pointer-events-none profile-hero-shimmer" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img src="https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo-Horizontal.png" alt="Ujjwal Bhavishya" className="w-[65%] max-w-[400px] h-auto object-contain drop-shadow-lg" />
        </div>
      </motion.div>

      <div className="px-5 pt-4 max-w-lg mx-auto">
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-display font-bold text-primary gold-text-glow">
          {firstName} Journey 🦋
        </motion.h1>
        <p className="text-sm text-foreground/40 font-body mt-1">Day {currentDay} of 60</p>

        {/* Quick Stats */}
        <div className="flex gap-3 mt-4">
          {[
            { icon: "✅", value: String(daysCompleted), label: "Days Done" },
            { icon: "🔥", value: String(streak), label: "Streak" },
            { icon: "📅", value: `Day ${currentDay}`, label: "You Are Here" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex-1 glass-card p-3 text-center"
            >
              <span className="text-lg">{s.icon}</span>
              <p className="text-base font-bold text-primary mt-1">{s.value}</p>
              <p className="text-[10px] text-foreground/50">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* 60-Day Visual Map */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">Your 60-Day Journey</h3>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 60 }, (_, i) => {
              const day = i + 1;
              const state = getDayState(day);
              const weekNum = Math.ceil(day / 5);

              // Week label
              const showWeekLabel = (day - 1) % 5 === 0;

              return (
                <React.Fragment key={day}>
                  {showWeekLabel && day <= 60 && (
                    <div className="col-span-6 mt-2 mb-1 first:mt-0">
                      <p className="text-[10px] text-foreground/30 font-body uppercase tracking-wider">
                        Week {weekNum} {weekData[weekNum] ? `· ${weekData[weekNum]}` : ""}
                      </p>
                    </div>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleDayTap(day, state)}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-body transition-all ${
                      state === "completed"
                        ? "bg-primary/20 border border-primary/40"
                        : state === "current"
                        ? "border-2 border-primary pulse-gold"
                        : state === "unlocked"
                        ? "border border-primary/20 bg-primary/5"
                        : state === "locked_payment"
                        ? "border border-primary/10 bg-foreground/5 opacity-50"
                        : "bg-foreground/5 opacity-40"
                    }`}
                  >
                    {state === "current" && (
                      <span className="absolute -top-2 text-[8px] text-primary font-bold">TODAY</span>
                    )}
                    <span className={`font-bold ${
                      state === "completed" ? "text-primary"
                        : state === "current" ? "text-primary"
                        : state === "unlocked" ? "text-foreground/60"
                        : "text-foreground/20"
                    }`}>
                      {state === "completed" ? "✓" : state === "locked_payment" ? "🔒" : state === "locked_prev" ? "🔒" : state === "locked_time" ? "⏰" : day}
                    </span>
                    {state === "completed" && (
                      <span className="text-[8px] text-primary/60">{day}</span>
                    )}
                    {state === "completed" && flameMap[day] && (
                      <span className="absolute bottom-0.5 left-0.5 text-[8px]">🔥</span>
                    )}
                  </motion.button>
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>

        {/* Bottom message */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 text-center pb-4">
          <p className="text-xs text-foreground/30 font-body">Complete each day to unlock the next 🔓</p>
          <p className="text-xs text-foreground/30 font-body mt-1">Next day unlocks at 05:30 AM after completion 🌅</p>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Journey;
