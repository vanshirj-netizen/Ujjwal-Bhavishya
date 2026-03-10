import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const LOAD_DURATION = 2500;
const LOGO_URL = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo.png";

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

const fetchProfileWithRetry = async (userId: string, retries = 3, delayMs = 500): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    console.log(`[Splash] Profile fetch attempt ${i + 1}/${retries}`);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", userId)
      .maybeSingle();

    if (profile) {
      console.log("[Splash] Profile found:", profile);
      return profile;
    }
    if (error) {
      console.error("[Splash] Profile fetch error:", error.message);
    }
    if (i < retries - 1) {
      console.log(`[Splash] Profile not found, retrying in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  console.warn("[Splash] Profile not found after all retries");
  return null;
};

const Splash = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const startTime = useRef(Date.now());
  const resolved = useRef(false);

  const doNavigate = (path: string) => {
    setFadingOut(true);
    setTimeout(() => navigate(path, { replace: true }), 400);
  };

  const routeBasedOnProfile = async (userId: string) => {
    const profile = await fetchProfileWithRetry(userId);
    if (!profile) {
      console.log("[Splash] No profile found → /onboarding");
      doNavigate("/onboarding");
      return;
    }
    if (profile.onboarding_complete) {
      console.log("[Splash] Onboarding complete → /dashboard");
      doNavigate("/dashboard");
    } else {
      console.log("[Splash] Onboarding NOT complete → /onboarding");
      doNavigate("/onboarding");
    }
  };

  // Listen for OAuth callback SIGNED_IN events
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session && !resolved.current) {
        console.log("[Splash] onAuthStateChange SIGNED_IN for:", session.user.id);
        resolved.current = true;
        routeBasedOnProfile(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Progress bar animation
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

  // Fallback: check session after progress bar completes
  useEffect(() => {
    if (progress < 100 || resolved.current) return;

    const route = async () => {
      console.log("[Splash] Progress complete, checking session...");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log("[Splash] No session found → /auth");
        doNavigate("/auth");
        return;
      }

      if (resolved.current) return;
      resolved.current = true;
      console.log("[Splash] Session found for user:", session.user.id);
      await routeBasedOnProfile(session.user.id);
    };

    route();
  }, [progress]);

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
          className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "radial-gradient(circle, rgba(254,209,65,0.08) 0%, transparent 70%), #01271d" }}
        >
          {/* Butterflies */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {butterflies.map((b, i) => (
              <Butterfly key={i} delay={b.delay} x={b.x} />
            ))}
          </div>

          {/* Logo */}
          <motion.img
            src={LOGO_URL}
            alt="Ujjwal Bhavishya"
            className="w-[180px] h-[180px] object-contain"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ boxShadow: "0 0 40px rgba(254,209,65,0.4)" }}
          />

          {/* Text */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="text-lg font-display font-bold text-center px-8 leading-relaxed tracking-[0.05em]"
            style={{ color: "#fffcef" }}
          >
            Your Gateway to Greatness{"\n"}is Loading
          </motion.h1>

          {/* Progress bar + counter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="w-64 mt-10"
          >
            <div className="flex justify-end mb-1">
              <span className="text-sm font-bold font-body" style={{ color: "#fed141" }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(1,39,29,0.8)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ width: `${progress}%`, backgroundColor: "#fed141" }}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="fade"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0"
          style={{ backgroundColor: "#01271d" }}
        />
      )}
    </AnimatePresence>
  );
};

export default Splash;
