import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import BottomNav from "@/components/BottomNav";

const FlameRedirect = () => {
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [avgConfidence, setAvgConfidence] = useState("–");
  const [flamesLit, setFlamesLit] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [flameDates, setFlameDates] = useState<Set<string>>(new Set());
  const [bestScore, setBestScore] = useState<string | null>(null);
  const [totalPracticeMin, setTotalPracticeMin] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Profiles
        const { data: prof } = await supabase
          .from("profiles")
          .select("current_streak, longest_streak")
          .eq("id", user.id)
          .maybeSingle();
        setStreak(prof?.current_streak ?? 0);
        setLongestStreak(prof?.longest_streak ?? 0);

        // Daily flames
        const { data: flames } = await supabase
          .from("daily_flames")
          .select("confidence_rating, flame_date")
          .eq("user_id", user.id);
        setFlamesLit(flames?.length ?? 0);

        const ratings = flames?.map(f => f.confidence_rating).filter(Boolean) as number[] ?? [];
        setAvgConfidence(
          ratings.length > 0
            ? `${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)} / 5`
            : "–"
        );

        const dates = new Set<string>();
        flames?.forEach(f => { if (f.flame_date) dates.add(f.flame_date); });
        setFlameDates(dates);

        // Anubhav practice sessions (completed)
        const { data: sessions } = await supabase
          .from("anubhav_practice_sessions")
          .select("word_clarity_score, smoothness_score, natural_sound_score, day_number, status")
          .eq("user_id", user.id)
          .eq("status", "complete")
          .order("day_number", { ascending: true });

        setSessionsCount(sessions?.length ?? 0);
        setTotalPracticeMin((sessions?.length ?? 0) * 8);

        if (sessions && sessions.length > 0) {
          const data = sessions.map(s => ({
            name: `Day ${s.day_number}`,
            score: Math.round(((Number(s.word_clarity_score) || 0) + (Number(s.smoothness_score) || 0) + (Number(s.natural_sound_score) || 0)) / 3),
          }));
          setChartData(data);

          const best = Math.max(...data.map(d => d.score));
          setBestScore(`${best}%`);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Generate last 30 days for calendar
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });

  const todayStr = new Date().toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Hero Logo */}
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
          Progress Sanctuary 🦋
        </motion.h1>

        {/* Streak Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="glass-card-gold p-8 mt-6 text-center rounded-3xl"
        >
          <motion.span
            className="text-6xl block flame-breath"
          >
            🔥
          </motion.span>
          <p className="font-display text-5xl font-bold text-primary mt-3 gold-text-glow">{streak}</p>
          <p className="text-sm text-foreground/50 font-body">Day Streak</p>
          <p className="text-xs text-foreground/30 font-body mt-1">Best: {longestStreak} days</p>
        </motion.div>

        {/* Stats Row */}
        <div className="flex gap-3 overflow-x-auto pb-2 mt-6 -mx-5 px-5">
          {[
            { icon: "🔥", value: String(streak), label: "Current Streak" },
            { icon: "🏆", value: String(longestStreak), label: "Best Streak" },
            { icon: "⭐", value: avgConfidence, label: "Avg Confidence" },
            { icon: "🦋", value: String(flamesLit), label: "Flames Lit" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex-shrink-0 glass-card p-4 min-w-[100px] text-center"
            >
              <span className="text-lg">{s.icon}</span>
              <p className="text-xl font-bold text-primary mt-1">{s.value}</p>
              <p className="text-[10px] text-foreground/50">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Confidence Journey Chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-5 mt-6">
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">Your Confidence Journey</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(46 100% 94% / 0.4)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(46 100% 94% / 0.4)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(161 96% 8%)", border: "1px solid hsl(44 99% 68% / 0.2)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(46 100% 94%)" }}
                  itemStyle={{ color: "#fed141" }}
                  formatter={(value: number) => [`${value}%`, "Score"]}
                />
                <Line type="monotone" dataKey="score" stroke="#fed141" strokeWidth={2} dot={{ fill: "#fed141", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-foreground/30 text-sm">
              Complete your first Anubhav session to see your confidence chart 📈
            </div>
          )}
        </motion.div>

        {/* Flame Calendar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6">
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">🦋 Your Flame Calendar</h3>
          <div className="glass-card p-4">
            <div className="grid grid-cols-7 gap-2">
              {last30Days.map(date => {
                const hasFlame = flameDates.has(date);
                const isToday = date === todayStr;
                return (
                  <div key={date} className="flex items-center justify-center">
                    <div
                      className={`w-6 h-6 rounded-full transition-all ${
                        hasFlame
                          ? "bg-primary shadow-[0_0_8px_rgba(254,209,65,0.4)]"
                          : "bg-foreground/10"
                      } ${isToday ? "ring-2 ring-primary/50 ring-offset-1 ring-offset-background" : ""}`}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-foreground/30 text-center mt-3 font-body">Last 30 days · Gold = flame submitted</p>
          </div>
        </motion.div>

        {/* Personal Bests */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6">
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">🏆 Personal Bests</h3>
          {sessionsCount > 0 ? (
            <div className="glass-card p-4 space-y-3">
              {bestScore && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground/50 font-body">Best Session Score</span>
                  <span className="text-sm font-bold text-primary">{bestScore}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/50 font-body">Total Sessions</span>
                <span className="text-sm font-bold text-primary">{sessionsCount}</span>
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
      <BottomNav />
    </div>
  );
};

export default FlameRedirect;
