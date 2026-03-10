import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VIDEO_URL = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB_Welcome_Video.mp4";
const UB_LOGO = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo.png";
const GYANI_IMG = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyani.webp";
const GYANU_IMG = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyanu.webp";
const VIDEO_URL_DESKTOP = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media//UB_Welcome_Video_Desktop.mp4";

const courses = [
  { key: "aarambh", name: "Aarambh", subtitle: "The Beginning", desc: "60 days to transform your foundation from the ground up", live: true },
  { key: "vikas", name: "Vikas", subtitle: "Growth", desc: "Personal development mastery", live: false },
  { key: "utkarsh", name: "Utkarsh", subtitle: "Excellence", desc: "Tech & AI skills", live: false },
  { key: "margdarshan", name: "Margdarshan", subtitle: "Guidance", desc: "Career counselling", live: false },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("Student");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<string | null>(null);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onboardingCompleteRef = useRef(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth", { replace: true }); return; }
      const { data } = await supabase.from("profiles").select("full_name, onboarding_complete").eq("id", session.user.id).single();
      if (data?.full_name) setFullName(data.full_name);
      if (data?.onboarding_complete) onboardingCompleteRef.current = true;
    };
    fetchProfile();
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const videoSrc = isDesktop ? VIDEO_URL_DESKTOP : VIDEO_URL;

  useEffect(() => {
    if (step === 0 && videoRef.current) {
      videoRef.current.play().catch(() => {
        setShowPlayOverlay(true);
      });
    }
  }, [step]);

  const nextStep = () => setStep((s) => s + 1);

  const handleVideoEnd = () => {
    if (onboardingCompleteRef.current) {
      navigate("/dashboard", { replace: true });
    } else {
      nextStep();
    }
  };

  const handlePlayOverlayTap = () => {
    setShowPlayOverlay(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  const handleFinish = async () => {
    if (!selectedMaster) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").update({
        selected_master: selectedMaster,
        onboarding_complete: true,
      }).eq("id", session.user.id);
      if (error) throw error;
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const playAudio = (src: string) => {
    try {
      if (audioRef.current) { audioRef.current.pause(); }
      audioRef.current = new Audio(src);
      audioRef.current.play().catch(() => {});
    } catch {}
  };

  const slideVariants = {
    initial: { opacity: 0, x: 60 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
  };

  const masters = [
    { key: "Gyani", img: GYANI_IMG, audio: "/audio/gyani-intro.mp3", traits: "Wisdom • Depth • Ancient Knowledge", desc: "The scholar who transforms how you think" },
    { key: "Gyanu", img: GYANU_IMG, audio: "/audio/gyanu-intro.mp3", traits: "Energy • Action • Modern Mindset", desc: "The hustler who transforms how you act" },
  ];

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <AnimatePresence mode="wait">
        {/* STEP 0 — Brand Video */}
        {step === 0 && (
          <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="fixed inset-0 bg-black flex items-center justify-center">
            <video
              key={videoSrc}
              ref={videoRef}
              autoPlay
              playsInline
              muted={false}
              controls={false}
              onEnded={handleVideoEnd}
              className="w-full h-full object-cover bg-black"
              src={videoSrc}
            />
            <AnimatePresence>
              {showPlayOverlay && (
                <motion.div
                  key="play-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={handlePlayOverlayTap}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black cursor-pointer"
                >
                  <motion.div
                    animate={{ boxShadow: ["0 0 24px rgba(254,209,65,0.3)", "0 0 48px rgba(254,209,65,0.6)", "0 0 24px rgba(254,209,65,0.3)"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
                    style={{ border: "2px solid #fed141" }}
                  >
                    <span className="text-3xl ml-1" style={{ color: "#fed141" }}>▶</span>
                  </motion.div>
                  <p className="mt-6 text-base font-body tracking-wide" style={{ color: "#fffcef" }}>
                    Tap to Begin Your Journey
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* STEP 1 — Namaste Welcome */}
        {step === 1 && (
          <motion.div key="namaste" {...slideVariants} transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-6">
            {/* UB Logo */}
            <motion.img
              src={UB_LOGO}
              alt="UB"
              className="w-20 h-20 object-contain mb-6"
              animate={{ boxShadow: ["0 0 20px rgba(254,209,65,0.3)", "0 0 40px rgba(254,209,65,0.5)", "0 0 20px rgba(254,209,65,0.3)"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Stars */}
            <div className="flex gap-4 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.12, duration: 0.3, type: "spring" }}
                  className="text-2xl text-primary"
                >
                  ✦
                </motion.span>
              ))}
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.78, duration: 0.5 }}
              className="text-[32px] font-display font-bold text-primary gold-text-glow text-center"
            >
              Namaste, {fullName} 🙏
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.18, duration: 0.4 }}
              className="mt-4 text-base font-body text-secondary text-center max-w-[320px] leading-relaxed"
            >
              Before you start your journey to Greatness — let's finish setting up your account.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.68, duration: 0.4 }}
              onClick={nextStep}
              className="mt-10 h-12 px-10 rounded-lg bg-primary text-primary-foreground font-semibold text-base font-body gold-shimmer-btn active:scale-[0.98] transition-transform"
            >
              Let's Begin →
            </motion.button>
          </motion.div>
        )}

        {/* STEP 2 — Choose Course */}
        {step === 2 && (
          <motion.div key="course" {...slideVariants} transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-5">
            <h2 className="text-2xl font-display font-bold text-primary gold-text-glow text-center">Choose Your Path</h2>
            <p className="text-sm font-body text-secondary/70 mt-2 text-center">Your 60-day transformation begins here</p>

            <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-sm">
              {courses.map((c) => (
                <button
                  key={c.key}
                  disabled={!c.live}
                  onClick={() => c.live && setSelectedCourse(c.key)}
                  className={`relative p-4 rounded-xl text-left transition-all ${
                    c.live
                      ? selectedCourse === c.key
                        ? "glass-card-gold border-2 border-primary"
                        : "glass-card-gold hover:scale-[1.02]"
                      : "glass-card overflow-hidden cursor-not-allowed"
                  }`}
                >
                  {!c.live && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-xl z-10 flex items-start justify-end p-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/20 text-foreground/60 font-body">Coming Soon</span>
                    </div>
                  )}
                  {c.live && (
                    <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold font-body">
                      Now Live ✦
                    </span>
                  )}
                  {selectedCourse === c.key && (
                    <span className="absolute top-2 left-2 text-primary text-lg">✓</span>
                  )}
                  <p className={`text-base font-display font-bold mt-4 ${c.live ? "text-primary" : "text-foreground/40"}`}>{c.name}</p>
                  <p className="text-xs font-body text-secondary/60 mt-0.5">{c.subtitle}</p>
                  <p className="text-xs font-body text-foreground/40 mt-2 leading-relaxed">{c.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={nextStep}
              disabled={!selectedCourse}
              className="mt-8 w-full max-w-sm h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base font-body gold-shimmer-btn active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Begin My Journey →
            </button>
          </motion.div>
        )}

        {/* STEP 3 — Choose Master */}
        {step === 3 && (
          <motion.div key="master" {...slideVariants} transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-5">
            <h2 className="text-2xl font-display font-bold text-primary gold-text-glow text-center">Choose Your Master</h2>
            <p className="text-sm font-body text-secondary/70 mt-2 text-center">Your guide for the next 60 days</p>

            <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-sm">
              {masters.map((m) => {
                const isSelected = selectedMaster === m.key;
                const otherSelected = selectedMaster && !isSelected;
                return (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMaster(m.key)}
                    className={`relative p-4 rounded-xl text-center transition-all ${
                      isSelected
                        ? "glass-card-gold border-2 border-primary bg-primary/5"
                        : otherSelected
                          ? "glass-card opacity-60"
                          : "glass-card hover:scale-[1.02]"
                    }`}
                  >
                    {/* Master photo */}
                    <div
                      className="w-full h-[200px] rounded-2xl overflow-hidden mb-3 border-2"
                      style={{
                        borderColor: "#fed141",
                        boxShadow: isSelected ? "0 0 20px rgba(254,209,65,0.6)" : "none",
                      }}
                    >
                      <img src={m.img} alt={m.key} className="w-full h-full object-cover" style={m.key === "Gyani" ? { objectPosition: "center 30%" } : undefined} />
                    </div>
                    <p className="text-lg font-display font-bold text-primary">{m.key}</p>
                    <p className="text-xs font-body text-primary/80 mt-1">{m.traits}</p>
                    <p className="text-xs font-body text-foreground/50 mt-2 leading-relaxed">{m.desc}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); playAudio(m.audio); }}
                      className="mt-3 text-xs font-body text-primary/70 hover:text-primary transition-colors"
                    >
                      ▶ Play Intro
                    </button>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleFinish}
              disabled={!selectedMaster || saving}
              className="mt-8 w-full max-w-sm h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base font-body gold-shimmer-btn active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : `I Choose ${selectedMaster || "..."} →`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
