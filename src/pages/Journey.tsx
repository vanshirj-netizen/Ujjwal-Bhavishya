import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PAYMENT_URL } from "@/lib/constants";
import { useActiveCourse } from "@/components/CourseSwitcher";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import GoldCard from "@/components/ui/GoldCard";
import SectionLabel from "@/components/ui/SectionLabel";

const Journey = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = useActiveCourse();
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
        const { data: prof } = await supabase.from("profiles").select("full_name, current_streak, next_day_unlock_at").eq("id", user.id).maybeSingle();
        const name = (prof?.full_name && prof.full_name !== "Student") ? prof.full_name : user?.user_metadata?.full_name || user?.user_metadata?.name || null;
        if (name) setFirstName(name.split(" ")[0] + "'s");
        setStreak(prof?.current_streak ?? 0);
        setNextDayUnlockAt(prof?.next_day_unlock_at ?? null);
        const { data: enroll } = await supabase.from("enrollments").select("current_day, days_completed, payment_status").eq("user_id", user.id).eq("is_active", true).eq("course_id", courseId).maybeSingle();
        setCurrentDay(enroll?.current_day ?? 1);
        setDaysCompleted(enroll?.days_completed ?? 0);
        setPaymentStatus(enroll?.payment_status ?? "free");
        const { data: progressData } = await supabase.from("progress").select("day_number, day_complete").eq("user_id", user.id).eq("course_id", courseId);
        const pMap: Record<number, boolean> = {};
        progressData?.forEach(p => { if (p.day_complete) pMap[p.day_number] = true; });
        setProgressMap(pMap);
        const { data: flameData } = await supabase.from("reflection_sessions").select("day_number").eq("user_id", user.id).eq("course_id", courseId);
        const fMap: Record<number, boolean> = {};
        flameData?.forEach(f => { fMap[f.day_number] = true; });
        setFlameMap(fMap);
        const { data: weeks } = await supabase.from("course_weeks").select("week_number, theme_name").eq("course_id", courseId).order("week_number", { ascending: true });
        const wMap: Record<number, string> = {};
        weeks?.forEach(w => { wMap[w.week_number] = w.theme_name; });
        setWeekData(wMap);
      } catch { /* silent */ } finally { setLoading(false); }
    };
    load();
  }, [location.key, courseId]);

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
      case "completed": case "current": case "unlocked": navigate(`/day/${day}`); break;
      case "locked_payment": window.open(PAYMENT_URL, "_blank"); break;
      case "locked_prev": toast(`Complete Day ${day - 1} first 🔒`); break;
      case "locked_time": toast("Unlocks at 05:30 AM tomorrow 🌅"); break;
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
    <div className="min-h-screen pb-24 safe-top relative z-[2]">
      <div className="px-5 pt-6 max-w-lg mx-auto">
        <PageHeader title={<><span className="text-gradient-gold">{firstName}</span> Journey</>} />
        <p className="text-sm mt-2" style={{ color: "rgba(255,252,239,0.55)", fontFamily: "var(--fb)" }}>Day {currentDay} of 60</p>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: "✅", value: String(daysCompleted), label: "Completed" },
            { icon: "📍", value: `Day ${currentDay}`, label: "You Are Here" },
            { icon: "⏳", value: String(60 - daysCompleted), label: "Days Left" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GoldCard padding="14px 10px">
                <div className="text-center">
                  <span className="text-lg">{s.icon}</span>
                  <p className="font-display text-base font-bold mt-1" style={{ background: "var(--gg)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,252,239,0.5)" }}>{s.label}</p>
                </div>
              </GoldCard>
            </motion.div>
          ))}
        </div>

        {/* 60-Day Visual Map */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
          <SectionLabel className="mb-3">Your 60-Day Journey</SectionLabel>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 60 }, (_, i) => {
              const day = i + 1;
              const state = getDayState(day);
              const weekNum = Math.ceil(day / 5);
              const showWeekLabel = (day - 1) % 5 === 0;
              return (
                <React.Fragment key={day}>
                  {showWeekLabel && day <= 60 && (
                    <div className="col-span-6 mt-2 mb-1 first:mt-0">
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,252,239,0.3)", fontFamily: "var(--fa)" }}>
                        Week {weekNum} {weekData[weekNum] ? `· ${weekData[weekNum]}` : ""}
                      </p>
                    </div>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleDayTap(day, state)}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-all ${
                      state === "completed" ? "border border-primary/40"
                        : state === "current" ? "border-2 border-primary pulse-gold"
                        : state === "unlocked" ? "border border-primary/20"
                        : state === "locked_payment" ? "border border-primary/10 opacity-50"
                        : "opacity-40"
                    }`}
                    style={{ background: state === "completed" ? "rgba(253,193,65,0.1)" : state === "unlocked" ? "rgba(253,193,65,0.03)" : "rgba(255,252,239,0.03)" }}
                  >
                    {state === "current" && (
                      <span className="absolute -top-2 text-[8px] font-bold" style={{ color: "#ffc300", fontFamily: "var(--fa)" }}>TODAY</span>
                    )}
                    <span className={`font-bold ${
                      state === "completed" || state === "current" ? "text-primary"
                        : state === "unlocked" ? "text-foreground/60"
                        : "text-foreground/20"
                    }`}>
                      {state === "completed" ? "✓" : state === "locked_payment" || state === "locked_prev" ? "🔒" : state === "locked_time" ? "⏰" : day}
                    </span>
                    {state === "completed" && <span className="text-[8px] text-primary/60">{day}</span>}
                    {state === "completed" && flameMap[day] && <span className="absolute bottom-1 right-1 text-[10px]" style={{ color: "#FFC300" }}>🔥</span>}
                  </motion.button>
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 text-center pb-4">
          <p className="text-xs" style={{ color: "rgba(255,252,239,0.3)" }}>Complete each day to unlock the next 🔓</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,252,239,0.3)" }}>Next day unlocks at 05:30 AM after completion 🌅</p>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Journey;
