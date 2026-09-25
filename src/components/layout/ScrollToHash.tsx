import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scroll to the #fragment after client-side navigation. React Router does not,
 * and menu links point at sections such as /statistics#hazards. Some targets
 * render late (lazy chunks, fetched data), so it retries for about a second.
 */
export function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    let frame = 0;
    let attempts = 0;
    const tryScroll = () => {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView();
        return;
      }
      if (attempts++ < 60) frame = requestAnimationFrame(tryScroll);
    };
    tryScroll();
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}
