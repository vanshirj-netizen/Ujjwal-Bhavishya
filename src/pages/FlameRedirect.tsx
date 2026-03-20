import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCourse } from "@/components/CourseSwitcher";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import GoldCard from "@/components/ui/GoldCard";
import { X } from "lucide-react";

const FlameRedirect = () => {
  const navigate = useNavigate();
  const courseId = useActiveCourse();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [masterName, setMasterName] = useState("Gyani");

  // Stats
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [beliefScore, setBeliefScore] = useState("–");
  const [flamesLit, setFlamesLit] = useState(0);
  const [bestBeliefDay, setBestBeliefDay] = useState<string | null>(null);

  // Chart
  const [chartData, setChartData] = useState<{ name: string; rating: number }[]>([]);

  // Memory Lane
  const [weeks, setWeeks] = useState<any[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, any>>({});
  const [reflectionMap, setReflectionMap] = useState<Record<number, any>>({});
  const [lessonMap, setLessonMap] = useState<Record<number, any>>({});
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  // Modal
  const [modalDay, setModalDay] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, selected_master")
          .eq("id", user.id)
          .maybeSingle();
        const name = prof?.full_name?.split(" ")[0] || "Student";
        setFirstName(name);
        setMasterName(prof?.selected_master?.toLowerCase() === "gyanu" ? "Gyanu" : "Gyani");

        // Student progress
        const { data: sp } = await supabase
          .from("student_progress")
          .select("current_streak, longest_streak_ever")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .maybeSingle();
        setCurrentStreak(sp?.current_streak ?? 0);
        setBestStreak(sp?.longest_streak_ever ?? 0);

        // Reflection sessions for this course
        const { data: reflections } = await supabase
          .from("reflection_sessions")
          .select("day_number, confidence_rating, ai_response, written_reflection, composite_score, submitted_at, flame_date")
          .eq("user_id", user.id)
          .eq("course_id", courseId);

        // Flames lit = has ai_response
        const litFlames = reflections?.filter(r => r.ai_response) ?? [];
        setFlamesLit(litFlames.length);

        // Belief score = avg confidence_rating
        const ratings = reflections?.map(r => r.confidence_rating).filter(Boolean) as number[] ?? [];
        setBeliefScore(ratings.length > 0 ? `${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)} / 5` : "–");

        // Best belief day
        if (ratings.length > 0 && reflections) {
          const best = reflections.reduce((a, b) => (b.confidence_rating ?? 0) > (a.confidence_rating ?? 0) ? b : a);
          setBestBeliefDay(`Day ${best.day_number} — ${"★".repeat(best.confidence_rating ?? 0)}${"☆".repeat(5 - (best.confidence_rating ?? 0))}`);
        }

        // Chart — grouped by day_number, max confidence
        const dayMap = new Map<number, number>();
        reflections?.forEach(r => {
          if (r.confidence_rating) {
            const existing = dayMap.get(r.day_number) ?? 0;
            dayMap.set(r.day_number, Math.max(existing, r.confidence_rating));
          }
        });
        const sorted = Array.from(dayMap.entries()).sort((a, b) => a[0] - b[0]);
        setChartData(sorted.map(([d, r]) => ({ name: `Day ${d}`, rating: r })));

        // Build reflection map
        const rMap: Record<number, any> = {};
        reflections?.forEach(r => {
          if (!rMap[r.day_number] || (r.ai_response && !rMap[r.day_number].ai_response)) {
            rMap[r.day_number] = r;
          }
        });
        setReflectionMap(rMap);

        // Progress for anubhav_complete check
        const { data: progressData } = await supabase
          .from("progress")
          .select("day_number, anubhav_complete")
          .eq("user_id", user.id)
          .eq("course_id", courseId);
        const pMap: Record<number, any> = {};
        progressData?.forEach(p => { pMap[p.day_number] = p; });
        setProgressMap(pMap);

        // Weeks
        const { data: weeksData } = await supabase
          .from("course_weeks")
          .select("week_number, theme_name, days_in_week")
          .eq("course_id", courseId)
          .eq("is_active", true)
          .order("week_number", { ascending: true });
        setWeeks(weeksData ?? []);

        // Find current week
        if (weeksData && weeksData.length > 0) {
          let currentW = 1;
          let dayCounter = 0;
          const maxCompletedDay = Math.max(0, ...Object.keys(pMap).map(Number).filter(d => pMap[d]?.anubhav_complete));
          for (const w of weeksData) {
            const daysInWeek = w.days_in_week ?? 5;
            if (maxCompletedDay > dayCounter + daysInWeek) {
              dayCounter += daysInWeek;
              currentW = w.week_number + 1;
            } else {
              currentW = w.week_number;
              break;
            }
          }
          setExpandedWeek(currentW);
        }

        // Lessons for modal
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("day_number, title, manthan_question")
          .eq("course_id", courseId);
        const lMap: Record<number, any> = {};
        lessonsData?.forEach(l => { lMap[l.day_number] = l; });
        setLessonMap(lMap);

      } catch { /* silent */ } finally { setLoading(false); }
    };
    load();
  }, [courseId]);

  const getDayRange = (weekNum: number): number[] => {
    let startDay = 1;
    for (const w of weeks) {
      if (w.week_number === weekNum) break;
      startDay += w.days_in_week ?? 5;
    }
    const daysInWeek = weeks.find(w => w.week_number === weekNum)?.days_in_week ?? 5;
    return Array.from({ length: daysInWeek }, (_, i) => startDay + i);
  };

  const getDayState = (day: number): "locked" | "available" | "lit" => {
    const reflection = reflectionMap[day];
    if (reflection?.ai_response) return "lit";
    const prog = progressMap[day];
    if (prog?.anubhav_complete) return "available";
    return "locked";
  };

  const modalData = modalDay ? {
    reflection: reflectionMap[modalDay],
    lesson: lessonMap[modalDay],
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="px-5 pt-4 max-w-lg mx-auto">
        <PageHeader title={`${firstName}'s Flame`} />

        {/* 3 Stat Cards */}
        <div className="flex gap-3 mt-4">
          {[
            { icon: "🔥", value: String(currentStreak), label: "Current Streak" },
            { icon: "🏆", value: String(bestStreak), label: "Best Streak" },
            { icon: "⭐", value: beliefScore, label: "My Belief Score" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="flex-1 glass-card p-4 text-center"
            >
              <span className="text-lg">{s.icon}</span>
              <p className="text-xl font-bold text-primary mt-1">{s.value}</p>
              <p className="text-[10px] text-foreground/50">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Confidence Journey Chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-5 mt-6">
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">Your Confidence Journey</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(46 100% 94% / 0.4)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: "hsl(46 100% 94% / 0.4)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(161 96% 8%)", border: "1px solid hsl(44 99% 68% / 0.2)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(46 100% 94%)" }}
                  itemStyle={{ color: "#fed141" }}
                  formatter={(value: number) => [`${value}/5`, "Confidence"]}
                />
                <Line type="monotone" dataKey="rating" stroke="#fed141" strokeWidth={2} dot={{ fill: "#fed141", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-foreground/30 text-sm">
              Submit your first Flame reflection to see your confidence chart 📈
            </div>
          )}
        </motion.div>

        {/* Memory Lane */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6">
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-1">{firstName}'s Memory Lane ✦</h3>
          <p className="text-[11px] text-foreground/30 mb-4 font-body">Your reflections. Your journey. Your story.</p>

          <div className="space-y-2">
            {weeks.map(w => {
              const days = getDayRange(w.week_number);
              const isExpanded = expandedWeek === w.week_number;
              const litCount = days.filter(d => getDayState(d) === "lit").length;

              return (
                <div key={w.week_number} className="glass-card overflow-hidden">
                  <button
                    onClick={() => setExpandedWeek(isExpanded ? null : w.week_number)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="text-sm font-semibold text-foreground/80" style={{ fontFamily: "var(--fa)" }}>
                      Week {w.week_number}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {days.map(d => (
                          <div
                            key={d}
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              background: getDayState(d) === "lit" ? "hsl(var(--primary))" : getDayState(d) === "available" ? "hsl(var(--foreground) / 0.3)" : "hsl(var(--foreground) / 0.1)",
                              boxShadow: getDayState(d) === "lit" ? "0 0 6px hsl(var(--primary) / 0.4)" : "none",
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-foreground/30">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex justify-center gap-4 px-4 pb-4">
                          {days.map(d => {
                            const state = getDayState(d);
                            return (
                              <button
                                key={d}
                                onClick={() => {
                                  if (state === "lit") setModalDay(d);
                                  else if (state === "available") navigate(`/flame/${d}`);
                                }}
                                className="flex flex-col items-center gap-1"
                                disabled={state === "locked"}
                              >
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                                  style={{
                                    ...(state === "lit" ? {
                                      background: "linear-gradient(135deg, hsl(var(--primary)), hsl(44 99% 48%))",
                                      color: "hsl(161 96% 6%)",
                                      boxShadow: "0 0 12px hsl(var(--primary) / 0.4)",
                                    } : state === "available" ? {
                                      border: "1.5px solid hsl(var(--foreground) / 0.3)",
                                      color: "hsl(var(--foreground) / 0.5)",
                                    } : {
                                      background: "hsl(var(--foreground) / 0.06)",
                                      color: "hsl(var(--foreground) / 0.2)",
                                    }),
                                  }}
                                >
                                  {state === "lit" ? "🔥" : state === "locked" ? "🔒" : d}
                                </div>
                                <span className="text-[9px] text-foreground/30">Day {d}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Personal Bests */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6">
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">🏆 Personal Bests</h3>
          <div className="glass-card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground/50 font-body">Flames Lit</span>
              <span className="text-sm font-bold text-primary">{flamesLit}</span>
            </div>
            {bestBeliefDay && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/50 font-body">Best Belief Day</span>
                <span className="text-sm font-bold text-primary">{bestBeliefDay}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground/50 font-body">Longest Flame Streak</span>
              <span className="text-sm font-bold text-primary">{bestStreak} days</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Memory Lane Modal */}
      <AnimatePresence>
        {modalDay && modalData?.reflection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setModalDay(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl"
              style={{ background: "hsl(161 96% 6%)", border: "1px solid hsl(var(--primary) / 0.15)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-lg font-bold text-primary" style={{ fontFamily: "var(--fd)" }}>🔥 Day {modalDay}</p>
                    <p className="text-sm text-foreground/60" style={{ fontFamily: "var(--fb)" }}>
                      {modalData.lesson?.title || ""}
                    </p>
                    {modalData.reflection.submitted_at && (
                      <p className="text-xs text-foreground/30 mt-0.5">
                        {new Date(modalData.reflection.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setModalDay(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--foreground) / 0.1)" }}>
                    <X size={16} className="text-foreground/50" />
                  </button>
                </div>

                {/* Manthan Question */}
                {modalData.lesson?.manthan_question && (
                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-foreground/30 mb-1" style={{ fontFamily: "var(--fa)" }}>THE QUESTION</p>
                    <GoldCard padding="16px">
                      <p className="text-sm italic text-foreground/70" style={{ fontFamily: "var(--fb)" }}>"{modalData.lesson.manthan_question}"</p>
                    </GoldCard>
                  </div>
                )}

                {/* Written Reflection */}
                {modalData.reflection.written_reflection && (
                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-foreground/30 mb-1" style={{ fontFamily: "var(--fa)" }}>YOUR ANSWER</p>
                    <GoldCard padding="16px">
                      <p className="text-sm text-foreground/80" style={{ fontFamily: "var(--fb)" }}>"{modalData.reflection.written_reflection}"</p>
                    </GoldCard>
                  </div>
                )}

                {/* AI Response */}
                {modalData.reflection.ai_response && (
                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-foreground/30 mb-1" style={{ fontFamily: "var(--fa)" }}>{masterName.toUpperCase()}'S WORDS TO YOU</p>
                    <GoldCard padding="16px" glow>
                      <p className="text-sm text-foreground leading-relaxed" style={{ fontFamily: "var(--fb)" }}>"{modalData.reflection.ai_response}"</p>
                    </GoldCard>
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-4 mt-2">
                  {modalData.reflection.confidence_rating && (
                    <div>
                      <p className="text-[10px] text-foreground/30 uppercase" style={{ fontFamily: "var(--fa)" }}>Your Belief</p>
                      <p className="text-lg text-primary">
                        {"★".repeat(modalData.reflection.confidence_rating)}{"☆".repeat(5 - modalData.reflection.confidence_rating)}
                      </p>
                    </div>
                  )}
                  {modalData.reflection.composite_score != null && (
                    <div>
                      <p className="text-[10px] text-foreground/30 uppercase" style={{ fontFamily: "var(--fa)" }}>Your Score</p>
                      <p className="text-lg font-bold text-primary">{modalData.reflection.composite_score}/100</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default FlameRedirect;
