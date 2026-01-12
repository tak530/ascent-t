"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type EntryType = "practice" | "match" | "training";
type SegmentTone = "practice" | "rest";

type EntrySegment = {
  label: string;
  minutes: number;
  tone: SegmentTone;
};

const STORAGE_KEY = "ascent.entries.v1";
const PRACTICE_MENU_KEY = "ascent.practice.menus.v1";
const DEFAULT_PRACTICE_MENUS = [
  {
    id: "basic",
    name: "基本打ち",
    minutes: 30,
    note: "",
  },
  {
    id: "serve",
    name: "サーブ練習",
    minutes: 20,
    note: "コース別に各50本\n回転の確認",
  },
  {
    id: "receive",
    name: "レシーブ練習",
    minutes: 25,
    note: "ツッツキ/フリック\n短い台上処理",
  },
  {
    id: "footwork",
    name: "フットワーク",
    minutes: 30,
    note: "2点→3点の動き\n前後の切り替え",
  },
];

export default function AddPage() {
  const router = useRouter();

  const [menus, setMenus] = useState(DEFAULT_PRACTICE_MENUS);
  const [menuId, setMenuId] = useState(DEFAULT_PRACTICE_MENUS[0].id);
  const [date, setDate] = useState("");
  const [type, setType] = useState<EntryType>("practice");
  const [minutes, setMinutes] = useState(DEFAULT_PRACTICE_MENUS[0].minutes);
  const [note, setNote] = useState(DEFAULT_PRACTICE_MENUS[0].note);
  const [rating, setRating] = useState(4);

  // 初期日付を今日にする
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setDate(today);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(PRACTICE_MENU_KEY);
    const list = raw ? JSON.parse(raw) : null;
    if (Array.isArray(list) && list.length > 0) {
      setMenus(list);
      setMenuId(list[0].id);
      setMinutes(list[0].minutes ?? 0);
      setNote(list[0].note ?? "");
    }
  }, []);

  useEffect(() => {
    if (type !== "practice") return;
    const menu = menus.find((item) => item.id === menuId);
    if (!menu) return;
    setMinutes(menu.minutes);
    setNote(menu.note);
  }, [menuId, type, menus]);

  useEffect(() => {
    if (menus.length === 0) return;
    const exists = menus.some((menu) => menu.id === menuId);
    if (!exists) {
      setMenuId(menus[0].id);
      setMinutes(menus[0].minutes);
      setNote(menus[0].note);
    }
  }, [menus, menuId]);

  function handleSubmit() {
    const entryId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const practiceMinutes = Math.max(10, Math.round(minutes * 0.67));
    const restMinutes = Math.max(5, minutes - practiceMinutes);
    const selectedMenu = menus.find((menu) => menu.id === menuId);
    const menuLabel = selectedMenu?.name ?? "フォアバック";
    const segments: EntrySegment[] =
      type === "practice"
        ? [
            { label: menuLabel, minutes: practiceMinutes, tone: "practice" },
            { label: "切り替え", minutes: restMinutes, tone: "rest" },
          ]
        : [{ label: "メイン", minutes, tone: "practice" }];

    const entry = {
      id: entryId,
      date,
      type,
      title:
        type === "practice"
          ? "卓球 練習"
          : type === "match"
          ? "試合"
          : "トレーニング",
      minutes,
      note,
      rating,
      segments,
      createdAt: Date.now(),
    };

    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([entry, ...list])
    );

    router.push("/");
  }

  return (
    <main
      style={{
        padding: 20,
        paddingBottom: 100, // BottomTab対策
        minHeight: "100vh",
        background: "transparent",
        width: "min(100%, 520px)",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        記録を追加
      </h1>

      {/* 日付 */}
      <label>日付</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{ display: "block", marginBottom: 16 }}
      />

      {/* 種類 */}
      <label>種類</label>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as EntryType)}
        style={{ display: "block", marginBottom: 16 }}
      >
        <option value="practice">練習</option>
        <option value="match">試合</option>
        <option value="training">トレーニング</option>
      </select>

      {type === "practice" && (
        <>
          <label>練習メニュー</label>
          {menus.length > 0 ? (
            <select
              value={menuId}
              onChange={(e) => setMenuId(e.target.value)}
              style={{ display: "block", marginBottom: 16 }}
            >
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.name}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ marginBottom: 16, color: "var(--muted)" }}>
              設定画面で練習メニューを追加してください。
            </div>
          )}
        </>
      )}

      {/* 時間 */}
      <label>時間（分）</label>
      <input
        type="number"
        value={minutes}
        onChange={(e) => setMinutes(Number(e.target.value))}
        style={{ display: "block", marginBottom: 16 }}
      />

      {/* メモ */}
      <label>メモ</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          minHeight: 80,
          marginBottom: 20,
        }}
      />

      <label>評価</label>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 20,
        }}
      >
        {Array.from({ length: 5 }).map((_, index) => {
          const starValue = index + 1;
          return (
            <button
              key={starValue}
              type="button"
              onClick={() => setRating(starValue)}
              aria-label={`${starValue}点`}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                color:
                  starValue <= rating
                    ? "var(--brand-orange)"
                    : "rgba(203, 213, 225, 0.9)",
                fontSize: 20,
                lineHeight: 1,
              }}
            >
              ★
            </button>
          );
        })}
      </div>

      <button
        className="cta-button"
        onClick={handleSubmit}
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 999,
          border: "none",
          background: "var(--blue-gradient)",
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          boxShadow: "var(--shadow-pill)",
          letterSpacing: 0.02,
        }}
      >
        追加
      </button>
    </main>
  );
}
