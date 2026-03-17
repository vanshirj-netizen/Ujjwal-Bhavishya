import { cn } from "@/lib/utils";

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const GlassButton = ({
  children,
  onClick,
  className,
  disabled = false,
  type = "button",
}: GlassButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cn("glass-btn-base", disabled && "opacity-50 cursor-not-allowed", className)}
    style={{
      background: "rgba(255,252,239,0.04)",
      border: "1px solid rgba(255,252,239,0.16)",
      backdropFilter: "blur(12px)",
      color: "#FFFCEF",
      fontFamily: "'Space Grotesk', sans-serif",
      fontWeight: 700,
      fontSize: "clamp(0.68rem, 0.92vw, 0.78rem)",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      borderRadius: 100,
      padding: "14px 36px",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.35s cubic-bezier(0.23,1,0.32,1)",
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      const el = e.currentTarget;
      el.style.background = "rgba(253,193,65,0.09)";
      el.style.borderColor = "rgba(253,193,65,0.4)";
      el.style.color = "#ffc300";
    }}
    onMouseLeave={(e) => {
      const el = e.currentTarget;
      el.style.background = "rgba(255,252,239,0.04)";
      el.style.borderColor = "rgba(255,252,239,0.16)";
      el.style.color = "#FFFCEF";
    }}
  >
    {children}
  </button>
);

export { GlassButton };
export default GlassButton;
