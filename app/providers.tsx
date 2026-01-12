// app/providers.tsx
"use client";

import type React from "react";
import { TimerProvider } from "./context/TimerContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <TimerProvider>{children}</TimerProvider>;
}
