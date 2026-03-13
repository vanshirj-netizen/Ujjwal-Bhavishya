import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PAYMENT_URL, COURSE_ID } from "@/lib/constants";
import BottomNav from "@/components/BottomNav";

const courseCards = [
  { name: "Aarambh", icon: "🗣️", tagline: "English Communication", active: true },
  { name: "Vikas", icon: "📈", tagline: "Personal Development", active: false },
  { name: "Utkarsh", icon: "💻", tagline: "Tech & AI Skills", active: false },
  { name: "Margdarshan", icon: "🧭", tagline: "Career Counselling", active: false },
];

// COURSE_ID imported from constants

type DayProgress = {
  day_number: number;
  day_complete: boolean | null;
  gamma_complete: boolean | null;
  gyani_complete: boolean | null;
  gyanu_complete: boolean | null;
  quiz_complete: boolean | null;
};

type LessonInfo = {
  day_number: number;
  title: string;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [firstName, setFirstName] = useState("");
  const [streak, setStreak] = useState(0);
  const [completedDays, setCompletedDays] = useState(0);
  const [flamesSubmitted, setFlamesSubmitted] = useState(0);
  const [todayLesson, setTodayLesson] = useState<any>(null);
  const [todayProgress, setTodayProgress] = useState<any>(null);
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [displayDay, setDisplayDay] = useState(1);
  const [allProgress, setAllProgress] = useState<DayProgress[]>([]);
  const [allLessons, setAllLessons] = useState<LessonInfo[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const user = session.user;

      const { data: profile } = await supabase.from("profiles").select("full_name, current_streak").eq("id", user.id).maybeSingle();
      const fullName = (profile?.full_name && profile.full_name !== "Student") ? profile.full_name : user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "";
      setFirstName(fullName ? fullName.split(" ")[0] : "");
      setStreak(profile?.current_streak ?? 0);

      const { data: enrollData } = await supabase.from("enrollments").select("current_day, payment_status, days_completed").eq("user_id", user.id).eq("is_active", true).maybeSingle();
      setEnrollmentData(enrollData);

      // Fetch all progress for day grid (moved up for fallback calculations)
      let allProg: DayProgress[] = [];
      try {
        const { data } = await supabase.from("progress").select("day_number, day_complete, gamma_complete, gyani_complete, gyanu_complete, quiz_complete").eq("user_id", user.id);
        allProg = data ?? [];
        setAllProgress(allProg);
      } catch { /* ignore */ }

      // Derive completedDays from progress as fallback
      const completedFromProgress = allProg.filter(p => p.day_complete).length;
      const resolvedCompleted = enrollData?.days_completed ?? completedFromProgress;
      setCompletedDays(resolvedCompleted);

      // displayDay: enrollment current_day, or fallback to next day after last completed
      const day = (enrollData?.current_day ?? 0) > 0 ? enrollData!.current_day! : (completedFromProgress > 0 ? completedFromProgress + 1 : 1);
      setDisplayDay(day);

      // Fetch today's lesson
      const { data: lessonData } = await supabase.from("lessons").select("title, week_number, day_number").eq("day_number", day).eq("course_id", COURSE_ID).maybeSingle();
      setTodayLesson(lessonData);

      // Fetch today's progress
      const { data: progressData } = await supabase.from("progress").select("gamma_complete, gyani_complete, gyanu_complete, quiz_complete, day_complete").eq("user_id", user.id).eq("day_number", day).maybeSingle();
      setTodayProgress(progressData);

      const { count: flamesCount } = await supabase.from("daily_flames").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      setFlamesSubmitted(flamesCount ?? 0);

      // Fetch all lesson titles
      try {
        const { data: allLess } = await supabase.from("lessons").select("day_number, title").eq("course_id", COURSE_ID);
        setAllLessons(allLess ?? []);
      } catch { /* ignore */ }
    };
    fetchUserData();
  }, [location.key]);

  const getDayProgress = (dayNum: number) => allProgress.find(p => p.day_number === dayNum);
  const getDayTitle = (dayNum: number) => {
    const l = allLessons.find(l => l.day_number === dayNum);
    return l?.title?.replace(/^Day\s*\d+:\s*/i, "") || "";
  };

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
            Namaste{firstName ? `, ${firstName}` : ""} 👋 &nbsp;•&nbsp; Day {displayDay} of 60 &nbsp;•&nbsp; 🔥 {streak}-day streak
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
          className="glass-card-gold p-5 mt-8 relative overflow-hidden cursor-pointer"
          onClick={() => {
            if (displayDay > 5 && enrollmentData?.payment_status === "free") {
              toast("🔒 Upgrade to unlock Day " + displayDay);
              return;
            }
            navigate("/day/" + displayDay);
          }}
        >
          {/* Free tier lock overlay */}
          {displayDay > 5 && enrollmentData?.payment_status === "free" && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
              <span className="text-3xl">🔒</span>
              <span className="text-xs text-foreground/50 mt-1">Upgrade to unlock</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-foreground/40 uppercase tracking-wider">
              {todayLesson?.week_number ? `Week ${todayLesson.week_number}` : "Today"}
            </p>
            {streak > 0 && <span className="text-xs text-primary font-bold">🔥 {streak}</span>}
          </div>
          <p className="text-3xl font-display font-bold text-primary mt-1">Day {displayDay}</p>
          <h2 className="text-lg font-display font-bold text-foreground mt-1 line-clamp-2">
            {todayLesson?.title?.replace(/^Day\s*\d+:\s*/i, "") || "Loading..."}
          </h2>
          {/* Mini step progress */}
          <div className="flex gap-2 mt-3">
            {[
              todayProgress?.gamma_complete,
              todayProgress?.gyani_complete,
              todayProgress?.gyanu_complete,
              todayProgress?.quiz_complete,
              todayProgress?.day_complete,
            ].map((done, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full ${done ? "bg-primary shadow-[0_0_6px_hsl(var(--primary))]" : "bg-foreground/20"}`} />
            ))}
          </div>
          <button className="w-full mt-4 h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm gold-glow transition-transform active:scale-[0.98]">
            {todayProgress?.day_complete ? "Day Complete ✦" : todayProgress?.gamma_complete ? "Continue →" : `Start Day ${displayDay} →`}
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
                  <p className="text-xs text-primary mt-2 font-medium">{completedDays}/60 days</p>
                ) : (
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/50">
                    Coming Soon
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* 60-Day Map — Rich Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-8"
        >
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">60-Day Map</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 60 }, (_, i) => {
              const day = i + 1;
              const prog = getDayProgress(day);
              const title = getDayTitle(day);
              const isFreeUser = enrollmentData?.payment_status === "free" || !enrollmentData;
              const isLocked = isFreeUser && day > 5;
              const isCompleted = prog?.day_complete === true;
              const isInProgress = prog && !prog.day_complete && (prog.gamma_complete || prog.gyani_complete || prog.gyanu_complete || prog.quiz_complete);
              const hasLesson = !!title;

              // STATE 1 — LOCKED
              if (isLocked) {
                return (
                  <div
                    key={day}
                    onClick={() => window.open(PAYMENT_URL, "_blank")}
                    className="glass-card p-3 rounded-xl relative opacity-60 cursor-not-allowed"
                  >
                    <p className="text-xs font-body text-foreground/30">Day {day}</p>
                    <div className="flex items-center justify-center my-2">
                      <span className="text-2xl text-foreground/20">🔒</span>
                    </div>
                    <p className="text-[10px] font-body text-foreground/20">Upgrade to unlock</p>
                  </div>
                );
              }

              // STATE 2 — COMPLETED
              if (isCompleted) {
                return (
                  <div
                    key={day}
                    onClick={() => navigate("/day/" + day)}
                    className="glass-card p-3 rounded-xl cursor-pointer relative transition-transform active:scale-[0.97] border border-primary/40"
                  >
                    <div className="absolute top-2 right-2 bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">✓</div>
                    <p className="text-xs font-body text-foreground/40">Day {day}</p>
                    {title && <p className="text-sm font-display font-semibold text-foreground line-clamp-2 mt-1">{title}</p>}
                    <p className="text-[10px] text-primary/60 mt-2">Completed ✦</p>
                  </div>
                );
              }

              // STATE 3 — IN PROGRESS
              if (isInProgress) {
                return (
                  <div
                    key={day}
                    onClick={() => navigate("/day/" + day)}
                    className="glass-card p-3 rounded-xl cursor-pointer relative transition-transform active:scale-[0.97]"
                  >
                    <div className="absolute top-2 right-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                      </span>
                    </div>
                    <p className="text-xs font-body text-foreground/40">Day {day}</p>
                    {title && <p className="text-sm font-display font-semibold text-foreground line-clamp-2 mt-1">{title}</p>}
                    <div className="flex gap-1 mt-2">
                      {[prog?.gamma_complete, prog?.gyani_complete, prog?.gyanu_complete, prog?.quiz_complete, prog?.day_complete].map((done, j) => (
                        <div key={j} className={`w-1.5 h-1.5 rounded-full ${done ? "bg-primary" : "bg-foreground/20"}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-primary mt-1 font-medium">Continue →</p>
                  </div>
                );
              }

              // STATE 4 — NOT STARTED (accessible)
              return (
                <div
                  key={day}
                  onClick={() => {
                    if (hasLesson) {
                      navigate("/day/" + day);
                    } else {
                      toast("Day " + day + " content coming soon ✦");
                    }
                  }}
                  className="glass-card p-3 rounded-xl cursor-pointer transition-transform active:scale-[0.97]"
                >
                  <p className="text-xs font-body text-foreground/30">Day {day}</p>
                  {hasLesson ? (
                    <p className="text-sm font-display font-semibold text-foreground/70 line-clamp-2 mt-1">{title}</p>
                  ) : (
                    <p className="text-xs text-foreground/20 mt-1">Coming soon</p>
                  )}
                  <p className="text-[10px] text-foreground/30 mt-2">Start →</p>
                </div>
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
