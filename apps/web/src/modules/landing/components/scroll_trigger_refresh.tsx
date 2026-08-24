"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "../lib/gsap_init";

export function ScrollTriggerRefresh() {
  useEffect(() => {
    // Refresh ScrollTrigger after Next.js client hydration and layout calculation
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    const onResize = () => {
      ScrollTrigger.refresh();
    };

    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
