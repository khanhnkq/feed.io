import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  gsap.defaults({
    ease: "power2.out",
    duration: 0.6,
  });
}

export { gsap, ScrollTrigger, useGSAP };
