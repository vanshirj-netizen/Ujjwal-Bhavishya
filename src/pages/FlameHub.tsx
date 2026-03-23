import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActiveCourse } from "@/components/CourseSwitcher";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import GoldCard from "@/components/ui/GoldCard";
import SectionLabel from "@/components/ui/SectionLabel";

const FlameHub = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = useActiveCourse();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("Your");
  const [currentDay, setCurrentDay] = useState(1);

  // Stats
  const [flamesLit, setFlamesLit] = useState(0);
  const [avgBelief, setAvgBelief] = useState("–");

  // Chart
  const [chartData, setChartData] = useState<{ name: string; rating: number }[]>([]);

  // Maps
  const [flameMap, setFlameMap] = useState<Record<number, { confidenceRating: number }>>({});
  const [progressMap, setProgressMap] = useState<Record<number, { anubhavComplete: boolean }>>({});
  const [weekData, setWeekData] = useState<Record<number, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, enrollRes, reflectionRes, progressRes, weeksRes] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
          supabase.from("enrollments").select("current_day").eq("user_id", user.id).eq("is_active", true).eq("course_id", courseId).maybeSingle(),
          supabase.from("reflection_sessions").select("day_number, confidence_rating").eq("user_id", user.id).eq("course_id", courseId),
          supabase.from("progress").select("day_number, anubhav_complete").eq("user_id", user.id).eq("course_id", courseId),
          supabase.from("course_weeks").select("week_number, theme_name").eq("course_id", courseId).order("week_number", { ascending: true }),
        ]);

        // Profile
        const name = profileRes.data?.full_name;
        if (name && name !== "Student") setFirstName(name.split(" ")[0]);

        // Enrollment
        setCurrentDay(enrollRes.data?.current_day ?? 1);

        // Reflections
        const reflections = reflectionRes.data ?? [];
        setFlamesLit(reflections.length);

        // Avg belief
        const ratings = reflections.map(r => r.confidence_rating).filter(Boolean) as number[];
        if (ratings.length > 0) {
          setAvgBelief(`${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)}/5`);
        }

        // Chart data
        const dayMap = new Map<number, number>();
        reflections.forEach(r => {
          if (r.confidence_rating) {
            const existing = dayMap.get(r.day_number) ?? 0;
            dayMap.set(r.day_number, Math.max(existing, r.confidence_rating));
          }
        });
        const sorted = Array.from(dayMap.entries()).sort((a, b) => a[0] - b[0]);
        setChartData(sorted.map(([d, r]) => ({ name: `Day ${d}`, rating: r })));

        // Flame map
        const fMap: Record<number, { confidenceRating: number }> = {};
        reflections.forEach(r => {
          if (!fMap[r.day_number] || (r.confidence_rating && r.confidence_rating > fMap[r.day_number].confidenceRating)) {
            fMap[r.day_number] = { confidenceRating: r.confidence_rating ?? 0 };
          }
        });
        setFlameMap(fMap);

        // Progress map
        const pMap: Record<number, { anubhavComplete: boolean }> = {};
        progressRes.data?.forEach(p => {
          pMap[p.day_number] = { anubhavComplete: p.anubhav_complete === true };
        });
        setProgressMap(pMap);

        // Weeks
        const wMap: Record<number, string> = {};
        weeksRes.data?.forEach(w => { wMap[w.week_number] = w.theme_name; });
        setWeekData(wMap);
      } catch { /* silent */ } finally { setLoading(false); }
    };
    load();
  }, [location.key, courseId]);

  const getDayState = (day: number): "flame_complete" | "anubhav_done" | "today" | "locked" => {
    if (flameMap[day]) return "flame_complete";
    const prog = progressMap[day];
    if (prog?.anubhavComplete && day === currentDay) return "today";
    if (prog?.anubhavComplete) return "anubhav_done";
    return "locked";
  };

  const handleDayTap = (day: number, state: string) => {
    switch (state) {
      case "flame_complete":
        navigate(`/flame/${day}?mode=readonly`);
        break;
      case "anubhav_done":
      case "today":
        navigate(`/flame/${day}`);
        break;
      case "locked":
        toast(`Complete Day ${day}'s Anubhav practice first 🔒`);
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
    <div className="min-h-screen pb-24 safe-top relative z-[2]">
      <div className="px-5 pt-6 max-w-lg mx-auto">
        <PageHeader title={<><span className="text-gradient-gold">{firstName}'s</span> Flame</>} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: "📅", value: `Day ${currentDay}`, label: "Today" },
            { icon: "🔥", value: String(flamesLit), label: "Flames Lit" },
            { icon: "💬", value: avgBelief, label: "Avg Belief" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GoldCard padding="14px 10px">
                <div className="text-center">
                  <span className="text-lg">{s.icon}</span>
                  <p className="font-display text-base font-bold mt-1" style={{ background: "var(--gg)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,252,239,0.68)" }}>{s.label}</p>
                </div>
              </GoldCard>
            </motion.div>
          ))}
        </div>

        {/* Confidence Journey Chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
          <GoldCard padding="20px">
            <p className="text-[10px] uppercase tracking-wider mb-4" style={{ fontFamily: "var(--fa)", color: "rgba(255,252,239,0.60)", letterSpacing: "3px" }}>Your Confidence Journey</p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,252,239,0.4)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: "rgba(255,252,239,0.4)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(161 96% 8%)", border: "1px solid rgba(253,193,65,0.2)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#fffcef" }}
                    itemStyle={{ color: "#fed141" }}
                    formatter={(value: number) => [`${value}/5`, "Confidence"]}
                  />
                  <Line type="monotone" dataKey="rating" stroke="#fed141" strokeWidth={2} dot={{ fill: "#fed141", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm" style={{ color: "rgba(255,252,239,0.3)" }}>
                Submit your first Flame to see your confidence chart 📈
              </div>
            )}
          </GoldCard>
        </motion.div>

        {/* Memory Lane + 60-Day Grid */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6">
          <SectionLabel className="mb-1">{firstName}'s Memory Lane ✦</SectionLabel>
          <p className="text-[11px] mb-4" style={{ color: "rgba(255,252,239,0.3)", fontFamily: "var(--fb)" }}>Your reflections. Your journey. Your story.</p>

          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 60 }, (_, i) => {
              const day = i + 1;
              const state = getDayState(day);
              const weekNum = Math.ceil(day / 5);
              const showWeekLabel = (day - 1) % 5 === 0;
              const flame = flameMap[day];
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
                      state === "flame_complete" ? "border border-primary/40"
                        : state === "today" ? "border-2 border-primary pulse-gold"
                        : state === "anubhav_done" ? "border border-orange-400/40"
                        : "opacity-25"
                    }`}
                    style={{
                      background: state === "flame_complete" ? "rgba(253,193,65,0.08)"
                        : state === "anubhav_done" || state === "today" ? "rgba(255,165,0,0.05)"
                        : "rgba(255,252,239,0.03)",
                    }}
                  >
                    {state === "today" && (
                      <span className="absolute -top-2 text-[8px] font-bold" style={{ color: "#ffc300", fontFamily: "var(--fa)" }}>TODAY</span>
                    )}
                    <span className={`font-bold ${
                      state === "flame_complete" ? "text-primary"
                        : state === "today" || state === "anubhav_done" ? "text-orange-400"
                        : "text-foreground/20"
                    }`}>
                      {state === "anubhav_done" || state === "today" ? "📝" : day}
                    </span>
                    {state === "flame_complete" && flame && (
                      <span className="text-[8px] leading-none" style={{ color: "#FFC300" }}>
                        {"★".repeat(Math.min(flame.confidenceRating, 5))}
                      </span>
                    )}
                  </motion.button>
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 text-center pb-4">
          <p className="text-xs" style={{ color: "rgba(255,252,239,0.3)" }}>Complete Anubhav practice to unlock your Flame 🔥</p>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default FlameHub;
