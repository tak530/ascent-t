"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTimer } from "@/app/context/TimerContext";
import ResetIcon from "@/public/Reset.png";

const SIZE = 264;
const STROKE_PRACTICE = 16;
const STROKE_REST = STROKE_PRACTICE;
const RADIUS = 108;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SETTINGS_KEY = "ascent.timer.defaults.v1";
const DEFAULT_PRACTICE_SEC = 5 * 60;
const DEFAULT_REST_SEC = 2 * 60;

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

function angleFromPoint(x: number, y: number) {
  const dx = x - CENTER;
  const dy = y - CENTER;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return angle < 0 ? angle + 360 : angle;
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
  const countdownRef = useRef<HTMLAudioElement | null>(null);
  const practiceStartRef = useRef<HTMLAudioElement | null>(null);
  const practiceStartTimeoutRef = useRef<number | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    alarmRef.current = new Audio("/alarm.mp3");
    alarmRef.current.loop = true;
    alarmRef.current.preload = "auto";
    countdownRef.current = new Audio("/clipped-countdown.m4a");
    countdownRef.current.loop = true;
    countdownRef.current.preload = "auto";
    practiceStartRef.current = new Audio("/churchmodified.m4a");
    practiceStartRef.current.loop = false;
    practiceStartRef.current.preload = "auto";
    return () => {
      alarmRef.current?.pause();
      alarmRef.current = null;
      countdownRef.current?.pause();
      countdownRef.current = null;
      practiceStartRef.current?.pause();
      practiceStartRef.current = null;
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

  const [currentMode, setCurrentMode] = useState<"practice" | "rest">("practice");
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [setCount, setSetCount] = useState(2);
  const [currentSet, setCurrentSet] = useState(1);
  const [remainingSec, setRemainingSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [isCountdownPlaying, setIsCountdownPlaying] = useState(false);
  const [dragTarget, setDragTarget] = useState<"practice" | "rest" | null>(null);
  const [startPointerAngle, setStartPointerAngle] = useState(0);
  const [startArcAngle, setStartArcAngle] = useState(0);

  const practiceTime = angleToTime(practiceAngle);
  const restTime = angleToTime(restAngle);

  const practiceSec = practiceTime.min * 60 + practiceTime.sec;
  const restSec = restTime.min * 60 + restTime.sec;
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

  function stopPracticeStart() {
    if (practiceStartTimeoutRef.current) {
      window.clearTimeout(practiceStartTimeoutRef.current);
      practiceStartTimeoutRef.current = null;
    }
    if (practiceStartRef.current) {
      practiceStartRef.current.pause();
      practiceStartRef.current.currentTime = 0;
    }
  }

  function stopCountdown() {
    if (countdownRef.current) {
      countdownRef.current.pause();
      countdownRef.current.currentTime = 0;
    }
    setIsCountdownPlaying(false);
  }

  function playCountdown() {
    if (!countdownRef.current) return;
    countdownRef.current.currentTime = 0;
    const playPromise = countdownRef.current.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }
    setIsCountdownPlaying(true);
  }

  function playPracticeStart() {
    stopPracticeStart();
    stopAlarm();
    stopCountdown();
    if (!practiceStartRef.current) return;
    practiceStartRef.current.currentTime = 0;
    const playPromise = practiceStartRef.current.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }
    practiceStartTimeoutRef.current = window.setTimeout(() => {
      stopPracticeStart();
    }, 10000);
  }

  function playAlarm(durationMs = 15000) {
    stopAlarm();
    stopCountdown();
    stopPracticeStart();
    if (!alarmRef.current) return;
    alarmRef.current.currentTime = 0;
    const playPromise = alarmRef.current.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }
    setIsAlarmPlaying(true);
    alarmTimeoutRef.current = window.setTimeout(() => {
      stopAlarm();
    }, durationMs);
  }

  useEffect(() => {
    if (phase !== "running") {
      stopAlarm();
      stopCountdown();
      stopPracticeStart();
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    if (isPaused) {
      if (isCountdownPlaying) stopCountdown();
      return;
    }
    if (remainingSec <= 0) {
      if (isCountdownPlaying) stopCountdown();
      return;
    }
    if (remainingSec <= 10 && !isCountdownPlaying) {
      playCountdown();
    }
    if (remainingSec > 10 && isCountdownPlaying) {
      stopCountdown();
    }
  }, [phase, remainingSec, isPaused, isCountdownPlaying]);

  useEffect(() => {
    if (phase !== "running") return;
    if (isPaused) return;

    if (remainingSec <= 0) {
      if (currentMode === "practice") {
        playAlarm(10000);
      }
      if (segmentIndex < 3) {
        const nextIndex = segmentIndex + 1;
        const nextMode = getModeForSegment(nextIndex);
        setSegmentIndex(nextIndex);
        setCurrentMode(nextMode);
        setRemainingSec(getDurationForSegment(nextIndex));
        if (nextMode === "practice" && nextIndex === 2) {
          playPracticeStart();
        }
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
      if (nextMode === "practice" && nextIndex === 2) {
        playPracticeStart();
      }
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
    setSetCount(2);
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
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS + 20}
              stroke="rgba(148, 163, 184, 0.6)"
              strokeWidth={2}
              fill="none"
            />
            {[...Array(12)].map((_, i) => {
              const a = (i / 12) * 2 * Math.PI;
              const x1 = CENTER + Math.cos(a) * (RADIUS + 14);
              const y1 = CENTER + Math.sin(a) * (RADIUS + 14);
              const x2 = CENTER + Math.cos(a) * (RADIUS + 26);
              const y2 = CENTER + Math.sin(a) * (RADIUS + 26);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(148, 163, 184, 0.7)"
                  strokeWidth={2}
                  strokeLinecap="round"
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
              <path d="M3 5l8 7-8 7V5zM13 5l8 7-8 7V5z" />
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
          marginTop: 8,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -18,
            left: "50%",
            transform: "translateX(-50%)",
            width: 54,
            height: 18,
            borderRadius: 10,
            background: "#94a3b8",
            border: "1px solid rgba(71, 85, 105, 0.8)",
            boxShadow: "var(--shadow-soft)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#cbd5e1",
            border: "1px solid rgba(71, 85, 105, 0.8)",
            boxShadow: "var(--shadow-soft)",
          }}
        />
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
            <linearGradient id="ringOrangeSetting" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--brand-orange)" />
              <stop offset="100%" stopColor="var(--brand-orange-600)" />
            </linearGradient>
            <linearGradient id="ringBlueSetting" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-blue)" />
              <stop offset="100%" stopColor="var(--brand-blue-600)" />
            </linearGradient>
            <filter id="glowOrangeSetting" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="8"
                stdDeviation="10"
                floodColor="#ffb87a"
                floodOpacity="0.45"
              />
            </filter>
            <filter id="glowBlueSetting" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="8"
                stdDeviation="10"
                floodColor="#86b6ff"
                floodOpacity="0.45"
              />
            </filter>
          </defs>

          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS + 20}
            stroke="rgba(148, 163, 184, 0.6)"
            strokeWidth={2}
            fill="none"
          />
          {[...Array(12)].map((_, i) => {
            const a = (i / 12) * 2 * Math.PI;
            const x1 = CENTER + Math.cos(a) * (RADIUS + 14);
            const y1 = CENTER + Math.sin(a) * (RADIUS + 14);
            const x2 = CENTER + Math.cos(a) * (RADIUS + 26);
            const y2 = CENTER + Math.sin(a) * (RADIUS + 26);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(148, 163, 184, 0.7)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}

          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="url(#ringOrangeSetting)"
            strokeWidth={STROKE_PRACTICE}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={practiceOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            filter="url(#glowOrangeSetting)"
            onPointerDown={(e) => beginDrag("practice", e)}
          />

          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="url(#ringBlueSetting)"
            strokeWidth={STROKE_REST}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={restOffset}
            strokeLinecap="round"
            transform={`rotate(${practiceAngle - 90} ${CENTER} ${CENTER})`}
            filter="url(#glowBlueSetting)"
            onPointerDown={(e) => beginDrag("rest", e)}
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
              fontSize: 45,
              fontWeight: 800,
              color: "var(--text)",
            }}
          >
            {formatMMSS(practiceSec + restSec)}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: "rgba(100, 116, 139, 0.8)",
              letterSpacing: "0.04em",
            }}
          >
            合計 {formatMMSS((practiceSec + restSec) * setCount)}
          </div>
        </div>
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          display: "flex",
          justifyContent: "flex-end",
          paddingRight: 12,
          marginTop: 8,
        }}
      >
        <div
          style={{
            display: "grid",
            justifyItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--muted)",
              textAlign: "center",
            }}
          >
            セット数
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
          <button
            type="button"
            onClick={() => setSetCount((prev) => clampSetCount(prev - 1))}
            className="adjust-button"
            style={{
              width: 30,
              height: 30,
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
          <div
            style={{
              minWidth: 30,
              textAlign: "center",
              justifySelf: "center",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            {setCount}
          </div>
          <button
            type="button"
            onClick={() => setSetCount((prev) => clampSetCount(prev + 1))}
            className="adjust-button"
            style={{
              width: 30,
              height: 30,
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
          position: "relative",
        }}
      >
          <button
            onClick={resetToDefaults}
            className="press-button"
            style={{
              position: "absolute",
              top: -70,
              left: 12,
              width: 70,
              height: 70,
              borderRadius: 17,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-soft)",
              display: "grid",
              placeItems: "center",
            }}
            aria-label="デフォルトに戻す"
          >
            <Image
              src={ResetIcon}
              alt=""
              width={66}
              height={66}
              style={{ display: "block" }}
            />
          </button>
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
                  練習 {formatMMSS(practiceSec)}
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
                aria-label="インターバル時間を30秒減らす"
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
                  インターバル {formatMMSS(restSec)}
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
                  aria-label="インターバル時間を調整"
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
                aria-label="インターバル時間を30秒増やす"
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
    </main>
  );
}
