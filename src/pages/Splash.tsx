import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const LOAD_DURATION = 2500;

const Butterfly = ({ delay, x }: { delay: number; x: number }) => (
  <motion.span
    className="absolute text-lg"
    style={{ left: `${x}%`, bottom: -30 }}
    initial={{ y: 0, opacity: 0 }}
    animate={{ y: -600, opacity: [0, 1, 1, 0] }}
    transition={{
      duration: 4 + Math.random() * 2,
      delay,
      repeat: Infinity,
      ease: "easeOut",
    }}
  >
    🦋
  </motion.span>
);

const Splash = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const startTime = useRef(Date.now());
  const resolved = useRef(false);

  useEffect(() => {
    const frame = () => {
      const elapsed = Date.now() - startTime.current;
      const pct = Math.min(100, (elapsed / LOAD_DURATION) * 100);
      setProgress(pct);
      if (pct < 100) {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (progress < 100 || resolved.current) return;
    resolved.current = true;

    const route = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        doNavigate("/auth");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", session.user.id)
        .single();

      if (profile?.onboarding_complete) {
        doNavigate("/dashboard");
      } else {
        doNavigate("/onboarding");
      }
    };

    route();
  }, [progress]);

  const doNavigate = (path: string) => {
    setFadingOut(true);
    setTimeout(() => navigate(path, { replace: true }), 400);
  };

  const butterflies = [
    { delay: 0, x: 20 },
    { delay: 0.8, x: 45 },
    { delay: 1.6, x: 70 },
    { delay: 0.4, x: 35 },
    { delay: 1.2, x: 80 },
  ];

  return (
    <AnimatePresence>
      {!fadingOut ? (
        <motion.div
          key="splash"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 flex flex-col items-center justify-center bg-background overflow-hidden"
        >
          {/* Butterflies */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {butterflies.map((b, i) => (
              <Butterfly key={i} delay={b.delay} x={b.x} />
            ))}
          </div>

          {/* Logo */}
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-6 gold-glow"
          >
            <span className="text-3xl font-display font-bold text-primary">UB</span>
          </motion.div>

          {/* Text */}
          <h1 className="text-xl font-display font-bold text-secondary text-center px-8 gold-text-glow leading-relaxed">
            Your Gateway to Greatness{"\n"}is Loading
          </h1>

          {/* Progress bar + counter */}
          <div className="w-64 mt-10">
            <div className="flex justify-end mb-1">
              <span className="text-sm font-bold text-primary font-body">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="fade"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 bg-background"
        />
      )}
    </AnimatePresence>
  );
};

export default Splash;
