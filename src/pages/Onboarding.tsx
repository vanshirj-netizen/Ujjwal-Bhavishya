import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [selectedMaster, setSelectedMaster] = useState<"gyani" | "gyanu" | null>(null);
  const navigate = useNavigate();

  // Placeholder — will come from DB after signup
  const firstName = "Student";
  const ubId = "UB-000001";

  const copyId = () => {
    navigator.clipboard.writeText(ubId);
    toast.success("Copied! ✅");
  };

  const nextStep = () => {
    if (step === 2) {
      navigate("/dashboard", { replace: true });
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" {...pageVariants} transition={{ duration: 0.3 }} className="glass-card-gold p-6 text-center">
              <h1 className="text-2xl font-display font-bold text-foreground">
                Namaste, {firstName}! 🙏
              </h1>
              <p className="text-sm text-foreground/70 mt-2">Welcome to Ujjwal Bhavishya.</p>
              <p className="text-xs text-foreground/50 mt-4">Your UB ID:</p>
              <button onClick={copyId} className="mt-2 flex items-center justify-center gap-2 mx-auto group">
                <span className="text-2xl font-mono-ub font-bold text-primary gold-text-glow">{ubId}</span>
                <span className="text-foreground/40 group-hover:text-foreground/70 text-sm">📋</span>
              </button>
              <p className="text-xs text-foreground/40 mt-3">
                This is your permanent learning identity. Use it every time you take a quiz.
              </p>
              <button onClick={nextStep} className="w-full mt-6 h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm gold-glow active:scale-[0.98] transition-transform">
                Got it, let's go →
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" {...pageVariants} transition={{ duration: 0.3 }}>
              <h2 className="text-xl font-display font-bold text-foreground text-center mb-2">
                Choose Your Guru
              </h2>
              <p className="text-xs text-foreground/50 text-center mb-6">
                Which master speaks to you?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "gyani" as const, emoji: "📖", title: "GYANI", subtitle: "The Wisdom Master", desc: "Deep understanding. Grammar clarity. The 'why' behind English." },
                  { key: "gyanu" as const, emoji: "⚡", title: "GYANU", subtitle: "The Hacks Master", desc: "Smart shortcuts. Exam tricks. Speak before you overthink." },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMaster(m.key)}
                    className={`p-4 rounded-xl text-left transition-all active:scale-[0.97] ${
                      selectedMaster === m.key ? "glass-card-gold" : "glass-card"
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    {selectedMaster === m.key && <span className="float-right text-primary">✓</span>}
                    <p className="text-sm font-bold text-foreground mt-2">{m.title}</p>
                    <p className="text-xs text-primary mt-0.5">{m.subtitle}</p>
                    <p className="text-xs text-foreground/50 mt-2 leading-relaxed">{m.desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-foreground/40 text-center mt-3">
                You'll see BOTH masters daily — this is just your spirit guide.
              </p>
              <button
                onClick={nextStep}
                disabled={!selectedMaster}
                className="w-full mt-6 h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm gold-glow active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                This is my master →
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" {...pageVariants} transition={{ duration: 0.3 }} className="text-center">
              <h2 className="text-xl font-display font-bold text-foreground mb-2">
                Your Journey Awaits
              </h2>
              <p className="text-sm text-foreground/60 mb-8">Here's your daily routine, {firstName}:</p>
              <div className="flex items-center justify-center gap-6">
                {[
                  { emoji: "🎬", label: "WATCH" },
                  { emoji: "📖", label: "LEARN" },
                  { emoji: "🔥", label: "FLAME" },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.2, duration: 0.4 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-3xl">{item.emoji}</span>
                    <span className="text-[10px] font-semibold text-foreground/60 tracking-wider">{item.label}</span>
                  </motion.div>
                ))}
              </div>
              <p className="text-xs text-foreground/40 mt-6">60 days. One lesson. One flame. Every day.</p>
              <button
                onClick={nextStep}
                className="w-full mt-8 h-12 rounded-lg bg-primary text-primary-foreground font-bold text-base gold-glow active:scale-[0.98] transition-transform"
              >
                Start Day 1 →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? "bg-primary w-6" : "bg-foreground/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
