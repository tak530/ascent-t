"use client";

import { useEffect, useMemo, useState, use } from "react";
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

export default function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [entry, setEntry] = useState<Entry | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as Entry[]) : [];
    const found = list.find((item) => item.id === id) ?? null;
    setEntry(found);
  }, [id]);

  const totalMinutes = useMemo(() => {
    if (!entry?.segments || entry.segments.length === 0) return entry?.minutes;
    return entry.segments.reduce((sum, segment) => sum + segment.minutes, 0);
  }, [entry]);

  if (!entry) {
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
        <Link
          href="/record"
          style={{
            textDecoration: "none",
            color: "var(--brand-blue)",
            fontWeight: 700,
          }}
        >
          ← 記録確認へ戻る
        </Link>
        <div style={{ marginTop: 20, color: "var(--muted)" }}>
          記録が見つかりませんでした。
        </div>
      </main>
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
      <Link
        href="/record"
        style={{
          textDecoration: "none",
          color: "var(--brand-blue)",
          fontWeight: 700,
        }}
      >
        ← 記録確認へ戻る
      </Link>

      <div
        style={{
          marginTop: 16,
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: 16,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <div style={{ color: "var(--muted)", fontSize: 14 }}>
          {entry.date} / {entry.minutes}分
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
          {entry.title}
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>評価</div>
          <div style={{ marginTop: 4, fontSize: 16 }}>
            {entry.rating?.toFixed(1) ?? "4.2"} / 5
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>メニュー</div>
          {entry.segments && entry.segments.length > 0 ? (
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {entry.segments.map((segment) => (
                <div
                  key={`${segment.label}-${segment.minutes}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background:
                      segment.tone === "practice"
                        ? "var(--card-orange)"
                        : "var(--card-blue)",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{segment.label}</span>
                  <span style={{ fontWeight: 700 }}>{segment.minutes}分</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>{entry.minutes}分</div>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>合計</div>
          <div style={{ marginTop: 4 }}>{totalMinutes ?? entry.minutes}分</div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>反省・気づき</div>
          <div
            style={{
              marginTop: 6,
              whiteSpace: "pre-wrap",
            }}
          >
            {entry.note || "次回に向けてメモを残しておこう。"}
          </div>
        </div>
      </div>
    </main>
  );
}
