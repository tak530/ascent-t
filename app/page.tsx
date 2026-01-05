"use client";

import { useEffect, useMemo, useState } from "react";
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
const GOAL_KEY = "ascent.weekGoalMin.v1";

function loadWeekGoal(): number {
  if (typeof window === "undefined") return 600;
  const raw = localStorage.getItem(GOAL_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 600;
}

function saveWeekGoal(goal: number) {
  localStorage.setItem(GOAL_KEY, String(goal));
}
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
  if (typeof window === "undefined") return [];
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

function typeLabel(t: EntryType) {
  if (t === "practice") return "練習";
  if (t === "strength") return "筋トレ";
  return "食事";
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);

  const [date, setDate] = useState(""); // ← サーバーとズレないように空スタート
  const [type, setType] = useState<EntryType>("practice");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [note, setNote] = useState("");

  useEffect(() => {
    setMounted(true);
    setEntries(loadEntries());   // ← これが無いと集計が常に空
    setDate(todayStr());         // ← dateもここで決める
  }, []);


   const stats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 今週の月曜
    const day = now.getDay(); // 0 Sun ... 6 Sat
    const diffToMon = (day + 6) % 7;
    const thisMon = new Date(now);
    thisMon.setDate(now.getDate() - diffToMon);

    // 先週の月曜
    const lastMon = new Date(thisMon);
    lastMon.setDate(thisMon.getDate() - 7);

    // 来週の月曜（今週の終端）
    const nextMon = new Date(thisMon);
    nextMon.setDate(thisMon.getDate() + 7);

    const thisWeek = {
      total: 0,
      practice: 0,
      strength: 0,
      meal: 0,
    };

    const lastWeek = {
      total: 0,
    };

    for (const e of entries) {
      const d = new Date(e.date);
      d.setHours(0, 0, 0, 0);

      // 今週
      if (d >= thisMon && d < nextMon) {
        thisWeek.total += e.minutes;
        if (e.type === "practice") thisWeek.practice += e.minutes;
        if (e.type === "strength") thisWeek.strength += e.minutes;
        if (e.type === "meal") thisWeek.meal += e.minutes;
      }

      // 先週
      if (d >= lastMon && d < thisMon) {
        lastWeek.total += e.minutes;
      }
    }

    const diff = thisWeek.total - lastWeek.total;
    return { thisWeek, lastWeek, diff };
  }, [entries]);

  function addEntry() {
    const t = title.trim();
    if (!t) return;

    const m = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;

    const next: Entry = {
      id: uid(),
      date,
      type,
      title: t,
      minutes: m,
      note: note.trim(),
      createdAt: Date.now(),
    };

    const updated = [next, ...entries];
    setEntries(updated);
    saveEntries(updated);

    setTitle("");
    setNote("");
  }

  function removeEntry(id: string) {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
  }

  function clearAll() {
    const ok = window.confirm("全データを削除します。よろしいですか？");
    if (!ok) return;
    setEntries([]);
    saveEntries([]);
  }



return (
  <main className="min-h-dvh bg-zinc-50 pb-24">
    <div className="mx-auto max-w-md px-4 pt-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Ascent.t</h1>
          <p className="mt-1 text-sm text-zinc-600">取り組みを可視化してモチベを維持する</p>
        </div>

        <div className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600">
          MVP
        </div>
      </header>

      <section className="mt-5 grid gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-zinc-500">今週の合計</div>
          <div className="mt-1 flex items-end gap-2">
            <div className="text-3xl font-semibold tabular-nums text-zinc-900">
              {mounted ? stats.thisWeek.total : 0}
            </div>
            <div className="pb-1 text-sm text-zinc-500">分</div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-zinc-100">
            <div
              className="h-2 rounded-full bg-orange-500 transition-all"
              style={{ width: "0%" }}
            />
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            目標まで：— 分
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-900">内訳</div>
            <div className="text-xs text-zinc-500">今週</div>
          </div>

          <div className="mt-3 grid gap-3">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>練習</span>
                <span className="tabular-nums">{mounted ? stats.thisWeek.practice : 0}分</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-zinc-100">
                <div className="h-2 rounded-full bg-orange-500/80 transition-all" style={{ width: "0%" }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>筋トレ</span>
                <span className="tabular-nums">{mounted ? stats.thisWeek.strength : 0}分</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-zinc-100">
                <div className="h-2 rounded-full bg-zinc-400 transition-all" style={{ width: "0%" }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>食事</span>
                <span className="tabular-nums">{mounted ? stats.thisWeek.meal : 0}分</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-zinc-100">
                <div className="h-2 rounded-full bg-zinc-300 transition-all" style={{ width: "0%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">記録を追加</h2>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-zinc-600">日付</span>
            <input
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-zinc-600">種類</span>
            <select
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15"
              value={type}
              onChange={(e) => setType(e.target.value as EntryType)}
            >
              <option value="practice">練習</option>
              <option value="strength">筋トレ</option>
              <option value="meal">食事</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-zinc-600">メニュー名</span>
            <input
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15"
              placeholder="例：3球目攻撃 / ベンチプレス / 糖質控えめ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600">時間（分）</span>
              <input
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15"
                type="number"
                min={0}
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value || "0", 10))}
              />
            </label>

            <button
              className="mt-5 h-11 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:bg-zinc-300"
              onClick={addEntry}
              disabled={!title.trim()}
            >
              追加
            </button>
          </div>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-zinc-600">メモ（任意）</span>
            <input
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15"
              placeholder="例：レシーブが安定。次は回転量を意識"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <button
            className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition active:scale-[0.98]"
            onClick={clearAll}
          >
            全データ削除
          </button>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">記録</h2>
          <a
            className="text-xs font-semibold text-orange-600"
            href="/timer"
          >
            タイマーへ
          </a>
        </div>

        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">まだ記録がありません。</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {entries.map((e) => (
              <div key={e.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-zinc-500">
                      {e.date} / {typeLabel(e.type)} / <span className="tabular-nums">{e.minutes}</span>分
                    </div>
                    <div className="mt-1 text-sm font-semibold text-zinc-900">{e.title}</div>
                    {e.note ? <div className="mt-2 text-sm text-zinc-700">{e.note}</div> : null}
                  </div>

                  <button
                    className="text-xs font-semibold text-zinc-500 transition active:scale-[0.98]"
                    onClick={() => removeEntry(e.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-8 text-xs text-zinc-500">
        <div>保存先：この端末のブラウザ内（localStorage）</div>
        <div>端末を変えると見られません。共有PCだと他人に見られる可能性があります。</div>
      </footer>
    </div>
  </main>
);
;}
function Bar(props: { label: string; value: number; max: number }) {
  const { label, value, max } = props;
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const pct = Math.round(ratio * 100);

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#333" }}>
        <span>{label}</span>
        <span>
          {value}分（{pct}%）
        </span>
      </div>

      <div style={{ height: 10, background: "#eee", borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#000" }} />
      </div>
    </div>
  );
}
