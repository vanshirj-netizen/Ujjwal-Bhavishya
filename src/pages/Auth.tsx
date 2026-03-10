import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const BokehBackground = () => {
  const dots = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    size: 40 + Math.random() * 80,
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: 5 + Math.random() * 6,
    delay: Math.random() * 4,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="bokeh-dot"
          style={{
            width: dot.size,
            height: dot.size,
            left: `${dot.left}%`,
            top: `${dot.top}%`,
            "--duration": `${dot.duration}s`,
            "--delay": `${dot.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone: phone || null },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Welcome to Ujjwal Bhavishya! 🦋");
        navigate("/", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back! 🙏");
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background px-6">
      <BokehBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold text-primary gold-text-glow">
            Ujjwal Bhavishya
          </h1>
          <p className="text-xs text-foreground/60 tracking-widest uppercase mt-1">
            Bright Future
          </p>
        </div>

        {/* Toggle */}
        <div className="glass-card p-1 flex mb-6">
          {["New Student", "Welcome Back"].map((label, i) => {
            const active = isSignUp ? i === 0 : i === 1;
            return (
              <button
                key={label}
                onClick={() => setIsSignUp(i === 0)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-300 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {isSignUp && (
              <motion.div
                key="signup-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="space-y-2">
                  <Label className="text-foreground/80 text-sm">Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required={isSignUp}
                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <Label className="text-foreground/80 text-sm">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80 text-sm">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          <AnimatePresence mode="wait">
            {isSignUp && (
              <motion.div
                key="phone-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-2 overflow-hidden"
              >
                <Label className="text-foreground/80 text-sm">Phone (optional)</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
          >
            {loading ? (
              <span className="gold-shimmer inline-block w-24 h-4 rounded" />
            ) : isSignUp ? (
              "Begin My Journey →"
            ) : (
              "Welcome Back →"
            )}
          </Button>
        </form>

        {isSignUp ? (
          <p className="text-center text-xs text-foreground/50 mt-4">
            Days 1–5 are FREE. No card required.
          </p>
        ) : (
          <button
            onClick={handleForgotPassword}
            className="block w-full text-center text-xs text-primary/70 hover:text-primary mt-4 transition-colors"
          >
            Forgot your password?
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
