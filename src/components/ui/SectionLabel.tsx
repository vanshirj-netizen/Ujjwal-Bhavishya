import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

const SectionLabel = ({ children, className }: SectionLabelProps) => (
  <div className={cn("flex items-center gap-2.5", className)}>
    <div
      style={{
        width: 18,
        height: 2,
        background: "linear-gradient(90deg, #fed141, #ffc300)",
        flexShrink: 0,
      }}
    />
    <span
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "0.64rem",
        fontWeight: 700,
        letterSpacing: 4,
        textTransform: "uppercase",
        background: "var(--gg, linear-gradient(135deg, #fed141 0%, #ffe180 30%, #f9be00 65%, #ffc300 100%))",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {children}
    </span>
  </div>
);

export { SectionLabel };
export default SectionLabel;
