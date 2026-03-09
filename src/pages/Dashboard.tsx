import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";

const courseCards = [
  { name: "Aarambh", icon: "🗣️", tagline: "English Communication", active: true, progress: "0/60" },
  { name: "Vikas", icon: "📈", tagline: "Personal Development", active: false },
  { name: "Utkarsh", icon: "💻", tagline: "Tech & AI Skills", active: false },
  { name: "Margdarshan", icon: "🧭", tagline: "Career Counselling", active: false },
];

const Dashboard = () => {
  // Placeholder data — will be replaced with real DB queries
  const firstName = "Student";
  const currentDay = 1;
  const streak = 0;
  const completedDays = 0;
  const flamesSubmitted = 0;

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="px-5 pt-6 max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-display font-bold text-primary gold-text-glow">
            Namaste, {firstName} 👋
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            Day {currentDay} of 60 &nbsp;•&nbsp; 🔥 {streak}-day streak
          </p>
        </motion.div>

        {/* Progress Ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
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
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="glass-card-gold p-5 mt-8"
        >
          <p className="text-xs text-primary font-semibold tracking-wide uppercase">Today — Day {currentDay}</p>
          <h2 className="text-lg font-display font-bold text-foreground mt-1">Introduction & Basics</h2>
          <div className="flex gap-4 mt-3 text-lg">
            {["🎬", "📖", "⚡", "🔥"].map((emoji, i) => (
              <span key={i} className="opacity-40">{emoji}</span>
            ))}
          </div>
          <button
            className="w-full mt-4 h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm gold-glow transition-transform active:scale-[0.98]"
          >
            Continue Day {currentDay} →
          </button>
        </motion.div>

        {/* Course Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-8"
        >
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">Your UB Journey</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {courseCards.map((course) => (
              <div
                key={course.name}
                className={`flex-shrink-0 w-40 p-4 rounded-xl ${
                  course.active
                    ? "glass-card-gold"
                    : "glass-card opacity-50"
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
              </div>
            ))}
          </div>
        </motion.div>

        {/* 60-Day Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
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

      <BottomNav />
    </div>
  );
};

export default Dashboard;
