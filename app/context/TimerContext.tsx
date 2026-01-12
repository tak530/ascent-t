"use client";

import { createContext, useContext, useState } from "react";

type TimerPhase = "setting" | "running";

type TimerContextType = {
  phase: TimerPhase;
  setPhase: (p: TimerPhase) => void;
};

const TimerContext = createContext<TimerContextType | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<TimerPhase>("setting");

  return (
    <TimerContext.Provider value={{ phase, setPhase }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error("useTimer must be used within TimerProvider");
  }
  return ctx;
}
