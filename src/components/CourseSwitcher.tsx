import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COURSE_ID } from "@/lib/constants";

const STORAGE_KEY = "ub_active_course_id";

const COURSES = [
  { id: COURSE_ID, name: "AARAMBH", active: true },
  { id: "vikas", name: "VIKAS", active: false },
  { id: "utkarsh", name: "UTKARSH", active: false },
  { id: "margdarshan", name: "MARGDARSHAN", active: false },
];

export const useActiveCourse = (): string => {
  const [courseId, setCourseId] = useState(() => localStorage.getItem(STORAGE_KEY) || COURSE_ID);

  useEffect(() => {
    const handler = () => setCourseId(localStorage.getItem(STORAGE_KEY) || COURSE_ID);
    window.addEventListener("storage", handler);
    window.addEventListener("course-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("course-changed", handler);
    };
  }, []);

  return courseId;
};

const CourseSwitcher = () => {
  const [open, setOpen] = useState(false);
  const activeCourseId = useActiveCourse();
  const activeCourse = COURSES.find(c => c.id === activeCourseId) || COURSES[0];

  const selectCourse = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new Event("course-changed"));
    setOpen(false);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
        style={{
          fontFamily: "var(--fa)",
          border: "1.5px solid hsl(var(--primary) / 0.4)",
          background: "hsl(var(--primary) / 0.08)",
          color: "hsl(var(--primary))",
          letterSpacing: "1px",
        }}
      >
        {activeCourse.name} ▾
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden min-w-[220px]"
              style={{
                background: "hsl(161 96% 6%)",
                border: "1px solid hsl(var(--primary) / 0.2)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              <div className="p-3 flex flex-col gap-1">
                {COURSES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => c.active && selectCourse(c.id)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full transition-all"
                    style={{
                      background: c.id === activeCourseId ? "hsl(var(--primary) / 0.1)" : "transparent",
                      cursor: c.active ? "pointer" : "default",
                      opacity: c.active ? 1 : 0.4,
                    }}
                    disabled={!c.active}
                  >
                    <span style={{ fontFamily: "var(--fa)", fontSize: "0.75rem", color: c.id === activeCourseId ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.5)" }}>
                      {c.id === activeCourseId ? "●" : "○"}
                    </span>
                    <div className="flex-1">
                      <p style={{ fontFamily: "var(--fa)", fontSize: "0.8rem", color: c.active ? "hsl(var(--foreground))" : "hsl(var(--foreground) / 0.4)", fontWeight: 700, letterSpacing: "1px" }}>
                        {c.name}
                      </p>
                    </div>
                    {!c.active && (
                      <span style={{ fontFamily: "var(--fb)", fontSize: "0.65rem", color: "hsl(var(--foreground) / 0.3)" }}>
                        🔒 Coming Soon
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourseSwitcher;
