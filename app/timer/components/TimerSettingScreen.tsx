"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTimer } from "@/app/context/TimerContext";
import ResetIcon from "@/public/Reset.png";

const SIZE = 264;
const STROKE_PRACTICE = 16;
const STROKE_REST = 9;
const RADIUS = 108;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SETTINGS_KEY = "ascent.timer.defaults.v1";
const DEFAULT_PRACTICE_SEC = 5 * 60;
const DEFAULT_REST_SEC = 2 * 60;

function angleFromPoint(x: number, y: number) {
  const dx = x - CENTER;
  const dy = y - CENTER;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return angle < 0 ? angle + 360 : angle;
}

function angleToTime(angle: number) {
  const rawSeconds = Math.round((angle / 360) * 60 * 10);
  const steppedSeconds = Math.min(
    60 * 10,
    Math.max(0, Math.round(rawSeconds / 30) * 30)
  );
  return {
    min: Math.floor(steppedSeconds / 60),
    sec: steppedSeconds % 60,
  };
}

function pointOnCircle(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function timeToAngle(totalSec: number) {
  const clamped = Math.min(60 * 10, Math.max(0, Math.round(totalSec / 30) * 30));
  return (clamped / (60 * 10)) * 360;
}

function normalizeAngle(angle: number) {
  return (angle + 360) % 360;
}

function shortestAngleDiff(current: number, start: number) {
  let diff = current - start;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

function formatMMSS(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function hapticTick() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(10);
  }
}

export default function TimerSettingScreen() {
  const { phase, setPhase } = useTimer();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const alarmTimeoutRef = useRef<number | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    alarmRef.current = new Audio("/alarm.mp3");
    alarmRef.current.loop = true;
    alarmRef.current.preload = "auto";
    return () => {
      alarmRef.current?.pause();
      alarmRef.current = null;
    };
  }, [mounted]);

  const [practiceAngle, setPracticeAngle] = useState(180);
  const [restAngle, setRestAngle] = useState(72);

  function getStoredDefaults() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const value = raw ? JSON.parse(raw) : null;
      return {
        practiceSec: value?.practiceSec ?? DEFAULT_PRACTICE_SEC,
        restSec: value?.restSec ?? DEFAULT_REST_SEC,
      };
    } catch {
      return {
        practiceSec: DEFAULT_PRACTICE_SEC,
        restSec: DEFAULT_REST_SEC,
      };
    }
  }

  useEffect(() => {
    const { practiceSec, restSec } = getStoredDefaults();
    setPracticeAngle(timeToAngle(practiceSec));
    setRestAngle(timeToAngle(restSec));
  }, []);

  const [dragTarget, setDragTarget] = useState<"practice" | "rest" | null>(null);
  const [startPointerAngle, setStartPointerAngle] = useState(0);
  const [startArcAngle, setStartArcAngle] = useState(0);

  const [currentMode, setCurrentMode] = useState<"practice" | "rest">("practice");
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [setCount, setSetCount] = useState(1);
  const [currentSet, setCurrentSet] = useState(1);
  const [remainingSec, setRemainingSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  const practiceTime = angleToTime(practiceAngle);
  const restTime = angleToTime(restAngle);

  const practiceSec = practiceTime.min * 60 + practiceTime.sec;
  const restSec = restTime.min * 60 + restTime.sec;
  const totalSec = (practiceSec * 2 + restSec * 2) * setCount;
  const maxSec = 60 * 10;
  const practicePercent = (practiceSec / maxSec) * 100;
  const restPercent = (restSec / maxSec) * 100;
  const practiceLabelLeft = Math.min(96, Math.max(4, practicePercent));
  const restLabelLeft = Math.min(96, Math.max(4, restPercent));

  function adjustPractice(deltaSec: number) {
    hapticTick();
    setPracticeAngle(timeToAngle(practiceSec + deltaSec));
  }

  function adjustRest(deltaSec: number) {
    hapticTick();
    setRestAngle(timeToAngle(restSec + deltaSec));
  }

  function clampSetCount(value: number) {
    return Math.min(12, Math.max(1, value));
  }

  function getModeForSegment(index: number) {
    return index % 2 === 0 ? "practice" : "rest";
  }

  function getDurationForSegment(index: number) {
    return getModeForSegment(index) === "practice" ? practiceSec : restSec;
  }

  function stopAlarm() {
    if (alarmTimeoutRef.current) {
      window.clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = null;
    }
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }
    setIsAlarmPlaying(false);
  }

  function playAlarm() {
    stopAlarm();
    if (!alarmRef.current) return;
    alarmRef.current.currentTime = 0;
    const playPromise = alarmRef.current.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }
    setIsAlarmPlaying(true);
    alarmTimeoutRef.current = window.setTimeout(() => {
      stopAlarm();
    }, 15000);
  }

  useEffect(() => {
    if (phase !== "running") stopAlarm();
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    if (isPaused) return;

    if (remainingSec <= 0) {
      playAlarm();
      if (segmentIndex < 3) {
        const nextIndex = segmentIndex + 1;
        const nextMode = getModeForSegment(nextIndex);
        setSegmentIndex(nextIndex);
        setCurrentMode(nextMode);
        setRemainingSec(getDurationForSegment(nextIndex));
        return;
      }
      if (currentSet < setCount) {
        setCurrentSet((prev) => prev + 1);
        setSegmentIndex(0);
        setCurrentMode("practice");
        setRemainingSec(practiceSec);
        return;
      }
      setPhase("setting");
      return;
    }

    const id = window.setTimeout(() => {
      setRemainingSec((s) => s - 1);
    }, 1000);

    return () => window.clearTimeout(id);
  }, [
    phase,
    remainingSec,
    currentMode,
    restSec,
    practiceSec,
    isPaused,
    setPhase,
    segmentIndex,
    currentSet,
    setCount,
  ]);

  if (!mounted) return null;

  const practiceOffset = CIRCUMFERENCE - (practiceAngle / 360) * CIRCUMFERENCE;
  const restOffset = CIRCUMFERENCE - (restAngle / 360) * CIRCUMFERENCE;
  const practiceHandle = pointOnCircle(-90 + practiceAngle, RADIUS);
  const restHandle = pointOnCircle(-90 + practiceAngle + restAngle, RADIUS);

  function beginDrag(target: "practice" | "rest", e: React.PointerEvent<SVGCircleElement>) {
    if (phase !== "setting") return;
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mirroredX = rect.width - x;

    const pointerAngle = angleFromPoint(mirroredX, y);

    setDragTarget(target);
    setStartPointerAngle(pointerAngle);
    setStartArcAngle(target === "practice" ? practiceAngle : restAngle);

    try {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    } catch {}
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragTarget || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mirroredX = rect.width - x;

    const currentPointerAngle = angleFromPoint(mirroredX, y);
    const diff = shortestAngleDiff(currentPointerAngle, startPointerAngle);
    const nextAngle = normalizeAngle(startArcAngle + diff);

    if (dragTarget === "practice") setPracticeAngle(nextAngle);
    else setRestAngle(nextAngle);
  }

  function endDrag() {
    setDragTarget(null);
  }

  function startTimer() {
    setCurrentSet(1);
    setSegmentIndex(0);
    setCurrentMode("practice");
    setRemainingSec(practiceSec);
    setIsPaused(false);
    setPhase("running");
  }

  function togglePause() {
    setIsPaused((prev) => !prev);
  }

  function jumpNext() {
    stopAlarm();
    if (segmentIndex < 3) {
      const nextIndex = segmentIndex + 1;
      const nextMode = getModeForSegment(nextIndex);
      setSegmentIndex(nextIndex);
      setCurrentMode(nextMode);
      setRemainingSec(getDurationForSegment(nextIndex));
      setIsPaused(false);
      return;
    }
    if (currentSet < setCount) {
      setCurrentSet((prev) => prev + 1);
      setSegmentIndex(0);
      setCurrentMode("practice");
      setRemainingSec(practiceSec);
      setIsPaused(false);
      return;
    }
    setPhase("setting");
  }

  function resetToDefaults() {
    const { practiceSec: nextPractice, restSec: nextRest } = getStoredDefaults();
    setPracticeAngle(timeToAngle(nextPractice));
    setRestAngle(timeToAngle(nextRest));
    setSetCount(1);
  }

  if (phase === "running") {
    const currentTotalSec = currentMode === "practice" ? practiceSec : restSec;
    const progress = currentTotalSec > 0 ? remainingSec / currentTotalSec : 0;
    const runningOffset = CIRCUMFERENCE * (1 - progress);
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f7f9fd",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "20px 20px 80px",
          gap: 20,
        }}
      >
        <div
          style={{
            position: "relative",
            width: SIZE,
            height: SIZE,
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{ transform: "scaleX(-1)" }}
          >
            <defs>
              <linearGradient id="ringOrangeRunning" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--brand-orange)" />
                <stop offset="100%" stopColor="var(--brand-orange-600)" />
              </linearGradient>
              <linearGradient id="ringBlueRunning" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-blue)" />
                <stop offset="100%" stopColor="var(--brand-blue-600)" />
              </linearGradient>
              <filter id="glowOrangeRunning" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow
                  dx="0"
                  dy="8"
                  stdDeviation="10"
                  floodColor="#ffb87a"
                  floodOpacity="0.45"
                />
              </filter>
              <filter id="glowBlueRunning" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow
                  dx="0"
                  dy="8"
                  stdDeviation="10"
                  floodColor="#86b6ff"
                  floodOpacity="0.45"
                />
              </filter>
            </defs>
            {[...Array(12)].map((_, i) => {
              const a = (i / 12) * 2 * Math.PI;
              const x = CENTER + Math.cos(a) * (RADIUS + 18);
              const y = CENTER + Math.sin(a) * (RADIUS + 18);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={3}
                  fill="rgba(148, 163, 184, 0.2)"
                  stroke="rgba(148, 163, 184, 0.5)"
                  strokeWidth={0.75}
                />
              );
            })}

            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke="var(--border)"
              strokeWidth={STROKE_PRACTICE}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeLinecap="round"
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              opacity={0.35}
            />

            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke={
                currentMode === "practice"
                  ? "url(#ringOrangeRunning)"
                  : "url(#ringBlueRunning)"
              }
              strokeWidth={STROKE_PRACTICE}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={runningOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              style={{ transition: "stroke-dashoffset 0.77s linear" }}
              filter={
                currentMode === "practice"
                  ? "url(#glowOrangeRunning)"
                  : "url(#glowBlueRunning)"
              }
            />
          </svg>
          <div
            style={{
              position: "absolute",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {currentMode === "practice" ? "練習" : "休憩"}
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "var(--text)" }}>
              {formatMMSS(remainingSec)}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              セット {currentSet}/{setCount}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
            width: "100%",
            maxWidth: 360,
          }}
        >
          <button
            type="button"
            onClick={togglePause}
            className="press-button"
            aria-label={isPaused ? "再開" : "一時停止"}
            style={{
              height: 48,
              borderRadius: 24,
              border: "none",
              background: isPaused
                ? "var(--blue-gradient)"
                : "var(--orange-gradient)",
              boxShadow: isPaused
                ? "0 12px 20px rgba(42, 167, 230, 0.24)"
                : "0 12px 20px rgba(245, 154, 35, 0.24)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.6,
              display: "grid",
              placeItems: "center",
            }}
          >
            {isPaused ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5l11 7-11 7V5z" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={jumpNext}
            className="cta-button"
            aria-label="次へ"
            style={{
              height: 48,
              borderRadius: 24,
              border: "none",
              background:
                currentMode === "practice"
                  ? "var(--orange-gradient)"
                  : "var(--blue-gradient)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.6,
              boxShadow: "var(--shadow-pill)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5l11 7-11 7V5z" />
            </svg>
          </button>
        </div>
        {isAlarmPlaying && (
          <button
            type="button"
            onClick={stopAlarm}
            className="press-button"
            style={{
              height: 48,
              width: "100%",
              maxWidth: 360,
              borderRadius: 24,
              border: "none",
              background: "var(--orange-gradient)",
              color: "#fff",
              boxShadow: "0 12px 20px rgba(245, 154, 35, 0.24)",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.6,
            }}
          >
            ストップ
          </button>
        )}

        <button
          onClick={() => {
            stopAlarm();
            setPhase("setting");
          }}
          className="press-button"
          style={{
            marginTop: 24,
            width: "100%",
            maxWidth: 360,
            height: 48,
            borderRadius: 24,
            border: "1px solid var(--border-blue)",
            background: "var(--card-blue)",
            color: "var(--brand-blue-600)",
            boxShadow: "var(--shadow-soft)",
            fontSize: 14,
          }}
        >
          設定に戻る
        </button>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f9fd",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "14px 16px 80px",
        gap: 14,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "relative",
          width: SIZE,
          height: SIZE,
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg
          ref={svgRef}
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          style={{ touchAction: "none", transform: "scaleX(-1)" }}
        >
          <defs>
            <linearGradient id="ringOrange" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--brand-orange)" />
              <stop offset="100%" stopColor="var(--brand-orange-600)" />
            </linearGradient>
            <linearGradient id="ringBlue" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-blue)" />
              <stop offset="100%" stopColor="var(--brand-blue-600)" />
            </linearGradient>
            <filter id="glowOrange" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="8"
                stdDeviation="10"
                floodColor="#ffb87a"
                floodOpacity="0.45"
              />
            </filter>
            <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="8"
                stdDeviation="10"
                floodColor="#86b6ff"
                floodOpacity="0.45"
              />
            </filter>
          </defs>
          {[...Array(12)].map((_, i) => {
            const a = (i / 12) * 2 * Math.PI;
            const x = CENTER + Math.cos(a) * (RADIUS + 18);
            const y = CENTER + Math.sin(a) * (RADIUS + 18);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={3}
                fill="rgba(148, 163, 184, 0.2)"
                stroke="rgba(148, 163, 184, 0.5)"
                strokeWidth={0.75}
              />
            );
          })}

          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="url(#ringOrange)"
            strokeWidth={STROKE_PRACTICE}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={practiceOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            onPointerDown={(e) => beginDrag("practice", e)}
            filter="url(#glowOrange)"
          />

          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="url(#ringBlue)"
            strokeWidth={STROKE_REST}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={restOffset}
            strokeLinecap="round"
            transform={`rotate(${practiceAngle - 90} ${CENTER} ${CENTER})`}
            onPointerDown={(e) => beginDrag("rest", e)}
            filter="url(#glowBlue)"
          />

          <circle
            cx={practiceHandle.x}
            cy={practiceHandle.y}
            r={16}
            fill="transparent"
            stroke="transparent"
            onPointerDown={(e) => beginDrag("practice", e)}
            style={{ cursor: "pointer" }}
            aria-hidden="true"
          />
          <circle
            cx={restHandle.x}
            cy={restHandle.y}
            r={16}
            fill="transparent"
            stroke="transparent"
            onPointerDown={(e) => beginDrag("rest", e)}
            style={{ cursor: "pointer" }}
            aria-hidden="true"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            textAlign: "center",
            pointerEvents: "none",
            padding: "8px 14px",
            borderRadius: 999,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-strong)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "var(--brand-blue)",
            }}
          >
            TOTAL
          </div>
          <div
            style={{
              fontSize: 45,
              fontWeight: 800,
              color: "var(--text)",
              marginTop: 2,
            }}
          >
            {formatMMSS(totalSec)}
          </div>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 160,
          borderRadius: 16,
          padding: "12px 14px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-soft)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          marginTop: -18,
          alignSelf: "flex-end",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700 }}>セット数</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => setSetCount((prev) => clampSetCount(prev - 1))}
            className="adjust-button"
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: "1px solid #111",
              background: "rgba(0, 0, 0, 0.06)",
              fontSize: 14,
              fontWeight: 700,
              color: "#111",
            }}
            aria-label="セット数を1減らす"
          >
            −
          </button>
          <div style={{ minWidth: 30, textAlign: "center", fontWeight: 800 }}>
            {setCount}
          </div>
          <button
            type="button"
            onClick={() => setSetCount((prev) => clampSetCount(prev + 1))}
            className="adjust-button"
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: "1px solid #111",
              background: "rgba(0, 0, 0, 0.06)",
              fontSize: 14,
              fontWeight: 700,
              color: "#111",
            }}
            aria-label="セット数を1増やす"
          >
            +
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 12,
          width: "100%",
          maxWidth: 360,
        }}
      >
        <div
          style={{
          borderRadius: 18,
          padding: "10px 12px",
          background: "var(--card-orange)",
          border: "1px solid var(--border-orange)",
          boxShadow: "var(--shadow-soft)",
          textAlign: "center",
        }}
      >
          <div
            style={{
              display: "grid",
              gap: 6,
              marginTop: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => adjustPractice(-30)}
                className="adjust-button"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: "1px solid #111",
                  background: "rgba(255, 164, 61, 0.35)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#111",
                }}
                aria-label="練習時間を30秒減らす"
              >
                −
              </button>
              <div style={{ position: "relative", flex: 1 }}>
                <div
                  style={{
                    position: "absolute",
                    top: -28,
                    left: `${practiceLabelLeft}%`,
                    transform: "translateX(-50%)",
                    background: "var(--surface)",
                    border: "1px solid var(--border-orange)",
                    color: "var(--brand-orange-600)",
                    padding: "4px 10px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: "var(--shadow-soft)",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatMMSS(practiceSec)}
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxSec}
                  step={30}
                  value={practiceSec}
                  onChange={(e) =>
                    setPracticeAngle(timeToAngle(Number(e.target.value)))
                  }
                  className="time-slider time-slider--orange"
                  style={{
                    ["--slider-fill" as any]: `${practicePercent}%`,
                  }}
                  aria-label="練習時間を調整"
                />
              </div>
              <button
                type="button"
                onClick={() => adjustPractice(30)}
                className="adjust-button"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: "1px solid #111",
                  background: "rgba(255, 164, 61, 0.35)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#111",
                }}
                aria-label="練習時間を30秒増やす"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <div
          style={{
          borderRadius: 18,
          padding: "10px 12px",
          background: "var(--card-blue)",
          border: "1px solid var(--border-blue)",
          boxShadow: "var(--shadow-soft)",
          textAlign: "center",
        }}
      >
          <div
            style={{
              display: "grid",
              gap: 6,
              marginTop: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => adjustRest(-30)}
                className="adjust-button"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: "1px solid #111",
                  background: "rgba(96, 180, 255, 0.35)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#111",
                }}
                aria-label="休憩時間を30秒減らす"
              >
                −
              </button>
              <div style={{ position: "relative", flex: 1 }}>
                <div
                  style={{
                    position: "absolute",
                    top: -28,
                    left: `${restLabelLeft}%`,
                    transform: "translateX(-50%)",
                    background: "var(--surface)",
                    border: "1px solid var(--border-blue)",
                    color: "var(--brand-blue-600)",
                    padding: "4px 10px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: "var(--shadow-soft)",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatMMSS(restSec)}
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxSec}
                  step={30}
                  value={restSec}
                  onChange={(e) =>
                    setRestAngle(timeToAngle(Number(e.target.value)))
                  }
                  className="time-slider time-slider--blue"
                  style={{
                    ["--slider-fill" as any]: `${restPercent}%`,
                  }}
                  aria-label="休憩時間を調整"
                />
              </div>
              <button
                type="button"
                onClick={() => adjustRest(30)}
                className="adjust-button"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: "1px solid #111",
                  background: "rgba(96, 180, 255, 0.35)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#111",
                }}
                aria-label="休憩時間を30秒増やす"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={startTimer}
        className="cta-button"
        style={{
          marginTop: 16,
          width: "100%",
          maxWidth: 360,
          height: 56,
          borderRadius: 999,
          background: "var(--blue-gradient)",
          color: "#fff",
          fontSize: 20,
          fontWeight: 700,
          border: "none",
          boxShadow: "var(--shadow-pill)",
          letterSpacing: 0.04,
        }}
      >
        スタート
      </button>
      <button
        onClick={resetToDefaults}
        className="press-button"
        style={{
          width: 62,
          height: 62,
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "#111827",
          boxShadow: "var(--shadow-soft)",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 0.04,
          display: "grid",
          placeItems: "center",
          position: "absolute",
          left: 20,
          top: "34%",
          transform: "translateY(-50%)",
          zIndex: 2,
        }}
        aria-label="デフォルトに戻す"
      >
        <Image
          src={ResetIcon}
          alt=""
          width={70}
          height={70}
          style={{ display: "block" }}
        />
      </button>
    </main>
  );
}
