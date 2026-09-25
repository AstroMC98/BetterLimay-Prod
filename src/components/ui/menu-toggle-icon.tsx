import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Hamburger that turns into an X. The pasted header imports this but the paste
 * did not include it, so it is written here: three lines, the middle one fades
 * and the outer two rotate. Motion is dropped for readers who ask for less.
 */
export function MenuToggleIcon({
  open,
  duration = 300,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { open: boolean; duration?: number }) {
  const transition = {
    transition: `transform ${duration}ms ease, opacity ${duration}ms ease`,
    transformOrigin: "12px 12px",
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      className={cn("motion-reduce:[&_line]:!transition-none", className)}
      {...props}
    >
      <line
        x1="4"
        y1="6"
        x2="20"
        y2="6"
        style={{
          ...transition,
          transform: open ? "translateY(6px) rotate(45deg)" : "none",
        }}
      />
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        style={{ ...transition, opacity: open ? 0 : 1 }}
      />
      <line
        x1="4"
        y1="18"
        x2="20"
        y2="18"
        style={{
          ...transition,
          transform: open ? "translateY(-6px) rotate(-45deg)" : "none",
        }}
      />
    </svg>
  );
}
