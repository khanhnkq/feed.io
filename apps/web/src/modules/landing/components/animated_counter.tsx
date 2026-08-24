"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "../lib/gsap_init";

interface AnimatedCounterProps {
  end: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  end,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.8,
  className = "",
}: AnimatedCounterProps) {
  const counterRef = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState<string>(
    `${prefix}0${suffix}`
  );

  useGSAP(
    () => {
      const obj = { val: 0 };

      gsap.to(obj, {
        val: end,
        duration,
        ease: "power2.out",
        scrollTrigger: {
          trigger: counterRef.current,
          start: "top 90%",
          once: true,
        },
        onUpdate: () => {
          const formatted =
            decimals > 0
              ? obj.val.toFixed(decimals)
              : Math.round(obj.val).toString();
          setDisplayValue(`${prefix}${formatted}${suffix}`);
        },
      });
    },
    { scope: counterRef }
  );

  return (
    <span ref={counterRef} className={className}>
      {displayValue}
    </span>
  );
}
