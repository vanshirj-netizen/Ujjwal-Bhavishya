import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const courseCards = [
  { name: "Aarambh", icon: "🗣️", tagline: "English Communication", active: true, progress: "0/60" },
  { name: "Vikas", icon: "📈", tagline: "Personal Development", active: false },
  { name: "Utkarsh", icon: "💻", tagline: "Tech & AI Skills", active: false },
  { name: "Margdarshan", icon: "🧭", tagline: "Career Counselling", active: false },
];

const Dashboard = () => {
  const [firstName, setFirstName] = useState("");
  const [streak, setStreak] = useState(0);
  const [completedDays, setCompletedDays] = useState(0);
  const [flamesSubmitted, setFlamesSubmitted] = useState(0);
  const currentDay = completedDays + 1;

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const user = session.user;

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, current_streak")
        .eq("id", user.id)
        .maybeSingle();

      // Name fallback chain
      const fullName = (profile?.full_name && profile.full_name !== "Student")
        ? profile.full_name
        : user.user_metadata?.full_name
          || user.user_metadata?.name
          || user.email?.split("@")[0]
          || "";
      setFirstName(fullName ? fullName.split(" ")[0] : "");
      setStreak(profile?.current_streak ?? 0);

      // Fetch completed days
      const { count: daysCount } = await supabase
        .from("progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("day_complete", true);
      setCompletedDays(daysCount ?? 0);

      // Fetch flames submitted
      const { count: flamesCount } = await supabase
        .from("daily_flames")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setFlamesSubmitted(flamesCount ?? 0);
    };
    fetchUserData();
  }, []);

  // Entry animation orchestration
  const seq = {
    butterfly: { delay: 0, duration: 0.6 },
    header: { delay: 0.3, duration: 0.3 },
    ring: { delay: 0.5, duration: 0.4 },
    lesson: { delay: 0.7, duration: 0.35 },
    courseBase: 0.9,
    courseStagger: 0.15,
    nav: { delay: 1.2, duration: 0.3 },
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top relative overflow-hidden">
      {/* Butterfly entry */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 text-3xl z-20 pointer-events-none"
        initial={{ bottom: -40, opacity: 0 }}
        animate={{ bottom: "50%", opacity: [0, 1, 1, 0] }}
        transition={{ delay: seq.butterfly.delay, duration: seq.butterfly.duration, ease: "easeOut" }}
      >
        🦋
      </motion.div>

      {/* Gold particle trail behind butterfly */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary pointer-events-none z-10"
          initial={{ bottom: -40, opacity: 0 }}
          animate={{ bottom: "48%", opacity: [0, 0.6, 0] }}
          transition={{ delay: seq.butterfly.delay + 0.1 * i, duration: seq.butterfly.duration * 0.8, ease: "easeOut" }}
        />
      ))}

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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: seq.header.delay, duration: seq.header.duration }}
        >
          <p className="text-sm text-foreground/60 mt-2">
            Namaste{firstName ? `, ${firstName}` : ""} 👋 &nbsp;•&nbsp; Day {currentDay} of 60 &nbsp;•&nbsp; 🔥 {streak}-day streak
          </p>
        </motion.div>

        {/* Progress Ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: seq.ring.delay, duration: seq.ring.duration }}
          className="flex flex-col items-center mt-8"
        >
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <motion.circle
                cx="60" cy="60" r="52" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - completedDays / 60) }}
                transition={{ duration: 0.8, ease: "easeOut", delay: seq.ring.delay + 0.1 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-primary font-display">{completedDays}/60</span>
              <span className="text-xs text-foreground/50">Days Complete</span>
            </div>
          </div>
          <p className="text-xs text-foreground/50 mt-3">🦋 {flamesSubmitted} Flames submitted this journey</p>
        </motion.div>

        {/* Today's Lesson Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: seq.lesson.delay, duration: seq.lesson.duration }}
          className="glass-card-gold p-5 mt-8"
        >
          <p className="text-xs text-primary font-semibold tracking-wide uppercase">Today — Day {currentDay}</p>
          <h2 className="text-lg font-display font-bold text-foreground mt-1">Introduction & Basics</h2>
          <div className="flex gap-4 mt-3 text-lg">
            {["🎬", "📖", "⚡", "🔥"].map((emoji, i) => (
              <span key={i} className="opacity-40">{emoji}</span>
            ))}
          </div>
          <button className="w-full mt-4 h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm gold-glow transition-transform active:scale-[0.98]">
            Continue Day {currentDay} →
          </button>
        </motion.div>

        {/* Course Cards */}
        <div className="mt-8">
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: seq.courseBase }}
            className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3"
          >
            Your UB Journey
          </motion.h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {courseCards.map((course, i) => (
              <motion.div
                key={course.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: seq.courseBase + i * seq.courseStagger, duration: 0.3 }}
                className={`flex-shrink-0 w-40 p-4 rounded-xl ${
                  course.active ? "glass-card-gold" : "glass-card opacity-50"
                }`}
              >
                <span className="text-2xl">{course.icon}</span>
                <p className="text-sm font-semibold text-foreground mt-2">{course.name}</p>
                <p className="text-xs text-foreground/50 mt-0.5">{course.tagline}</p>
                {course.active ? (
                  <p className="text-xs text-primary mt-2 font-medium">{course.progress} days</p>
                ) : (
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/50">
                    Coming Soon
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* 60-Day Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-8"
        >
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">60-Day Map</h3>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 60 }, (_, i) => {
              const day = i + 1;
              const isToday = day === currentDay;
              const isCompleted = day < currentDay;
              const isFree = day <= 5;
              const isLocked = !isFree && day > currentDay;

              return (
                <button
                  key={day}
                  className={`w-full aspect-square rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "border-2 border-primary text-primary pulse-gold"
                        : isLocked
                          ? "bg-muted/30 text-foreground/20"
                          : "border border-foreground/20 text-foreground/40"
                  }`}
                >
                  {isCompleted ? "✓" : isLocked ? "🔒" : day}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Bottom Nav with entry animation */}
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ delay: seq.nav.delay, duration: seq.nav.duration, ease: "easeOut" }}
      >
        <BottomNav />
      </motion.div>
    </div>
  );
};

export default Dashboard;
