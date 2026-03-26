import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PAYMENT_URL } from "@/lib/constants";
import { useActiveCourse } from "@/components/CourseSwitcher";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import GoldCard from "@/components/ui/GoldCard";
import SectionLabel from "@/components/ui/SectionLabel";

interface PracticeInfo {
  bestScore: number | null;
  attemptCount: number;
  hasReview: boolean;
}

const AnubhavHub = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = useActiveCourse();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("Your");
  const [currentDay, setCurrentDay] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState("free");
  const [practiceMap, setPracticeMap] = useState<Record<number, PracticeInfo>>({});
  const [flameMap, setFlameMap] = useState<Record<number, boolean>>({});
  const [weekData, setWeekData] = useState<Record<number, string>>({});
  const [scoreChartData, setScoreChartData] = useState<{ name: string; score: number }[]>([]);
  const [lessonMap, setLessonMap] = useState<Record<number, boolean>>({});

  // Stats
  const [daysPracticed, setDaysPracticed] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [avgSpeaking, setAvgSpeaking] = useState("–");
  const [avgWriting, setAvgWriting] = useState("–");
  const [hasWritingScores, setHasWritingScores] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, enrollRes, sessionsRes, flameRes, weeksRes, bestAttemptsRes, lessonProgressRes] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
          supabase.from("enrollments").select("current_day, payment_status").eq("user_id", user.id).eq("is_active", true).eq("course_id", courseId).maybeSingle(),
          supabase.from("practice_sessions").select("day_number, composite_score, is_best_attempt, master_message, writing_composite_score").eq("user_id", user.id).eq("course_id", courseId).eq("status", "complete"),
          supabase.from("reflection_sessions").select("day_number").eq("user_id", user.id).eq("course_id", courseId),
          supabase.from("course_weeks").select("week_number, theme_name").eq("course_id", courseId).order("week_number", { ascending: true }),
          supabase.from("practice_sessions").select("composite_score, writing_composite_score").eq("user_id", user.id).eq("course_id", courseId).eq("status", "complete").eq("is_best_attempt", true),
          supabase.from("progress").select("day_number, lesson_complete").eq("user_id", user.id),
        ]);

        // Profile
        const name = profileRes.data?.full_name;
        if (name && name !== "Student") setFirstName(name.split(" ")[0] + "'s");

        // Enrollment
        setCurrentDay(enrollRes.data?.current_day ?? 1);
        setPaymentStatus(enrollRes.data?.payment_status ?? "free");

        // Practice sessions → map by day_number
        const sessions = sessionsRes.data ?? [];
        const pMap: Record<number, PracticeInfo> = {};
        const daySet = new Set<number>();
        sessions.forEach(s => {
          daySet.add(s.day_number);
          if (!pMap[s.day_number]) {
            pMap[s.day_number] = { bestScore: null, attemptCount: 0, hasReview: false };
          }
          pMap[s.day_number].attemptCount++;
          const score = Number(s.composite_score) || 0;
          if (pMap[s.day_number].bestScore === null || score > pMap[s.day_number].bestScore!) {
            pMap[s.day_number].bestScore = score;
          }
          if (s.is_best_attempt && s.master_message) {
            pMap[s.day_number].hasReview = true;
          }
        });
        setPracticeMap(pMap);
        setDaysPracticed(daySet.size);
        setTotalSessions(sessions.length);

        // Compute chart data from practiceMap + writing scores
        const writingByDay: Record<number, number> = {};
        sessions.forEach(s => {
          const ws = Number(s.writing_composite_score);
          if (s.writing_composite_score != null && !isNaN(ws) && ws > 0) {
            if (!writingByDay[s.day_number] || ws > writingByDay[s.day_number]) {
              writingByDay[s.day_number] = ws;
            }
          }
        });

        const cData = Object.entries(pMap)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([day, data]) => ({
            name: `Day ${day}`,
            score: data.bestScore ?? 0,
            writingScore: writingByDay[Number(day)] ?? undefined,
          }));
        setScoreChartData(cData);
        setTotalSessions(sessions.length);

        const hasAnyWriting = Object.keys(writingByDay).length > 0;

        // Avg scores from best attempts
        const bestAttempts = bestAttemptsRes.data ?? [];
        if (bestAttempts.length > 0) {
          const speakScores = bestAttempts.map(s => Number(s.composite_score) || 0).filter(s => s > 0);
          if (speakScores.length > 0) {
            const avg = Math.round(speakScores.reduce((a, b) => a + b, 0) / speakScores.length);
            setAvgSpeaking(`${avg}/100`);
          }
          const writeScores = bestAttempts
            .filter(s => s.writing_composite_score != null)
            .map(s => Number(s.writing_composite_score))
            .filter(s => s > 0);
          if (writeScores.length > 0) {
            const avg = Math.round(writeScores.reduce((a, b) => a + b, 0) / writeScores.length);
            setAvgWriting(`${avg}/100`);
            setHasWritingScores(true);
          } else {
            setHasWritingScores(hasAnyWriting);
          }
        }

        // Flame map
        const fMap: Record<number, boolean> = {};
        flameRes.data?.forEach(f => { fMap[f.day_number] = true; });
        setFlameMap(fMap);

        // Week data
        const wMap: Record<number, string> = {};
        weeksRes.data?.forEach(w => { wMap[w.week_number] = w.theme_name; });
        setWeekData(wMap);

        // Lesson progress map
        const lMap: Record<number, boolean> = {};
        lessonProgressRes.data?.forEach(row => { lMap[row.day_number] = row.lesson_complete === true; });
        setLessonMap(lMap);
      } catch { /* silent */ } finally { setLoading(false); }
    };
    load();
  }, [location.key, courseId]);

  const getDayState = (day: number): "completed" | "current" | "unlocked" | "locked_payment" | "locked" | "lesson_pending" => {
    if (practiceMap[day]) return "completed";
    if (paymentStatus === "free" && day > 5) return "locked_payment";
    if (day <= currentDay && !lessonMap[day] && !practiceMap[day]) return "lesson_pending";
    if (day === currentDay && lessonMap[day]) return "current";
    if (day < currentDay && lessonMap[day]) return "unlocked";
    return "locked";
  };

  const handleDayTap = (day: number, state: string) => {
    switch (state) {
      case "completed":
        navigate(`/anubhav/${day}?mode=readonly`);
        break;
      case "current":
      case "unlocked":
        navigate(`/anubhav/${day}`);
        break;
      case "lesson_pending":
        toast(`Complete Day ${day}'s lesson first 📖`);
        navigate(`/day/${day}`);
        break;
      case "locked_payment":
        window.open(PAYMENT_URL, "_blank");
        break;
      case "locked":
        toast("Complete the days before this first 🔒");
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
        <PageHeader title={<><span className="text-gradient-gold">{firstName}</span> Anubhav</>} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: "🎙️", value: String(daysPracticed), label: "Days Practiced" },
            { icon: "🔁", value: String(totalSessions), label: "Total Sessions" },
            { icon: "⭐", value: avgScore, label: "Avg Score" },
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

        {/* Score Journey Chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-6">
          <GoldCard padding="20px">
            <p className="text-[10px] uppercase tracking-wider mb-4" style={{ fontFamily: "var(--fa)", color: "rgba(255,252,239,0.60)", letterSpacing: "3px" }}>Your Score Journey</p>
            {scoreChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={scoreChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,252,239,0.55)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[(() => { const scores = scoreChartData.map(d => d.score); return Math.max(0, Math.min(...scores) - 10); })(), (() => { const scores = scoreChartData.map(d => d.score); return Math.min(100, Math.max(...scores) + 10); })()]} tick={{ fontSize: 10, fill: "rgba(255,252,239,0.55)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(161 96% 8%)", border: "1px solid rgba(253,193,65,0.2)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#fffcef" }}
                    itemStyle={{ color: "#fed141" }}
                    formatter={(value: number) => [`${value}/100`, "Score"]}
                  />
                  <Line type="monotone" dataKey="score" stroke="#fed141" strokeWidth={2} dot={{ fill: "#fed141", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm" style={{ color: "rgba(255,252,239,0.55)" }}>
                Complete your first Anubhav to see your score chart 📈
              </div>
            )}
          </GoldCard>
        </motion.div>

        {/* 60-Day Visual Map */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
          <SectionLabel className="mb-3">Your Anubhav Journey</SectionLabel>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 60 }, (_, i) => {
              const day = i + 1;
              const state = getDayState(day);
              const weekNum = Math.ceil(day / 5);
              const showWeekLabel = (day - 1) % 5 === 0;
              const practice = practiceMap[day];
              return (
                <React.Fragment key={day}>
                  {showWeekLabel && day <= 60 && (
                    <div className="col-span-6 mt-2 mb-1 first:mt-0">
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,252,239,0.55)", fontFamily: "var(--fa)" }}>
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
                        : state === "lesson_pending" ? "border border-foreground/12 opacity-60"
                        : state === "locked_payment" ? "border border-primary/10 opacity-50"
                        : "opacity-25"
                    }`}
                    style={{ background: state === "completed" ? "rgba(253,193,65,0.08)" : state === "lesson_pending" ? "rgba(255,252,239,0.02)" : state === "unlocked" ? "rgba(253,193,65,0.03)" : "rgba(255,252,239,0.03)" }}
                  >
                    {state === "current" && (
                      <span className="absolute -top-2 text-[8px] font-bold" style={{ color: "#ffc300", fontFamily: "var(--fa)" }}>TODAY</span>
                    )}
                    {state === "lesson_pending" ? (
                      <>
                        <span className="text-[10px]">📖</span>
                        <span className="font-bold text-foreground/40">{day}</span>
                      </>
                    ) : (
                      <span className={`font-bold ${
                        state === "completed" || state === "current" ? "text-primary"
                          : state === "unlocked" ? "text-foreground/60"
                          : "text-foreground/20"
                      }`}>
                        {state === "completed" ? day : state === "locked_payment" ? "🔒" : day}
                      </span>
                    )}
                    {state === "completed" && practice?.bestScore != null && (
                      <span className="text-[7px] text-primary/60">{practice.bestScore}</span>
                    )}
                    {state === "completed" && flameMap[day] && (
                      <span className="absolute bottom-0.5 right-0.5 text-[8px]">🔥</span>
                    )}
                  </motion.button>
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 text-center pb-4">
          <p className="text-xs" style={{ color: "rgba(255,252,239,0.55)" }}>Complete each day's lesson to unlock Anubhav practice 🎯</p>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default AnubhavHub;
