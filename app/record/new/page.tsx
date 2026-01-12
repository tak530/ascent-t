// app/record/new/page.tsx
export default function RecordNewPage() {
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
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>記録を追加</h1>
      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        ここから記録フロー（フェーズ2以降）を作っていきます。
      </p>
    </main>
  );
}
