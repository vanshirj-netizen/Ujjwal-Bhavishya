import { cn } from "@/lib/utils";

interface GoldButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  fullWidth?: boolean;
}

const GoldButton = ({
  children,
  onClick,
  className,
  disabled = false,
  type = "button",
  fullWidth = false,
}: GoldButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "gold-btn-base",
      fullWidth && "w-full",
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}
    style={{
      background: "linear-gradient(135deg, #fed141, #ffe180, #ffc300)",
      color: "#003326",
      fontFamily: "'Space Grotesk', sans-serif",
      fontWeight: 800,
      fontSize: "clamp(0.68rem, 0.92vw, 0.78rem)",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      borderRadius: 100,
      padding: "14px 36px",
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: "0 6px 28px rgba(253,193,65,0.38), inset 0 1px 0 rgba(255,255,255,0.15)",
      transition: "all 0.35s cubic-bezier(0.23,1,0.32,1)",
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      const el = e.currentTarget;
      el.style.transform = "translateY(-4px) scale(1.04)";
      el.style.filter = "brightness(1.07)";
      el.style.boxShadow = "0 16px 46px rgba(253,193,65,0.52), inset 0 1px 0 rgba(255,255,255,0.15)";
    }}
    onMouseLeave={(e) => {
      const el = e.currentTarget;
      el.style.transform = "";
      el.style.filter = "";
      el.style.boxShadow = "0 6px 28px rgba(253,193,65,0.38), inset 0 1px 0 rgba(255,255,255,0.15)";
    }}
  >
    {children}
  </button>
);

export { GoldButton };
export default GoldButton;
