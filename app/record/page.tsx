"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Entry = {
  id: string;
  date: string;
  type: "practice" | "match" | "training";
  title: string;
  minutes: number;
  note: string;
  rating?: number;
  segments?: {
    label: string;
    minutes: number;
    tone: "practice" | "rest";
  }[];
  createdAt: number;
};

const STORAGE_KEY = "ascent.entries.v1";

export default function RecordPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [period, setPeriod] = useState("thisMonth");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as Entry[]) : [];
    setEntries(list);
  }, []);

  const today = new Date();
  const startOfWeek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 6
  );

  const weeklyEntries = entries.filter((entry) => {
    const entryDate = new Date(`${entry.date}T00:00:00`);
    return entryDate >= startOfWeek;
  });

  const weeklyTotalMinutes = weeklyEntries.reduce(
    (sum, entry) => sum + entry.minutes,
    0
  );
  const weeklyAverageRating =
    weeklyEntries.reduce(
      (sum, entry) => sum + (entry.rating ?? 4.2),
      0
    ) / (weeklyEntries.length || 1);

  const minRating =
    ratingFilter === "all" ? 0 : Number(ratingFilter);

  const filteredEntries = entries.filter((entry) => {
    const entryDate = new Date(`${entry.date}T00:00:00`);
    if (period === "thisWeek") {
      if (entryDate < startOfWeek) return false;
    }
    if (period === "thisMonth") {
      if (
        entryDate.getFullYear() !== today.getFullYear() ||
        entryDate.getMonth() !== today.getMonth()
      ) {
        return false;
      }
    }
    if ((entry.rating ?? 4.2) < minRating) return false;
    return true;
  });

  function formatMinutes(totalMinutes: number) {
    if (totalMinutes <= 0) return "0分";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}分`;
    if (minutes === 0) return `${hours}時間`;
    return `${hours}時間${minutes}分`;
  }

  function getSegments(entry: Entry) {
    if (entry.segments && entry.segments.length > 0) {
      return entry.segments;
    }
    if (entry.type !== "practice") {
      return [{ label: "メイン", minutes: entry.minutes, tone: "practice" }];
    }
    const practiceMinutes = Math.max(
      10,
      Math.round(entry.minutes * 0.67)
    );
    const restMinutes = Math.max(5, entry.minutes - practiceMinutes);
    return [
      { label: "フォアバック", minutes: practiceMinutes, tone: "practice" },
      { label: "切り替え", minutes: restMinutes, tone: "rest" },
    ];
  }

  function handleRatingChange(entryId: string, value: number) {
    setEntries((prev) => {
      const next = prev.map((entry) =>
        entry.id === entryId ? { ...entry, rating: value } : entry
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function handleDelete(entryId: string) {
    if (!window.confirm("削除します。よろしいですか？")) return;
    setDeletingIds((prev) => new Set(prev).add(entryId));
    window.setTimeout(() => {
      setEntries((prev) => {
        const next = prev.filter((entry) => entry.id !== entryId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }, 320);
  }

  function StarRating({
    value,
    onChange,
    labelId,
  }: {
    value: number;
    onChange: (next: number) => void;
    labelId: string;
  }) {
    const stars = Math.floor(value);
    return (
      <div style={{ display: "flex", gap: 4 }} aria-labelledby={labelId}>
        {Array.from({ length: 5 }).map((_, index) => {
          const starValue = index + 1;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onChange(starValue)}
              aria-label={`${starValue}点`}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                color:
                  index < stars
                    ? "var(--brand-orange)"
                    : "rgba(203, 213, 225, 0.9)",
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ★
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <main
      style={{
        padding: 20,
        paddingBottom: 100,
        minHeight: "100vh",
        width: "min(100%, 520px)",
        margin: "0 auto",
      }}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
          記録確認
        </h1>

        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: 16,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
            今週の積み上げ
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 10,
                  background: "var(--brand-orange-soft)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                ⏱
              </span>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  合計時間
                </div>
                <div style={{ fontWeight: 700 }}>
                  {formatMinutes(weeklyTotalMinutes)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 10,
                  background: "var(--card-blue)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                ≡
              </span>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  練習回数
                </div>
                <div style={{ fontWeight: 700 }}>
                  {weeklyEntries.length}回
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 10,
                  background: "var(--brand-blue-soft)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                ▮▮
              </span>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  平均評価
                </div>
                <div style={{ fontWeight: 700 }}>
                  {weeklyEntries.length === 0
                    ? "0.0/5"
                    : `${weeklyAverageRating.toFixed(1)}/5`}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 600,
              margin: 0,
            }}
          >
            期間:
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              style={{ padding: "8px 12px", borderRadius: 12, width: "auto" }}
            >
              <option value="thisWeek">今週</option>
              <option value="thisMonth">今月</option>
              <option value="all">全期間</option>
            </select>
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 600,
              margin: 0,
            }}
          >
            評価:
            <select
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value)}
              style={{ padding: "8px 12px", borderRadius: 12, width: "auto" }}
            >
              <option value="all">全て</option>
              <option value="4">4以上</option>
              <option value="3">3以上</option>
            </select>
          </label>
        </div>

        {filteredEntries.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>記録がありません。</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filteredEntries.map((entry) => {
              const segments = getSegments(entry);
              const totalMinutes = segments.reduce(
                (sum, segment) => sum + segment.minutes,
                0
              );
              const titleId = `record-title-${entry.id}`;
              return (
            <div
              key={entry.id}
              className={`tap-card record-card ${
                deletingIds.has(entry.id) ? "record-card--deleting" : ""
              }`}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 14,
                background: "var(--surface)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 14, color: "var(--muted)" }}>
                  {entry.date} / {entry.minutes}分
                </div>
                <StarRating
                  value={entry.rating ?? 4.2}
                  onChange={(next) => handleRatingChange(entry.id, next)}
                  labelId={titleId}
                />
              </div>
              <div
                id={titleId}
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                {entry.title}
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                  メニュー
                </div>
                <div
                  style={{
                    display: "flex",
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    background: "var(--card-blue)",
                  }}
                >
                  {segments.map((segment, index) => {
                    const toneGradient =
                      segment.tone === "practice"
                        ? "var(--orange-gradient)"
                        : "var(--blue-gradient)";
                    return (
                      <div
                        key={`${segment.label}-${index}`}
                        style={{
                          flexGrow: segment.minutes,
                          flexBasis: 0,
                          background: toneGradient,
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "8px 6px",
                          borderRight:
                            index === segments.length - 1
                              ? "none"
                              : "1px solid rgba(255,255,255,0.35)",
                          textAlign: "center",
                          minWidth: 0,
                        }}
                      >
                        {segment.label} {segment.minutes}分
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "var(--muted)",
                  }}
                >
                  合計 {formatMinutes(totalMinutes)}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                  反省・気づき
                </div>
                <div style={{ whiteSpace: "pre-wrap", color: "var(--text)" }}>
                  {entry.note || "次回に向けてメモを残しておこう。"}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  className="cta-button"
                  style={{
                    borderRadius: 999,
                    border: "1px solid #dc2626",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "6px 12px",
                    boxShadow: "0 8px 14px rgba(239, 68, 68, 0.28)",
                  }}
                  aria-label="記録を削除"
                >
                  削除
                </button>
                <Link
                  href={`/record/${entry.id}`}
                  style={{
                    textDecoration: "none",
                    color: "var(--brand-blue)",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  詳細を見る
                  <span style={{ fontSize: 16 }}>›</span>
                </Link>
              </div>
            </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
