"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function useWhiteoutNavigate() {
  const router = useRouter();
  const [whiteout, setWhiteout] = useState(false);
  const busyRef = useRef(false);

  function go(path: string) {
    if (busyRef.current) return; // (4)連打対策
    busyRef.current = true;

    setWhiteout(true);
    window.setTimeout(() => {
      router.push(path);
      // 遷移先で解除するのが理想だが、簡易で戻す
      window.setTimeout(() => {
        setWhiteout(false);
        busyRef.current = false;
      }, 250);
    }, 120);
  }

  return { whiteout, go };
}
