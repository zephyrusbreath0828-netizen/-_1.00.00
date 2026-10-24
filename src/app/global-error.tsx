"use client";

/** ルートレイアウト自体で例外が発生したときの最終フォールバック */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "#f7f3e9",
          color: "#23201c",
          fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
          textAlign: "center",
          padding: 24,
        }}
      >
        <span style={{ fontSize: 40 }}>⛩</span>
        <h1 style={{ fontSize: 20, margin: 0 }}>神旅帳を起動できませんでした</h1>
        <p style={{ color: "#55504a", fontSize: 15, lineHeight: 1.9, margin: 0 }}>
          アプリの読み込み中にエラーが発生しました。
          <br />
          ページを再読み込みしてください。
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: 8,
            padding: "14px 24px",
            border: 0,
            borderRadius: 12,
            background: "#b23a30",
            color: "#fffdf8",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          再読み込みする
        </button>
        {error.digest && <p style={{ fontSize: 11, color: "#8a8377" }}>エラーID: {error.digest}</p>}
      </body>
    </html>
  );
}
