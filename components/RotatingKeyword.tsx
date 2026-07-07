"use client";

import { useEffect, useState } from "react";

const keywords = ["auth", "promotional", "occasional", "invoicing", "state"];

export function RotatingKeyword() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % keywords.length);
    }, 1500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className="keyword-shell" aria-live="polite">
      <span key={keywords[index]} className="keyword">
        {keywords[index]}
      </span>
    </span>
  );
}
