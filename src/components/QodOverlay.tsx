import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GYANI_IMG = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyani.webp";

interface QodOverlayProps {
  lines: string[] | null; // null = fallback mode
  quoteText: string;
  quoteAuthor: string;
  onDismiss: () => void;
}

const QodOverlay = ({ lines, quoteText, quoteAuthor, onDismiss }: QodOverlayProps) => {
  const [phase, setPhase] = useState(0);
  // phases: 0=avatar, 1..N=lines, N+1=pause(silent), N+2=carry text, N+3=button

  const displayLines = lines && lines.length === 3 ? lines : [
    `"${quoteText}"`,
    `— ${quoteAuthor}`,
  ];
  const totalLines = displayLines.length;
  const pausePhase = totalLines + 1;
  const carryPhase = pausePhase + 1;
  const buttonPhase = carryPhase + 1;

  useEffect(() => {
    // Phase 0: avatar appears immediately, then after 0.8s start lines
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Show avatar for 0.8s, then start lines
    let cumulative = 800;
    for (let i = 1; i <= totalLines; i++) {
      timers.push(setTimeout(() => setPhase(i), cumulative));
      cumulative += 800;
    }
    // 4 second forced pause after last line
    timers.push(setTimeout(() => setPhase(pausePhase), cumulative));
    cumulative += 4000;
    // "Carry this with you today"
    timers.push(setTimeout(() => setPhase(carryPhase), cumulative));
    cumulative += 1200;
    // Button
    timers.push(setTimeout(() => setPhase(buttonPhase), cumulative));

    return () => timers.forEach(clearTimeout);
  }, [totalLines, pausePhase, carryPhase, buttonPhase]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-8"
        style={{ background: "rgba(0,10,6,0.97)" }}
      >
        {/* Gyani avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div
            className="w-16 h-16 rounded-full overflow-hidden mx-auto"
            style={{ border: "2px solid hsl(var(--primary))" }}
          >
            <img src={GYANI_IMG} alt="Gyani" className="w-full h-full object-cover" />
          </div>
          <p
            className="text-center mt-2 font-display"
            style={{
              fontSize: "0.7rem",
              letterSpacing: "2px",
              textTransform: "uppercase",
              background: "var(--gg)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Gyani
          </p>
        </motion.div>

        {/* Lines */}
        <div className="max-w-md text-center space-y-5">
          {displayLines.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={phase >= i + 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              className="font-display italic"
              style={{
                fontSize: "clamp(1rem, 2vw, 1.25rem)",
                lineHeight: 1.8,
                color: "hsl(var(--foreground))",
              }}
            >
              {line}
            </motion.p>
          ))}
        </div>

        {/* "Carry this with you today" */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={phase >= carryPhase ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
          className="mt-10"
          style={{
            fontFamily: "var(--fa)",
            fontSize: "0.75rem",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "rgba(255,252,239,0.5)",
          }}
        >
          Carry this with you today.
        </motion.p>

        {/* Button */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= buttonPhase ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.6 }}
          onClick={onDismiss}
          className="mt-6"
          style={{
            background: "linear-gradient(135deg, #fed141, #ffe180, #ffc300)",
            color: "#003326",
            fontFamily: "var(--fa)",
            fontWeight: 800,
            fontSize: "clamp(0.68rem, 0.92vw, 0.78rem)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            borderRadius: 100,
            padding: "14px 48px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 6px 28px rgba(253,193,65,0.38)",
            pointerEvents: phase >= buttonPhase ? "auto" : "none",
          }}
        >
          I will.
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
};

export default QodOverlay;
