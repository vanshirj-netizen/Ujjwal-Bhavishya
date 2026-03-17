import { useState, useEffect, useRef } from "react";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [count, setCount] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("splashShown")) {
      onComplete();
      return;
    }

    const startTime = Date.now();
    const duration = 2200;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setCount(pct);

      if (pct >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => {
            sessionStorage.setItem("splashShown", "true");
            onComplete();
          }, 600);
        }, 300);
      }
    }, 22);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onComplete]);

  // Skip render if already shown
  if (sessionStorage.getItem("splashShown")) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: "#000e09",
        opacity: fadeOut ? 0 : 1,
        visibility: fadeOut ? "hidden" as const : "visible" as const,
        transition: "opacity 0.6s ease, visibility 0.6s ease",
      }}
    >
      {/* Aurora blobs */}
      <div className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
        <div
          className="absolute"
          style={{
            width: "min(900px, 90vw)",
            height: "min(900px, 90vw)",
            top: "-20%",
            left: "-20%",
            background: "radial-gradient(ellipse, rgba(180,120,0,0.22), transparent 68%)",
            animation: "splashFloat1 25s ease-in-out infinite",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "min(750px, 75vw)",
            height: "min(750px, 75vw)",
            bottom: "-15%",
            right: "-15%",
            background: "radial-gradient(ellipse, rgba(0,140,70,0.18), transparent 68%)",
            animation: "splashFloat2 32s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "min(600px, 65vw)",
            height: "min(600px, 65vw)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(ellipse, rgba(200,140,0,0.14), transparent 68%)",
            animation: "splashFloat3 20s ease-in-out infinite",
          }}
        />
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo Pill */}
        <div
          style={{
            borderRadius: 100,
            background: "rgba(0,14,9,0.8)",
            border: "1px solid rgba(253,193,65,0.3)",
            boxShadow: "0 0 20px rgba(253,193,65,0.15)",
            padding: "8px 24px",
          }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{ height: 54, width: "auto", borderRadius: 40, display: "block" }}
            src="https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media//UB_Pill_Video.mp4"
          />
        </div>

        {/* Gold Counter */}
        <span
          className="font-display"
          style={{
            fontSize: "clamp(4rem, 12vw, 7rem)",
            fontWeight: 900,
            background: "linear-gradient(135deg, #fed141, #ffc300)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1,
          }}
        >
          {count}%
        </span>

        {/* Progress Bar */}
        <div style={{ width: 280, height: 2, borderRadius: 2, background: "rgba(255,193,0,0.1)", overflow: "hidden" }}>
          <div
            style={{
              width: `${count}%`,
              height: "100%",
              borderRadius: 2,
              background: "linear-gradient(90deg, #fed141, #ffe180, #ffc300)",
              backgroundSize: "200%",
              animation: "splashShimmer 2s linear infinite",
              transition: "width 0.05s linear",
            }}
          />
        </div>

        {/* Tagline */}
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "0.6rem",
            letterSpacing: 4,
            textTransform: "uppercase" as const,
            color: "rgba(255,252,239,0.35)",
          }}
        >
          LOADING YOUR GATEWAY TO GREATNESS
        </span>
      </div>

      <style>{`
        @keyframes splashFloat1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 20px); }
        }
        @keyframes splashFloat2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-25px, -15px); }
        }
        @keyframes splashFloat3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes splashShimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
