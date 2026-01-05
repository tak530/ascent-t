"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";

type EntryType = "practice" | "strength" | "meal";

type Entry = {
  id: string;
  date: string; // YYYY-MM-DD
  type: EntryType;
  title: string;
  minutes: number;
  note: string;
  createdAt: number;
};

const STORAGE_KEY = "ascent.entries.v1";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadEntries(): Entry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Entry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: Entry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

type Phase = "A" | "REST1" | "B" | "REST2";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function label(phase: Phase) {
  if (phase === "A") return "A側 練習";
  if (phase === "B") return "B側 練習";
  return "インターバル";
}

function ProgressRing(props: {
  progress: number; // 0..1
  timeText: string; // "06:52"
  subtitle?: string; // "A側 練習" など
  size?: number;
}) {
  const { progress, timeText, subtitle, size = 280 } = props;

  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  const dashOffset = c * (1 - p);

  const wrap: CSSProperties = {
    width: size,
    height: size,
    position: "relative",
    display: "grid",
    placeItems: "center",
  };

  const center: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    gap: 8,
  };

  return (
    <div style={wrap}>
      <svg width={size} height={size}>
        <defs>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="rgba(0,0,0,0.18)" />
          </filter>
        </defs>

        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(0,0,0,0.10)"
          strokeWidth={stroke}
        />

        {/* progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E34B4B"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          filter="url(#softShadow)"
        />
      </svg>

      <div style={center}>
        <div style={{ fontSize: 86, fontWeight: 900, letterSpacing: 1, fontVariantNumeric: "tabular-nums" }}>
          {timeText}
        </div>
        {subtitle ? (
          <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(0,0,0,0.65)" }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TimerPage() {
  // 設定（分）
  const [aM, setAM] = useState(7);
  const [aS, setAS] = useState(0);

  const [rM, setRM] = useState(1);
  const [rS, setRS] = useState(0);

  const [bM, setBM] = useState(7);
  const [bS, setBS] = useState(0);

  const [sets, setSets] = useState(3);

  const [separateAB, setSeparateAB] = useState(false);

  const [menuTitle, setMenuTitle] = useState("卓球 練習（A/B交代）");
  const [menuNote, setMenuNote] = useState("");
  const [mode, setMode] = useState<"setup" | "running" | "finished">("setup");
  
  // 状態
  const [running, setRunning] = useState(false);
  const [setIndex, setSetIndex] = useState(1);
  const [phase, setPhase] = useState<Phase>("A");
  const [remainSec, setRemainSec] = useState(0);

  const tickRef = useRef<number | null>(null);

const plan = useMemo(() => {
  const a = Math.max(0, Math.floor(aM)) * 60 + Math.max(0, Math.floor(aS));
  const r = Math.max(0, Math.floor(rM)) * 60 + Math.max(0, Math.floor(rS));

  const bRaw = Math.max(0, Math.floor(bM)) * 60 + Math.max(0, Math.floor(bS));
  const b = separateAB ? bRaw : a; // 通常はA=B

  return { a: Math.max(1, a), r: Math.max(0, r), b: Math.max(1, b) };
}, [aM, aS, rM, rS, bM, bS, separateAB]);

const phaseTotalSec = useMemo(() => {
  if (phase === "A") return plan.a;
  if (phase === "REST1") return plan.r;
  if (phase === "B") return plan.b;
  return plan.r; // REST2
}, [phase, plan]);


 const totalPracticeMinutes = useMemo(() => {
  const perSetSec = plan.a + plan.b;
  const totalSec = perSetSec * Math.max(1, Math.floor(sets));
  return Math.floor(totalSec / 60);
}, [plan, sets]);

useEffect(() => {
if (mode !== "setup") return;
setRemainSec(plan.a);
}, [mode, plan.a]);

  // phaseが変わったら残り時間をセット
useEffect(() => {
if (mode !== "running") return;
if (phase === "A") setRemainSec(plan.a);
else if (phase === "REST1") setRemainSec(plan.r);
else if (phase === "B") setRemainSec(plan.b);
else setRemainSec(plan.r);
}, [mode, phase, plan]);

  // running中は1秒ごとに減らす
useEffect(() => {
  if (mode !== "running") return;
  if (!running) return;

  tickRef.current = window.setInterval(() => {
    setRemainSec((s) => Math.max(0, s - 1));
  }, 1000);

  return () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
  };
}, [mode, running]);

  // 0になったら次のフェーズへ
useEffect(() => {
  if (mode !== "running") return;
  if (!running) return;
  if (remainSec > 0) return;

  const n = nextPhase(phase);

  if (n === "A") {
    if (setIndex >= sets) {
      setRunning(false);
      setMode("finished");
      return;
    }
    setSetIndex((x) => x + 1);
  }

  setPhase(n);

  if (n === "A") setRemainSec(plan.a);
  else if (n === "REST1") setRemainSec(plan.r);
  else if (n === "B") setRemainSec(plan.b);
  else setRemainSec(plan.r);
}, [mode, running, remainSec, phase, setIndex, sets, plan]);

useEffect(() => {
if (mode !== "setup") return;

// setup中は「表示の秒数」を常にA設定に合わせる
setRemainSec(plan.a);

// setupに戻ったら進行状態も初期化しておく（事故防止）
setRunning(false);
setPhase("A");
setSetIndex(1);
}, [mode, plan.a]);


  function nextPhase(p: Phase): Phase {
    if (p === "A") return "REST1";
    if (p === "REST1") return "B";
    if (p === "B") return "REST2";
    return "A";
  }

  function start() {
// 走り出す瞬間に、Aの秒数を確定
setPhase("A");
setSetIndex(1);
setRemainSec(plan.a);

setMode("running");
setRunning(true);
}

  function pause() {
    setRunning(false);
  }

  function next() {
    const n = nextPhase(phase);

    if (n === "A") {
      // 1セット終わるタイミング（REST2→A）
      if (setIndex >= sets) {
        setRunning(false);
        setMode("finished");
        return;
      }
      setSetIndex((x) => x + 1);
    }

    setPhase(n);
  }


  function reset() {
setRunning(false);
setMode("setup");
setSetIndex(1);
setPhase("A");
setRemainSec(plan.a);
}

function backToSetup() {
setRunning(false);
setMode("setup");
setSetIndex(1);
setPhase("A");
setRemainSec(plan.a);
}

  function saveAsPractice() {
    const title = menuTitle.trim() || "卓球 練習（A/B交代）";

    const next: Entry = {
      id: uid(),
      date: todayStr(),
      type: "practice",
      title,
      minutes: totalPracticeMinutes,
      note: menuNote.trim(),
      createdAt: Date.now(),
    };

    const current = loadEntries();
    const updated = [next, ...current];
    saveEntries(updated);

    // 記録ページへ戻る（手動でもいいが、自動が楽）
    window.location.href = "/";
  }


const title = label(phase);

 function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const timeText = fmt(Math.max(0, remainSec));
const progress = phaseTotalSec <= 0 ? 1 : remainSec / phaseTotalSec; // 1..0 になっていく
const ringProgress = 1 - progress; // 0..1 で増えるようにする


function CircleStepper(props: {
  label: string;
  minutes: number;
  seconds: number;
  onChangeMinutes: (v: number) => void;
  onChangeSeconds: (v: number) => void;
  minMinutes?: number;
  maxMinutes?: number;
  showSeconds?: boolean;
  presets?: number[]; // 秒プリセット（例: [0, 30]）
}) {
  const {
    label,
    minutes,
    seconds,
    onChangeMinutes,
    onChangeSeconds,
    minMinutes = 0,
    maxMinutes = 60,
    showSeconds = true,
    presets = [0, 30],
  } = props;

  const decMin = () => onChangeMinutes(clamp(minutes - 1, minMinutes, maxMinutes));
  const incMin = () => onChangeMinutes(clamp(minutes + 1, minMinutes, maxMinutes));

  const setPreset = (v: number) => onChangeSeconds(clamp(v, 0, 59));

  const ringStyle: React.CSSProperties = {
    width: 220,
    height: 220,
    borderRadius: "999px",
    position: "relative",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.9), rgba(255,255,255,0.55) 60%, rgba(255,255,255,0.35) 100%)",
    boxShadow:
      "0 18px 40px rgba(0,0,0,0.08), 0 2px 10px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
    border: "1px solid rgba(255,255,255,0.6)",
    backdropFilter: "blur(10px)",
  };

  const outerRing: React.CSSProperties = {
    position: "absolute",
    inset: -10,
    borderRadius: "999px",
    background:
      "conic-gradient(from 180deg, rgba(120,180,255,0.7), rgba(160,120,255,0.7), rgba(120,220,255,0.7))",
    filter: "blur(0.2px)",
    opacity: 0.55,
  };

  const outerRingMask: React.CSSProperties = {
    position: "absolute",
    inset: -10,
    borderRadius: "999px",
    padding: 10,
    background: "transparent",
    WebkitMask:
      "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude" as any,
  };

  const roundBtn = (primary = false): React.CSSProperties => ({
    width: 54,
    height: 54,
    borderRadius: "999px",
    border: "1px solid rgba(0,0,0,0.08)",
    background: primary ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.85)",
    color: primary ? "#fff" : "#111",
    fontSize: 22,
    display: "grid",
    placeItems: "center",
    boxShadow: "0 10px 18px rgba(0,0,0,0.10)",
    cursor: "pointer",
    userSelect: "none",
    touchAction: "manipulation",
  });

  const bigText: React.CSSProperties = {
    fontSize: 52,
    fontWeight: 800,
    letterSpacing: 1,
    fontVariantNumeric: "tabular-nums",
    color: "#111",
    lineHeight: 1,
  };

  const secPill: React.CSSProperties = {
    minWidth: 72,
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(255,255,255,0.75)",
    boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 800,
    cursor: "pointer",
    userSelect: "none",
    touchAction: "manipulation",
  };

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 12 }}>
      <div style={ringStyle}>
        {/* 外側の薄いリング */}
        <div style={outerRing} />
        <div style={outerRingMask} />

        {/* マイナス */}
        <button
          style={{ ...roundBtn(false), position: "absolute", left: 16 }}
          onClick={decMin}
          aria-label={`${label} 分を1減らす`}
        >
          −
        </button>

        {/* プラス */}
        <button
          style={{ ...roundBtn(true), position: "absolute", right: 16 }}
          onClick={incMin}
          aria-label={`${label} 分を1増やす`}
        >
          +
        </button>

        {/* 中央の分表示 */}
        <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
          <div style={bigText}>
            {minutes}
            <span style={{ fontSize: 28, fontWeight: 800, marginLeft: 6 }}>分</span>
          </div>

          {showSeconds ? (
            <div style={{ display: "flex", gap: 14 }}>
              {presets.map((p) => (
                <div
                  key={p}
                  style={{
                    ...secPill,
                    outline: seconds === p ? "2px solid rgba(0,0,0,0.25)" : "none",
                  }}
                  onClick={() => setPreset(p)}
                  role="button"
                  aria-label={`${label} 秒を${p}にする`}
                >
                  {String(p).padStart(2, "0")}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ fontSize: 22, fontWeight: 900 }}>{label}</div>
    </div>
  );
}

function StepperRow(props: {
  label: string;
  minutes: number;
  seconds: number;
  onChangeMinutes: (v: number) => void;
  onChangeSeconds: (v: number) => void;
  minMinutes?: number;
  maxMinutes?: number;
  showSeconds?: boolean;
}) {
  const {
    label,
    minutes,
    seconds,
    onChangeMinutes,
    onChangeSeconds,
    minMinutes = 0,
    maxMinutes = 99,
    showSeconds = true,
  } = props;

  const btnStyle = (primary = false) => ({
    width: 44,
    height: 44,
    borderRadius: 12,
    border: "1px solid #ddd",
    background: primary ? "#000" : "#fff",
    color: primary ? "#fff" : "#000",
    fontSize: 18,
    cursor: "pointer",
  });

  const pillStyle = {
    minWidth: 92,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fafafa",
    textAlign: "center" as const,
    fontVariantNumeric: "tabular-nums" as const,
  };

  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{label}</div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            style={btnStyle()}
            onClick={() => onChangeMinutes(clamp(minutes - 1, minMinutes, maxMinutes))}
            aria-label={`${label} 分を1減らす`}
          >
            −
          </button>

          <div style={pillStyle}>{minutes} 分</div>

          <button
            style={btnStyle(true)}
            onClick={() => onChangeMinutes(clamp(minutes + 1, minMinutes, maxMinutes))}
            aria-label={`${label} 分を1増やす`}
          >
            +
          </button>

          {showSeconds ? (
            <>
              <div style={{ width: 12 }} />

              <button
                style={btnStyle()}
                onClick={() => onChangeSeconds(0)}
                aria-label={`${label} 秒を0にする`}
              >
                0
              </button>

              <div style={pillStyle}>{seconds} 秒</div>

              <button
                style={btnStyle(true)}
                onClick={() => onChangeSeconds(30)}
                aria-label={`${label} 秒を30にする`}
              >
                30
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

  return (
    <main
  style={{
    padding: 24,
    maxWidth: 760,
    margin: "0 auto",
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 20% 10%, rgba(255,240,200,0.55), transparent 45%), radial-gradient(circle at 80% 0%, rgba(200,235,255,0.55), transparent 45%), linear-gradient(#fff, #fff)",
  }}
>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>卓球タイマー（APP）</h1>
        <Link href="/" style={{ color: "#555", textDecoration: "underline" }}>
          記録に戻る
        </Link>
      </div>

      {mode !== "setup" ? (
        <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ fontSize: 14, color: "#555" }}>
          セット {setIndex} / {sets}
        </div>

        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{title}</div>

        <div style={{ marginTop: 18, display: "grid", justifyItems: "center" }}>
  <ProgressRing progress={ringProgress} timeText={timeText} subtitle={title} size={300} /></div>

   <div style={{ marginTop: 18, display: "grid", gap: 14, justifyItems: "center" }}>
  {/* Pause（中央） */}
  <button
    style={{
      width: 140,
      height: 72,
      borderRadius: 16,
      border: "1px solid rgba(0,0,0,0.08)",
      background: "#F2D24D",
      fontSize: 30,
      fontWeight: 900,
      boxShadow: "0 14px 28px rgba(0,0,0,0.12)",
      cursor: "pointer",
      touchAction: "manipulation",
    }}
    onClick={running ? pause : start}
    aria-label={running ? "一時停止" : "再開"}
  >
    {running ? "Ⅱ" : "▶"}
  </button>

  {/* 下段：Reset / Next */}
  <div style={{ display: "flex", gap: 18 }}>
    <button
      style={{
        width: 220,
        height: 72,
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "#F2D24D",
        fontSize: 24,
        fontWeight: 900,
        boxShadow: "0 14px 28px rgba(0,0,0,0.12)",
        cursor: "pointer",
        touchAction: "manipulation",
      }}
      onClick={backToSetup}
      aria-label="リセットして設定に戻る"
    >
      ↺ Reset
    </button>

    <button
      style={{
        width: 220,
        height: 72,
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "#F2D24D",
        fontSize: 24,
        fontWeight: 900,
        boxShadow: "0 14px 28px rgba(0,0,0,0.12)",
        cursor: "pointer",
        touchAction: "manipulation",
      }}
      onClick={next}
      aria-label="次へ"
    >
      ▶ Next
    </button>
  </div>
</div>

   </section>
      ) : null}

     {mode === "setup" ? (
       <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
  <h2 style={{ fontSize: 16, fontWeight: 700 }}>設定</h2>
<div style={{ marginTop: 10, fontSize: 64, fontWeight: 700, letterSpacing: 2, textAlign: "center" }}>  {aM}:{String(aS).padStart(2, "0")}</div>
  <div style={{ display: "grid", gap: 28, justifyItems: "center", marginTop: 12 }}>
  <CircleStepper
    label="練習時間"
    minutes={aM}
    seconds={aS}
    onChangeMinutes={setAM}
    onChangeSeconds={setAS}
    minMinutes={0}
    maxMinutes={60}
    showSeconds={true}
    presets={[0, 30]}
  />

  <CircleStepper
    label="インターバル"
    minutes={rM}
    seconds={rS}
    onChangeMinutes={setRM}
    onChangeSeconds={setRS}
    minMinutes={0}
    maxMinutes={30}
    showSeconds={true}
    presets={[0, 30]}
  />

    <div>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>セット数</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
            fontSize: 18,
          }}
          onClick={() => setSets((s) => Math.max(1, Math.floor(s) - 1))}
          aria-label="セット数を1減らす"
        >
          −
        </button>

        <div
          style={{
            minWidth: 92,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#fafafa",
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {sets} セット
        </div>

        <button
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#000",
            color: "#fff",
            cursor: "pointer",
            fontSize: 18,
          }}
          onClick={() => setSets((s) => Math.min(99, Math.floor(s) + 1))}
          aria-label="セット数を1増やす"
        >
          +
        </button>
      </div>
    </div>

    <div style={{ color: "#555", fontSize: 13 }}>
      保存される練習時間（目安）：{totalPracticeMinutes} 分
    </div>

    <div style={{ marginTop: 6 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={separateAB}
          onChange={(e) => {
            const on = e.target.checked;
            setSeparateAB(on);
            if (!on) {
              // 別設定を切ったら、BをAに寄せておく（表示・気分的にも整う）
              setBM(aM);
              setBS(aS);
            }
          }}
        />
        A/Bを別々に設定する（例外）
      </label>
    </div>

    {separateAB ? (
    <CircleStepper
      label="B側（例外）"
      minutes={bM}
      seconds={bS}
      onChangeMinutes={setBM}
      onChangeSeconds={setBS}
      minMinutes={0}
      maxMinutes={60}
      showSeconds={true}
      presets={[0, 30]}
    />
    
  ) : null}
</div>
<button
  onClick={start}
  style={{
    marginTop: 24,
    width: "100%",
    padding: "16px 20px",
    borderRadius: 16,
    border: "none",
    background: "#000",
    color: "#fff",
    fontSize: 18,
    fontWeight: 800,
    cursor: "pointer",
  }}
>
  スタート
</button>

</section>
) : null}

{mode === "finished" ? (
  <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
    <h2 style={{ fontSize: 16, fontWeight: 700 }}>終了：記録へ保存</h2>

    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
      <label>
        メニュー名
        <input
          style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
          value={menuTitle}
          onChange={(e) => setMenuTitle(e.target.value)}
        />
      </label>

      <label>
        メモ（任意）
        <input
          style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
          value={menuNote}
          onChange={(e) => setMenuNote(e.target.value)}
          placeholder="例：フォア連打は安定。次はバックの切替"
        />
      </label>

      <div style={{ color: "#555", fontSize: 13 }}>
        保存される時間（練習のみ）：{totalPracticeMinutes} 分（A+B × セット数）
      </div>

      <button
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #000",
          background: "#000",
          color: "#fff",
          cursor: "pointer",
        }}
        onClick={saveAsPractice}
      >
        記録に保存して戻る
      </button>
    </div>
  </section>
) : null}

    </main>
  );
}
