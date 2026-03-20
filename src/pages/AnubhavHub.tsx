import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCourse } from "@/components/CourseSwitcher";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import GoldCard from "@/components/ui/GoldCard";
import GlassButton from "@/components/ui/GlassButton";
import GoldButton from "@/components/ui/GoldButton";
import { X } from "lucide-react";

const AnubhavHub = () => {
  const navigate = useNavigate();
  const courseId = useActiveCourse();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");

  // Stats
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [avgScore, setAvgScore] = useState("–");

  // Personal bests
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalPracticeMin, setTotalPracticeMin] = useState(0);

  // Week accordion
  const [weeks, setWeeks] = useState<any[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, any>>({});
  const [sessionMap, setSessionMap] = useState<Record<number, any>>({});
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  // Drawer
  const [drawerDay, setDrawerDay] = useState<number | null>(null);
  const [lessonMap, setLessonMap] = useState<Record<number, any>>({});

  // Daily attempts
  const [todayAttempts, setTodayAttempts] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        setFirstName(prof?.full_name?.split(" ")[0] || "Student");

        // Student progress
        const { data: sp } = await supabase
          .from("student_progress")
          .select("current_streak, longest_streak_ever, best_score_ever, total_sessions_completed")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .maybeSingle();
        setCurrentStreak(sp?.current_streak ?? 0);
        setBestStreak(sp?.longest_streak_ever ?? 0);
        setBestScore(sp?.best_score_ever ? Number(sp.best_score_ever) : null);
        setTotalSessions(sp?.total_sessions_completed ?? 0);
        setTotalPracticeMin((sp?.total_sessions_completed ?? 0) * 7);

        // Avg score from best attempts
        const { data: bestAttempts } = await supabase
          .from("practice_sessions")
          .select("composite_score")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .eq("status", "complete")
          .eq("is_best_attempt", true);

        if (bestAttempts && bestAttempts.length > 0) {
          const avg = bestAttempts.reduce((sum, s) => sum + (Number(s.composite_score) || 0), 0) / bestAttempts.length;
          setAvgScore(`${Math.round(avg)} / 100`);
        }

        // Progress (lesson_complete check)
        const { data: progressData } = await supabase
          .from("progress")
          .select("day_number, lesson_complete, anubhav_complete")
          .eq("user_id", user.id)
          .eq("course_id", courseId);
        const pMap: Record<number, any> = {};
        progressData?.forEach(p => { pMap[p.day_number] = p; });
        setProgressMap(pMap);

        // Best practice sessions per day
        const { data: sessions } = await supabase
          .from("practice_sessions")
          .select("day_number, composite_score, top_error_summary, ai_feedback")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .eq("status", "complete")
          .eq("is_best_attempt", true);
        const sMap: Record<number, any> = {};
        sessions?.forEach(s => { sMap[s.day_number] = s; });
        setSessionMap(sMap);

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
          const maxDay = Math.max(0, ...Object.keys(pMap).map(Number).filter(d => pMap[d]?.lesson_complete));
          for (const w of weeksData) {
            const dw = w.days_in_week ?? 5;
            if (maxDay > dayCounter + dw) {
              dayCounter += dw;
              currentW = w.week_number + 1;
            } else {
              currentW = w.week_number;
              break;
            }
          }
          setExpandedWeek(currentW);
        }

        // Lessons
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("day_number, title")
          .eq("course_id", courseId);
        const lMap: Record<number, any> = {};
        lessonsData?.forEach(l => { lMap[l.day_number] = l; });
        setLessonMap(lMap);

        // Today's attempts (server-side date handled via submitted_at)
        const { data: todayData } = await supabase
          .from("practice_sessions")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .eq("status", "complete");
        // Count today's in IST
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffset);
        const istDateStr = istNow.toISOString().split("T")[0];
        // 5:30 AM IST cutoff
        const cutoffIST = new Date(`${istDateStr}T05:30:00+05:30`);
        if (istNow.getHours() < 5 || (istNow.getHours() === 5 && istNow.getMinutes() < 30)) {
          // Before 5:30 AM, use previous day's cutoff
          cutoffIST.setDate(cutoffIST.getDate() - 1);
        }
        // We'll just show the count from student_progress for now; real enforcement is server-side
        setTodayAttempts(0); // Will be recalculated properly

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

  const getDayState = (day: number): "locked" | "available" | "practiced" => {
    if (sessionMap[day]) return "practiced";
    const prog = progressMap[day];
    if (prog?.lesson_complete) return "available";
    return "locked";
  };

  const drawerData = drawerDay ? {
    session: sessionMap[drawerDay],
    lesson: lessonMap[drawerDay],
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
        <PageHeader title={`${firstName}'s Anubhav`} />

        {/* 3 Stat Cards */}
        <div className="flex gap-3 mt-4">
          {[
            { icon: "🔥", value: String(currentStreak), label: "Current Streak" },
            { icon: "🏆", value: String(bestStreak), label: "Best Streak" },
            { icon: "⭐", value: avgScore, label: "Avg Score" },
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

        {/* Your Progress Journey */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">Your Progress Journey</h3>

          <div className="space-y-2">
            {weeks.map(w => {
              const days = getDayRange(w.week_number);
              const isExpanded = expandedWeek === w.week_number;
              const practicedCount = days.filter(d => getDayState(d) === "practiced").length;

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
                              background: getDayState(d) === "practiced" ? "hsl(var(--primary))" : getDayState(d) === "available" ? "hsl(var(--foreground) / 0.3)" : "hsl(var(--foreground) / 0.1)",
                              boxShadow: getDayState(d) === "practiced" ? "0 0 6px hsl(var(--primary) / 0.4)" : "none",
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
                            const score = sessionMap[d]?.composite_score;
                            return (
                              <button
                                key={d}
                                onClick={() => {
                                  if (state === "practiced") setDrawerDay(d);
                                  else if (state === "available") navigate(`/anubhav/${d}`);
                                }}
                                className="flex flex-col items-center gap-1"
                                disabled={state === "locked"}
                                title={state === "locked" ? "Complete the lesson first to unlock practice." : undefined}
                              >
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                                  style={{
                                    ...(state === "practiced" ? {
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
                                  {state === "practiced" ? (score ?? "✓") : state === "locked" ? "🔒" : d}
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
          {totalSessions > 0 ? (
            <div className="glass-card p-4 space-y-3">
              {bestScore != null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground/50 font-body">Best Session Score</span>
                  <span className="text-sm font-bold text-primary">{bestScore}/100</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/50 font-body">Total Sessions</span>
                <span className="text-sm font-bold text-primary">{totalSessions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/50 font-body">Total Practice Time</span>
                <span className="text-sm font-bold text-primary">~{totalPracticeMin} minutes</span>
              </div>
            </div>
          ) : (
            <div className="glass-card p-5 text-center text-foreground/30 text-sm">
              Complete your first Anubhav session to unlock your personal bests 🎯
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom Drawer for Practiced Day */}
      <AnimatePresence>
        {drawerDay && drawerData?.session && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setDrawerDay(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full max-w-lg rounded-t-3xl"
              style={{ background: "hsl(161 96% 6%)", border: "1px solid hsl(var(--primary) / 0.15)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-lg font-bold text-primary" style={{ fontFamily: "var(--fd)" }}>Day {drawerDay} — {drawerData.lesson?.title || ""}</p>
                  </div>
                  <button onClick={() => setDrawerDay(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--foreground) / 0.1)" }}>
                    <X size={16} className="text-foreground/50" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground/50">Best Score</span>
                    <span className="text-lg font-bold text-primary">{drawerData.session.composite_score ?? "–"}/100</span>
                  </div>
                  {drawerData.session.top_error_summary && (
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-foreground/30" style={{ fontFamily: "var(--fa)" }}>Top Error</span>
                      <p className="text-sm text-foreground/60 mt-1">{drawerData.session.top_error_summary}</p>
                    </div>
                  )}
                  {drawerData.session.ai_feedback && (
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-foreground/30" style={{ fontFamily: "var(--fa)" }}>Master Feedback</span>
                      <p className="text-sm text-foreground/70 mt-1 line-clamp-3">{drawerData.session.ai_feedback}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-5">
                  <GlassButton onClick={() => { setDrawerDay(null); navigate(`/anubhav/${drawerDay}`); }} className="flex-1 text-sm">
                    🎙️ Practice Again
                  </GlassButton>
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

export default AnubhavHub;
