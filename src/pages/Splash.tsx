import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/auth", { replace: true });
    }, 2800);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Ambient gold glow */}
      <motion.div
        className="absolute w-64 h-64 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(44 99% 68% / 0.15), transparent 70%)",
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Logo placeholder */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-6 gold-glow">
          <span className="text-3xl font-display font-bold text-primary">UB</span>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-2xl font-display font-bold text-primary gold-text-glow tracking-wide"
        >
          Ujjwal Bhavishya
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-2 text-sm text-foreground/70 font-body tracking-widest uppercase"
        >
          Bright Future
        </motion.p>
      </motion.div>

      {/* Rising butterfly */}
      <motion.div
        className="absolute z-10 text-3xl"
        initial={{ bottom: -40, opacity: 0 }}
        animate={{ bottom: "45%", opacity: [0, 1, 1, 0.8] }}
        transition={{ delay: 0.8, duration: 2, ease: "easeOut" }}
      >
        🦋
      </motion.div>
    </div>
  );
};

export default Splash;
