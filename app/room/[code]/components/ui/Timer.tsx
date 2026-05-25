"use client";
import { useEffect, useState } from "react";

interface TimerProps {
  durationSeconds: number;
  onExpire?: () => void;
  running: boolean;
}

export default function Timer({ durationSeconds, onExpire, running }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);

  useEffect(() => {
    setSecondsLeft(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) {
      onExpire?.();
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, running, onExpire]);

  const pct = secondsLeft / durationSeconds;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - pct);
  const isUrgent = pct <= 0.25;
  const ringColor = pct > 0.5 ? "#94d1d1" : pct > 0.25 ? "#f59e0b" : "#C4472A";

  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        backgroundColor: "rgba(0,0,0,0.3)",
        border: "2px solid rgba(255,255,255,0.15)",
        boxShadow: "3px 3px 0px rgba(0,0,0,0.3)",
      }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 56 56"
        style={{ overflow: "visible" }}
      >
        {/* Track */}
        <circle
          cx="28" cy="28" r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3.5"
        />
        {/* Progress ring */}
        <circle
          cx="28" cy="28" r={radius}
          fill="transparent"
          stroke={ringColor}
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
            transition: "stroke-dashoffset 0.9s linear, stroke 0.4s ease",
          }}
        />
      </svg>
      <span
        className="font-display text-xl relative z-10 select-none leading-none"
        style={{
          color: isUrgent ? "#C4472A" : "white",
          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          transition: "color 0.3s",
        }}
      >
        {secondsLeft}
      </span>
    </div>
  );
}
